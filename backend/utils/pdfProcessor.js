const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs');

async function mergePdfs(filePaths, outputPath, ranges = []) {
    const mergedPdf = await PDFDocument.create();
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const rangeStr = ranges[i] || 'all';
        const fileContent = fs.readFileSync(filePath);
        // support images natively for 'img to pdf' inside merge
        if (filePath.toLowerCase().endsWith('.jpg') || filePath.toLowerCase().endsWith('.jpeg')) {
            const image = await mergedPdf.embedJpg(fileContent);
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        } else if (filePath.toLowerCase().endsWith('.png')) {
            const image = await mergedPdf.embedPng(fileContent);
            const page = mergedPdf.addPage([image.width, image.height]);
            page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        } else {
            const pdfDoc = await PDFDocument.load(fileContent);
            let pageIndices = pdfDoc.getPageIndices();
            if (rangeStr !== 'all') {
                pageIndices = rangeStr.split(',').map(n => parseInt(n) - 1).filter(n => n >= 0 && n < pdfDoc.getPageCount());
            }
            if (pageIndices.length > 0) {
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }
        }
    }
    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedPdfBytes);
    return outputPath;
}

function parsePageRanges(rangeStr, totalPages) {
    if (!rangeStr) return Array.from({ length: totalPages }, (_, i) => i);
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(Number);
            if (start && end && start <= end) {
                for (let i = Math.max(1, start); i <= Math.min(end, totalPages); i++) {
                    pages.add(i - 1);
                }
            }
        } else {
            const p = Number(trimmed);
            if (p && p <= totalPages && p >= 1) pages.add(p - 1);
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

async function splitPdf(inputPath, outputPath, rangesStr) {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const pageIndices = parsePageRanges(rangesStr, totalPages);
    if (pageIndices.length === 0) throw new Error("Invalid page ranges");

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach(p => newPdf.addPage(p));

    const newPdfBytes = await newPdf.save();
    fs.writeFileSync(outputPath, newPdfBytes);
    return outputPath;
}

function parsePageRangesForWatermark(str, totalPages) {
    const indices = new Set();
    str.split(',').forEach(part => {
        const m = part.trim().match(/^(\d+)(?:[–\-](\d+))?$/);
        if (!m) return;
        const from = parseInt(m[1]);
        const to   = m[2] ? parseInt(m[2]) : from;
        for (let p = Math.max(1, from); p <= Math.min(totalPages, to); p++) indices.add(p - 1); // 0-indexed
    });
    return indices;
}

async function addWatermark(inputPath, outputPath, text, options = {}) {
    const {
        fontSize  = 60,
        opacity   = 0.5,
        position  = 'diagonal', // 'diagonal' | 'center' | 'top' | 'bottom'
        color     = [0.8, 0.8, 0.8],
        pagesStr  = '',          // e.g. "1, 3-5, 8" — empty means all pages
    } = options;

    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    const targetIndices = pagesStr.trim()
        ? parsePageRangesForWatermark(pagesStr, pages.length)
        : null; // null = all pages

    for (let i = 0; i < pages.length; i++) {
        if (targetIndices && !targetIndices.has(i)) continue;
        const page = pages[i];
        const { width, height } = page.getSize();

        // Estimate text width to center it
        const approxCharWidth = fontSize * 0.5;
        const textWidth = text.length * approxCharWidth;

        let x, y, rotate;
        switch (position) {
            case 'center':
                x = (width - textWidth) / 2;
                y = height / 2;
                rotate = degrees(0);
                break;
            case 'top':
                x = (width - textWidth) / 2;
                y = height - fontSize - 20;
                rotate = degrees(0);
                break;
            case 'bottom':
                x = (width - textWidth) / 2;
                y = 20;
                rotate = degrees(0);
                break;
            default: // diagonal
                x = width / 4;
                y = height / 2;
                rotate = degrees(45);
        }

        page.drawText(text, {
            x,
            y,
            size: fontSize,
            color: rgb(...color),
            opacity,
            rotate,
        });
    }

    const newBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, newBytes);
    return outputPath;
}

async function protectPdf(inputPath, outputPath, password) {
    const pdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    const newBytes = await pdfDoc.save({
        useObjectStreams: false,
        userPassword: password,
        ownerPassword: password,
        permissions: {
            printing: 'highResolution',
            modifying: false,
            copying: false,
        }
    });

    fs.writeFileSync(outputPath, newBytes);
    return outputPath;
}

module.exports = {
    mergePdfs,
    splitPdf,
    addWatermark,
    protectPdf
};
