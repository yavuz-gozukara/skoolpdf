const { compressPdf } = require('./workers/ghostscriptWorker');
const fs = require('fs');

const inputPath = '/Users/mert/Desktop/Computer Viison/Week 1 ComputerVision.pdf';
const outputPath = './uploads/gs-test-week1.pdf';

console.log('Original Size:', fs.statSync(inputPath).size / (1024 * 1024) + ' MB');

compressPdf(inputPath, outputPath, 'screen')
    .then(out => {
        console.log('Final Size:', fs.statSync(out).size / (1024 * 1024) + ' MB');
    })
    .catch(err => {
        console.error('Error:', err);
    });
