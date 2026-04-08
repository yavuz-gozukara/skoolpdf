const { exec } = require('child_process');
const fs = require('fs');

/**
 * Compresses a PDF file using Ghostscript with aggressive downsampling.
 * Ensures the output is NEVER larger than the input.
 */
function compressPdf(inputPath, outputPath, level = 'ebook') {
    return new Promise((resolve, reject) => {
        let dpi = 150;
        if (level === 'screen') dpi = 72;
        if (level === 'printer') dpi = 300;

        // Nuclear downsampling to crush the PDF
        const cmd = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/${level} -dNOPAUSE -dQUIET -dBATCH \
        -dDetectDuplicateImages=true \
        -dAutoFilterColorImages=false -dColorImageFilter=/DCTEncode \
        -dAutoFilterGrayImages=false -dGrayImageFilter=/DCTEncode \
        -dDownsampleColorImages=true -dColorImageDownsampleType=/Bicubic -dColorImageResolution=${dpi} -dColorImageDownsampleThreshold=1.0 \
        -dDownsampleGrayImages=true -dGrayImageDownsampleType=/Bicubic -dGrayImageResolution=${dpi} -dGrayImageDownsampleThreshold=1.0 \
        -dDownsampleMonoImages=true -dMonoImageDownsampleType=/Bicubic -dMonoImageResolution=${dpi} -dMonoImageDownsampleThreshold=1.0 \
        -sOutputFile="${outputPath}" "${inputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("Ghostscript error:", error);
                if (error.code === 127 || (stderr && stderr.includes('command not found')) || (error.message && error.message.includes('not found'))) {
                    return reject(new Error('TOOL_MISSING:gs'));
                }
                return reject(error);
            }
            
            // Post-compression size check (Production Grade Quality Control)
            const inputSize = fs.statSync(inputPath).size;
            const outputSize = fs.statSync(outputPath).size;
            
            if (outputSize >= inputSize) {
                console.log(`[skoolPDF] Compression blocked inflation: Input size -> Output size. Reverting. `);
                fs.copyFileSync(inputPath, outputPath);
            } else {
                const saved = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
                console.log(`[skoolPDF] Successfully compressed saving ${saved}%.`);
            }
            
            resolve(outputPath);
        });
    });
}

/**
 * Converts each page of a PDF to a PNG image using Ghostscript.
 * Returns an array of absolute file paths for the generated images.
 *
 * @param {string} inputPath   - Path to the source PDF
 * @param {string} outputDir   - Directory where images will be written
 * @param {number} dpi         - Resolution (72 = screen, 150 = default, 300 = print)
 * @returns {Promise<string[]>} - Sorted list of generated image paths
 */
function convertToImages(inputPath, outputDir, dpi = 150) {
    return new Promise((resolve, reject) => {
        const prefix = `pages_${Date.now()}`;
        const outputPattern = `${outputDir}/${prefix}_%04d.png`;

        const cmd = [
            'gs',
            '-dBATCH -dNOPAUSE -dSAFER',
            '-sDEVICE=png16m',
            `-r${dpi}`,
            '-dTextAlphaBits=4',
            '-dGraphicsAlphaBits=4',
            `-sOutputFile="${outputPattern}"`,
            `"${inputPath}"`,
        ].join(' ');

        exec(cmd, (error, _stdout, stderr) => {
            if (error) {
                console.error('Ghostscript (to-images) error:', error.message);
                if (
                    error.code === 127 ||
                    (stderr && stderr.includes('command not found')) ||
                    (error.message && error.message.includes('not found'))
                ) {
                    return reject(new Error('TOOL_MISSING:gs'));
                }
                return reject(error);
            }

            const images = fs
                .readdirSync(outputDir)
                .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
                .sort()
                .map(f => `${outputDir}/${f}`);

            if (images.length === 0) {
                return reject(new Error('No images were generated — is the PDF valid?'));
            }

            resolve(images);
        });
    });
}

module.exports = { compressPdf, convertToImages };
