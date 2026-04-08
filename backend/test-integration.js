const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const axios = require('axios');
const FormData = require('form-data');

const API_BASE = 'http://localhost:5005/api/pdf';

async function generateTestPdf() {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);
    page.drawText('This is a skoolPDF Automated Integration Test.', {
        x: 50, y: 350, size: 24, color: rgb(0, 0.53, 0.71)
    });
    const pdfBytes = await pdfDoc.save();
    const fp = path.join(__dirname, 'test.pdf');
    fs.writeFileSync(fp, pdfBytes);
    return fp;
}

async function runTests() {
    console.log('📚 Starting skoolPDF Full Integrity Test...');
    
    // 1. Generate Dummy PDF
    const testPdfPath = await generateTestPdf();
    console.log('✅ Generated dummy pdf: test.pdf');

    const endpoints = [
        { name: 'Split PDF', uri: '/split', append: (fd) => fd.append('ranges', '1-1') },
        { name: 'Watermark PDF', uri: '/watermark', append: (fd) => fd.append('text', 'SKOOL-TEST') },
        { name: 'Protect PDF', uri: '/protect', append: (fd) => fd.append('password', '1234') },
    ];

    for (const ep of endpoints) {
        try {
            console.log(`\nTesting [${ep.name}] API...`);
            const form = new FormData();
            form.append('file', fs.createReadStream(testPdfPath), {
                filename: 'test.pdf',
                contentType: 'application/pdf'
            });
            ep.append(form);

            const res = await axios.post(`${API_BASE}${ep.uri}`, form, {
                headers: { ...form.getHeaders() },
                responseType: 'arraybuffer'
            });

            if (res.status === 200 && res.data.length > 100) {
                console.log(`✅ [${ep.name}] OK (${res.data.length} bytes received)`);
            } else {
                console.error(`❌ [${ep.name}] Failed or returned empty blob.`);
            }
        } catch (e) {
            console.error(`❌ [${ep.name}] Threw Error:`, e.message);
        }
    }

    console.log('\n✅ Core Node Tests Completed. Note: Heavy binaries like LibreOffice/Ghostscript/OCRmyPDF require their respective system environment paths to resolve cleanly (which is handled by Docker!).');

    // Cleanup
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
}

runTests();
