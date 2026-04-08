const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { mergePdfs, splitPdf, addWatermark } = require('../utils/pdfProcessor');
const { compressPdf, convertToImages } = require('../workers/ghostscriptWorker');
const { convertToPdf } = require('../workers/libreofficeWorker');
const { unlockPdf, protectPdf } = require('../workers/qpdfWorker');
const { convertToDocx } = require('../workers/pythonWorker');
const { processOcrFile } = require('../workers/ocrWorker');
const { encryptOffice } = require('../workers/officeEncryptWorker');

// ─── In-memory job store for async OCR ────────────────────────────────────────
const jobs = new Map(); // jobId -> { status, progress, outputPath, inputPath, createdAt, error }

// Clean up jobs older than 1 hour to prevent memory/disk leaks
setInterval(() => {
    const now = Date.now();
    for (const [id, job] of jobs.entries()) {
        if (now - job.createdAt > 3_600_000) {
            if (job.outputPath && fs.existsSync(job.outputPath)) fs.unlinkSync(job.outputPath);
            jobs.delete(id);
        }
    }
}, 600_000);

// ─── Shared helpers ────────────────────────────────────────────────────────────
const handleDownloadAndCleanup = (res, outputPath, inputPaths) => {
    const filename = path.basename(outputPath);
    res.download(outputPath, filename, (err) => {
        const cleanup = (fp) => { if (fp && fs.existsSync(fp)) fs.unlinkSync(fp); };
        if (Array.isArray(inputPaths)) inputPaths.forEach(cleanup);
        else cleanup(inputPaths);
        cleanup(outputPath);
    });
};

const toolInstallHints = {
    'gs':        'brew install ghostscript',
    'qpdf':      'brew install qpdf',
    'ocrmypdf':  'brew install ocrmypdf',
    'soffice':   'https://www.libreoffice.org/download/download/',
};

const handleError = (res, e, fallbackMsg = 'Processing failed') => {
    if (e.message && e.message.startsWith('TOOL_MISSING:')) {
        const tool = e.message.split(':')[1];
        return res.status(503).json({
            error: 'TOOL_MISSING',
            tool,
            hint: toolInstallHints[tool] || `Install ${tool}`,
        });
    }
    if (e.message === 'WRONG_PASSWORD') {
        return res.status(401).json({ error: 'WRONG_PASSWORD' });
    }
    console.error(fallbackMsg, e);
    res.status(500).json({ error: fallbackMsg });
};

// ─── Controllers ───────────────────────────────────────────────────────────────
const processMerge = async (req, res) => {
    try {
        if (!req.files || req.files.length < 1) return res.status(400).json({ error: 'Files missing' });
        const filePaths = req.files.map(file => file.path);
        const rangesStr = req.body.ranges;
        const ranges = rangesStr ? rangesStr.split('|') : [];
        const outputPath = path.join(__dirname, '..', 'uploads', `merged-${Date.now()}.pdf`);
        await mergePdfs(filePaths, outputPath, ranges);
        handleDownloadAndCleanup(res, outputPath, filePaths);
    } catch (e) { handleError(res, e, 'Merge failed'); }
};

const processSplit = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const outputPath = path.join(__dirname, '..', 'uploads', `split-${Date.now()}.pdf`);
        await splitPdf(req.file.path, outputPath, req.body.ranges);
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Split failed'); }
};

const processCompress = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const outputPath = path.join(__dirname, '..', 'uploads', `compressed-${Date.now()}.pdf`);
        await compressPdf(req.file.path, outputPath, req.body.level || 'ebook');
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Compression failed'); }
};

