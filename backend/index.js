const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const pdfRoutes = require('./routes/pdfRoutes');

const app  = express();
const PORT = process.env.PORT || 5005;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Production: same-origin only (Express serves the frontend build).
// Development: allow the Vite dev server.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [];

app.use(cors({
    origin: (origin, cb) => {
        // Same-origin requests (no Origin header) are always allowed
        if (!origin) return cb(null, true);
        // Allow localhost in development
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost')) return cb(null, true);
        // Allow explicitly whitelisted origins (set ALLOWED_ORIGINS env var on Railway)
        if (allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Main PDF Router
app.use('/api/pdf', pdfRoutes);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Production: serve React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`skoolPDF backend listening on port ${PORT}`);
});
