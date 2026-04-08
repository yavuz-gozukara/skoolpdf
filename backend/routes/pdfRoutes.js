const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const pdfController = require('../controllers/pdfController');

router.post('/merge', upload.array('files', 20), pdfController.processMerge);
router.post('/split', upload.single('file'), pdfController.processSplit);
router.post('/compress', upload.single('file'), pdfController.processCompress);
router.post('/ocr', upload.single('file'), pdfController.processOcr);
router.get('/ocr/status/:jobId', pdfController.getOcrStatus);
router.get('/ocr/download/:jobId', pdfController.downloadOcrResult);
router.post('/watermark', upload.single('file'), pdfController.processWatermark);
router.post('/protect', upload.single('file'), pdfController.processProtect);
router.post('/convert/to-pdf', upload.single('file'), pdfController.processConvertToPdf);
router.post('/convert/to-word', upload.single('file'), pdfController.processConvertToWord);
router.post('/convert/to-images', upload.single('file'), pdfController.processToImages);
router.post('/unlock', upload.single('file'), pdfController.processUnlock);

module.exports = router;
