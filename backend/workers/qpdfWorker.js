const { execFile } = require('child_process');

function unlockPdf(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        // execFile passes args as array — no shell, no injection risk
        execFile('qpdf', [`--password=${password}`, '--decrypt', inputPath, outputPath], (error, _stdout, stderr) => {
            if (error) {
                if (error.code === 127 || (stderr && stderr.includes('command not found')) || (error.message && error.message.includes('not found'))) {
                    return reject(new Error('TOOL_MISSING:qpdf'));
                }
                if (stderr && (stderr.includes('invalid password') || stderr.includes('password incorrect'))) {
                    return reject(new Error('WRONG_PASSWORD'));
                }
                return reject(error);
            }
            resolve(outputPath);
        });
    });
}

function protectPdf(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        execFile('qpdf', ['--encrypt', password, password, '256', '--', inputPath, outputPath], (error, _stdout, stderr) => {
            if (error) {
                if (error.code === 127 || (error.message && error.message.includes('not found'))) {
                    return reject(new Error('TOOL_MISSING:qpdf'));
                }
                return reject(error);
            }
            resolve(outputPath);
        });
    });
}

module.exports = { unlockPdf, protectPdf };
