const { execFile } = require('child_process');
const path = require('path');
const fs   = require('fs');

function convertToDocx(inputPath, outputPath) {
    const absInput  = path.resolve(inputPath);
    const absOutput = path.resolve(outputPath);

    // Dev: use local venv if present; Production (Docker): use system pdf2docx
    const venvBin = path.join(__dirname, '..', 'venv', 'bin', 'pdf2docx');
    const bin     = fs.existsSync(venvBin) ? venvBin : 'pdf2docx';

    return new Promise((resolve, reject) => {
        execFile(bin, ['convert', absInput, absOutput], (error, _stdout, stderr) => {
            if (error) {
                console.error('pdf2docx error:', error.message);
                if (
                    error.code === 127 ||
                    (stderr && stderr.includes('command not found')) ||
                    (error.message && error.message.includes('not found'))
                ) {
                    return reject(new Error('TOOL_MISSING:pdf2docx'));
                }
                return reject(error);
            }
            resolve(absOutput);
        });
    });
}

module.exports = { convertToDocx };
