const { execFile } = require('child_process');
const fs = require('fs');

function compressPdf(inputPath, outputPath, level = 'ebook') {
    return new Promise((resolve, reject) => {
        let dpi = 150;
        if (level === 'screen')  dpi = 72;
        if (level === 'printer') dpi = 300;

        const args = [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            `-dPDFSETTINGS=/${level}`,
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            '-dDetectDuplicateImages=true',
            '-dAutoFilterColorImages=false', '-dColorImageFilter=/DCTEncode',
            '-dAutoFilterGrayImages=false',  '-dGrayImageFilter=/DCTEncode',
            '-dDownsampleColorImages=true',  '-dColorImageDownsampleType=/Bicubic',
            `-dColorImageResolution=${dpi}`, '-dColorImageDownsampleThreshold=1.0',
            '-dDownsampleGrayImages=true',   '-dGrayImageDownsampleType=/Bicubic',
            `-dGrayImageResolution=${dpi}`,  '-dGrayImageDownsampleThreshold=1.0',
            '-dDownsampleMonoImages=true',   '-dMonoImageDownsampleType=/Bicubic',
            `-dMonoImageResolution=${dpi}`,  '-dMonoImageDownsampleThreshold=1.0',
            `-sOutputFile=${outputPath}`,
            inputPath,
        ];

        execFile('gs', args, (error, _stdout, stderr) => {
            if (error) {
                if (error.code === 127 || (stderr && stderr.includes('command not found')) || (error.message && error.message.includes('not found'))) {
                    return reject(new Error('TOOL_MISSING:gs'));
                }
                return reject(error);
            }

            const inputSize  = fs.statSync(inputPath).size;
            const outputSize = fs.statSync(outputPath).size;
            if (outputSize >= inputSize) {
                fs.copyFileSync(inputPath, outputPath);
            } else {
                const saved = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
                console.log(`[skoolPDF] Compressed — saved ${saved}%.`);
            }

            resolve(outputPath);
        });
    });
}

function convertToImages(inputPath, outputDir, dpi = 150) {
    return new Promise((resolve, reject) => {
        const prefix        = `pages_${Date.now()}`;
        const outputPattern = `${outputDir}/${prefix}_%04d.png`;

        const args = [
            '-dBATCH', '-dNOPAUSE', '-dSAFER',
            '-sDEVICE=png16m',
            `-r${dpi}`,
            '-dTextAlphaBits=4',
            '-dGraphicsAlphaBits=4',
            `-sOutputFile=${outputPattern}`,
            inputPath,
        ];

        execFile('gs', args, (error, _stdout, stderr) => {
            if (error) {
                if (error.code === 127 || (stderr && stderr.includes('command not found')) || (error.message && error.message.includes('not found'))) {
                    return reject(new Error('TOOL_MISSING:gs'));
                }
                return reject(error);
            }

            const images = fs
                .readdirSync(outputDir)
                .filter(f => f.startsWith(prefix) && f.endsWith('.png'))
                .sort()
                .map(f => `${outputDir}/${f}`);

            if (images.length === 0) return reject(new Error('No images generated — is the PDF valid?'));
            resolve(images);
        });
    });
}

module.exports = { compressPdf, convertToImages };
