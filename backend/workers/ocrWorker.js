const { execFile } = require('child_process');

const ALLOWED_LANGS = new Set(['eng', 'tur', 'deu', 'fra', 'spa', 'por', 'ita', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor', 'ara']);

function processOcrFile(inputPath, outputPath, language = 'eng') {
    // Whitelist language codes to prevent injection via the -l flag
    const lang = ALLOWED_LANGS.has(language) ? language : 'eng';

    const args = [
        '--skip-text',
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
        execFile('ocrmypdf', args, { timeout: 600_000 }, (error, _stdout, stderr) => {
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
