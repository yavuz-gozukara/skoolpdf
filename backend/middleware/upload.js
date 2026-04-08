const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // We now allow PDFs, Words, PPTX, JPG, PNG
    const allowedMimes = [
        'application/pdf',
        // Word
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Excel
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // PowerPoint
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Images (convert tool only — not encryption)
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/tiff',
    ];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not supported for current operation.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500 MB capacity
    },
    fileFilter
});

module.exports = upload;
