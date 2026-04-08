const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());
app.use(express.json());

// Main PDF Router
app.use('/api/pdf', pdfRoutes);

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// PRODUCTION DEPLOYMENT: Serve React Build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`skoolPDF System Backend v3 [ULTRA-COMPRESSION] listening on port ${PORT}`);
});
