# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:22-bookworm-slim

# System tools required by skoolPDF workers
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-tur \
    tesseract-ocr-eng \
    libreoffice \
    python3 \
    python3-pip \
    zip \
    && rm -rf /var/lib/apt/lists/*

# Python packages
RUN pip3 install --break-system-packages pdf2docx ocrmypdf msoffcrypto-tool

WORKDIR /app

# Backend dependencies (production only)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Writable uploads directory
RUN mkdir -p backend/uploads && chmod 777 backend/uploads

EXPOSE 5005
CMD ["node", "backend/index.js"]
