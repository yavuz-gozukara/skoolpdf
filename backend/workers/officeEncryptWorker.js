const { execFile } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'encrypt_office.py');

function encryptOffice(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        // execFile passes args directly — no shell, no injection risk
        execFile('python3', [SCRIPT, inputPath, outputPath, password], { timeout: 30000 }, (error, _stdout, stderr) => {
            if (error) {
                if (
                    error.code === 127 ||
                    (stderr && stderr.includes('No module named'))
                ) {
                    return reject(new Error('TOOL_MISSING:msoffcrypto'));
                }
                return reject(new Error(stderr || error.message));
            }
            resolve(outputPath);
        });
    });
}

module.exports = { encryptOffice };
