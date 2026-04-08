const { execFile } = require('child_process');

// Extend PATH so execFile can find pip-installed binaries in Docker
const ENV = {
    ...process.env,
    PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}`,
};

function processOcrFile(inputPath, outputPath) {
    const args = [
        '--redo-ocr',         // Re-OCR pages that have an existing (often bad) OCR layer; skip native-text pages
        '--rotate-pages',     // Auto-correct grossly rotated pages (90°, 180°, etc.)
        '--optimize', '1',    // Lossless PDF optimization — reduces size without touching image quality
        '--output-type', 'pdf',
        '--jobs', '1',        // Keep memory footprint low
        '-l', 'tur+eng',      // Turkish + English (covers all expected documents)
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
