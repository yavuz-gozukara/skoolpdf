const { execFile } = require('child_process');

const ALLOWED_LANG_PARTS = new Set(['eng', 'tur', 'deu', 'fra', 'spa', 'por', 'ita', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor', 'ara']);

// Extend PATH so execFile can find pip-installed binaries in Docker
const ENV = {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
};

function processOcrFile(inputPath, outputPath, language = 'tur+eng') {
    // Allow combined langs like "tur+eng" — validate each part
    const parts = language.split('+');
    const lang  = parts.every(p => ALLOWED_LANG_PARTS.has(p)) ? language : 'tur+eng';

    const args = [
        '--force-ocr',
        '--deskew',
        '--rotate-pages',
        '--clean',
        '--optimize', '0',
        '--output-type', 'pdf',
        '--jobs', '2',
        '-l', lang,
        inputPath,
        outputPath,
    ];

    return new Promise((resolve, reject) => {
        execFile('ocrmypdf', args, { timeout: 600_000, env: ENV }, (error, _stdout, stderr) => {
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
