const { exec } = require('child_process');

function unlockPdf(inputPath, outputPath, password) {
    return new Promise((resolve, reject) => {
        const escapedPassword = password.replace(/"/g, '\\"');
        const cmd = `qpdf --password="${escapedPassword}" --decrypt "${inputPath}" "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("QPDF Error:", error);
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
        const escapedPassword = password.replace(/"/g, '\\"');
        const cmd = `qpdf --encrypt "${escapedPassword}" "${escapedPassword}" 256 -- "${inputPath}" "${outputPath}"`;
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error("QPDF Encrypt Error:", error);
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
