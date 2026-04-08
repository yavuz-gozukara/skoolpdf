const { exec } = require('child_process');
const path = require('path');

function convertToPdf(inputPath, outputDir) {
    return new Promise((resolve, reject) => {
        const absInput = path.resolve(inputPath);
        const absOutDir = path.resolve(outputDir);
        
        const binary = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
        const cmd = `"${binary}" --headless --convert-to pdf --outdir "${absOutDir}" "${absInput}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                exec(`soffice --headless --convert-to pdf --outdir "${absOutDir}" "${absInput}"`, (err2) => {
                     if(err2) return reject(err2);
                     const baseName = path.basename(inputPath, path.extname(inputPath));
                     const outPath = path.join(absOutDir, `${baseName}.pdf`);
                     resolve(outPath);
                });
                return;
            }
            const baseName = path.basename(inputPath, path.extname(inputPath));
            const outPath = path.join(absOutDir, `${baseName}.pdf`);
            resolve(outPath);
        });
    });
}

module.exports = { convertToPdf };