// ─── OCR: Async job-based (POST → jobId, GET status, GET download) ─────────────
const processOcr = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const language = req.body.language || 'eng+tur';
        const jobId = `ocr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const intermediatePath = path.join(__dirname, '..', 'uploads', `ocr-raw-${jobId}.pdf`);
        const finalPath = path.join(__dirname, '..', 'uploads', `ocr-final-${jobId}.pdf`);

        jobs.set(jobId, {
            status: 'processing',
            progress: 5,
            outputPath: finalPath,
            inputPath: req.file.path,
            createdAt: Date.now(),
        });

        // Return jobId immediately so frontend can start polling
        res.json({ jobId });

        // Run OCR + compression in background (fire-and-forget)
        ;(async () => {
            const setProgress = (p) => {
                const job = jobs.get(jobId);
                if (job) jobs.set(jobId, { ...job, progress: p });
            };
            try {
                setProgress(15);
                console.log(`[skoolPDF] OCR Job ${jobId}: Starting OCR...`);
                await processOcrFile(req.file.path, intermediatePath, language);

                setProgress(70);
                console.log(`[skoolPDF] OCR Job ${jobId}: Applying compression...`);
                await compressPdf(intermediatePath, finalPath, 'ebook');

                if (fs.existsSync(intermediatePath)) fs.unlinkSync(intermediatePath);

                setProgress(100);
                const job = jobs.get(jobId);
                if (job) jobs.set(jobId, { ...job, status: 'done', progress: 100 });
                console.log(`[skoolPDF] OCR Job ${jobId}: Complete.`);
            } catch (e) {
                if (fs.existsSync(intermediatePath)) fs.unlinkSync(intermediatePath);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                const job = jobs.get(jobId);
                if (job) {
                    if (e.message && e.message.startsWith('TOOL_MISSING:')) {
                        jobs.set(jobId, { ...job, status: 'error', error: 'TOOL_MISSING', tool: e.message.split(':')[1] });
                    } else {
                        jobs.set(jobId, { ...job, status: 'error', error: 'OCR processing failed' });
                    }
                }
                console.error(`[skoolPDF] OCR Job ${jobId} failed:`, e.message);
            }
        })();
    } catch (e) {
        handleError(res, e, 'Failed to start OCR job');
    }
};

const getOcrStatus = (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const { status, progress, error, tool } = job;
    res.json({ status, progress, error, tool });
};

const downloadOcrResult = (req, res) => {
    const job = jobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'done') return res.status(409).json({ error: 'Job not ready', status: job.status });

    const { outputPath, inputPath } = job;
    jobs.delete(req.params.jobId); // Remove before download to prevent double-download
    handleDownloadAndCleanup(res, outputPath, inputPath);
};

// ─── Other controllers ─────────────────────────────────────────────────────────
const processWatermark = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const outputPath = path.join(__dirname, '..', 'uploads', `watermarked-${Date.now()}.pdf`);
        const fontSize = Math.min(Math.max(parseInt(req.body.fontSize) || 60, 20), 120);
        const opacity  = Math.min(Math.max(parseFloat(req.body.opacity) || 0.5, 0.1), 1.0);
        const position = ['diagonal','center','top','bottom'].includes(req.body.position) ? req.body.position : 'diagonal';
        await addWatermark(req.file.path, outputPath, req.body.text || 'CONFIDENTIAL', { fontSize, opacity, position });
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Watermark failed'); }
};

const OFFICE_MIMES = new Set([
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

const processProtect = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        if (!req.body.password) return res.status(400).json({ error: 'Password required' });

        const { mimetype, path: inputPath, originalname } = req.file;
        const ext = path.extname(originalname).toLowerCase();

        if (mimetype === 'application/pdf') {
            // PDF → qpdf AES-256
            const outputPath = path.join(__dirname, '..', 'uploads', `protected-${Date.now()}.pdf`);
            await protectPdf(inputPath, outputPath, req.body.password);
            handleDownloadAndCleanup(res, outputPath, inputPath);

        } else if (OFFICE_MIMES.has(mimetype)) {
            // Office → msoffcrypto-tool (native ECMA-376 encryption)
            const outputPath = path.join(__dirname, '..', 'uploads', `protected-${Date.now()}${ext}`);
            await encryptOffice(inputPath, outputPath, req.body.password);
            handleDownloadAndCleanup(res, outputPath, inputPath);

        } else {
            fs.unlinkSync(inputPath);
            return res.status(415).json({ error: 'Unsupported file type for encryption. Only PDF and Office files are supported.' });
        }
    } catch (e) { handleError(res, e, 'Encryption failed'); }
};

const processToImages = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const dpi = Math.min(Math.max(parseInt(req.body.dpi) || 150, 72), 300);
        const uploadsDir = path.join(__dirname, '..', 'uploads');

        const imageFiles = await convertToImages(req.file.path, uploadsDir, dpi);

        // Single page PDF → return the PNG directly
        if (imageFiles.length === 1) {
            return handleDownloadAndCleanup(res, imageFiles[0], req.file.path);
        }

        // Multi-page → zip all images and return the archive
        const zipPath = path.join(uploadsDir, `images-${Date.now()}.zip`);
        const quoted = imageFiles.map(f => `"${f}"`).join(' ');

        await new Promise((resolve, reject) => {
            exec(`zip -j "${zipPath}" ${quoted}`, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });

        imageFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
        handleDownloadAndCleanup(res, zipPath, req.file.path);
    } catch (e) { handleError(res, e, 'PDF to images conversion failed'); }
};

const processConvertToPdf = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        if (req.file.mimetype === 'image/jpeg' || req.file.mimetype === 'image/png') {
            const outputPath = path.join(__dirname, '..', 'uploads', `converted-${Date.now()}.pdf`);
            await mergePdfs([req.file.path], outputPath);
            return handleDownloadAndCleanup(res, outputPath, req.file.path);
        }
        const outputDir = path.join(__dirname, '..', 'uploads');
        const outputPath = await convertToPdf(req.file.path, outputDir);
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Conversion failed'); }
};

const processConvertToWord = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        const outputPath = path.join(__dirname, '..', 'uploads', `converted-${Date.now()}.docx`);
        await convertToDocx(req.file.path, outputPath);
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Word conversion failed'); }
};

const processUnlock = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'File missing' });
        if (!req.body.password) return res.status(400).json({ error: 'Password required' });
        const outputPath = path.join(__dirname, '..', 'uploads', `unlocked-${Date.now()}.pdf`);
        await unlockPdf(req.file.path, outputPath, req.body.password);
        handleDownloadAndCleanup(res, outputPath, req.file.path);
    } catch (e) { handleError(res, e, 'Unlock failed'); }
};

module.exports = {
    processMerge, processSplit, processCompress,
    processOcr, getOcrStatus, downloadOcrResult,
    processWatermark, processProtect, processToImages,
    processConvertToPdf, processConvertToWord, processUnlock
};
