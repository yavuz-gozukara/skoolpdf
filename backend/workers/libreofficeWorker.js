const { execFile } = require('child_process');
const path = require('path');

function convertToPdf(inputPath, outputDir) {
    const absInput  = path.resolve(inputPath);
    const absOutDir = path.resolve(outputDir);
    const baseName  = path.basename(inputPath, path.extname(inputPath));
    const outPath   = path.join(absOutDir, `${baseName}.pdf`);

    const args = ['--headless', '--convert-to', 'pdf', '--outdir', absOutDir, absInput];

    return new Promise((resolve, reject) => {
        // Try macOS app path first, fall back to system soffice
        const macBin = '/Applications/LibreOffice.app/Contents/MacOS/soffice';

        execFile(macBin, args, (error) => {
            if (!error) return resolve(outPath);

            execFile('soffice', args, (err2) => {
                if (err2) return reject(err2);
                resolve(outPath);
            });
        });
    });
}

module.exports = { convertToPdf };
