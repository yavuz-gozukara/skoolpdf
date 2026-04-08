const { exec } = require('child_process');

/**
 * Perform OCR on a PDF using ocrmypdf.
 *
 * Key flags explained:
 *  --skip-text      : Skip pages that already have a text layer (prevents file-size
 *                     explosion on digital PDFs and avoids double-OCR).
 *  --deskew         : Straighten tilted / skewed scanned pages before OCR.
 *  --rotate-pages   : Auto-detect and correct portrait/landscape orientation.
 *  --clean          : Cleans the image before feeding it to Tesseract (removes
 *                     scanner noise) but outputs the ORIGINAL image — so visual
 *                     quality is preserved.
 *  --optimize 0     : Skip ocrmypdf's own lossless optimisation pass.  We pipe
 *                     the result through Ghostscript afterward for better control.
 *  --output-type pdf: Plain PDF output (not PDF/A) — keeps compatibility wide.
 *  --jobs 2         : Use up to 2 CPU threads for faster multi-page processing.
 */
function processOcrFile(inputPath, outputPath, language = 'eng') {
    return new Promise((resolve, reject) => {
        const cmd = [
            'ocrmypdf',
            '--skip-text',
            '--deskew',
            '--rotate-pages',
            '--clean',
            '--optimize 0',
            '--output-type pdf',
            '--jobs 2',
            `-l ${language}`,
            `"${inputPath}"`,
            `"${outputPath}"`,
        ].join(' ');

        console.log('[skoolPDF] Executing OCR command...');

        // Allow up to 10 minutes for large / many-page PDFs
        exec(cmd, { timeout: 600_000 }, (error, _stdout, stderr) => {
            if (error) {
                console.error('OCR Error:', error.message);
                if (
                    error.code === 127 ||
                    (stderr && stderr.includes('command not found')) ||
                    (error.message && error.message.includes('not found'))
                ) {
                    return reject(new Error('TOOL_MISSING:ocrmypdf'));
                }
                return reject(error);
            }
            resolve(outputPath);
        });
    });
}

module.exports = { processOcrFile };
