# ─── Stage 1: Builder ─────────────────────────────────────────────────────────
# Pre-download all heavy AI models during build so the container starts instantly.
FROM python:3.11-slim AS builder

WORKDIR /app

# System dependencies: Tesseract OCR + build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libtesseract-dev \
    libglib2.0-0 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download spaCy model
RUN python -m spacy download en_core_web_sm

# Pre-download SentenceTransformers embedding model (~90MB)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Pre-download HuggingFace BART classification model (~1.6GB)
RUN python -c "from transformers import pipeline; pipeline('zero-shot-classification', model='facebook/bart-large-mnli')"

# ─── Stage 2: Final Image ─────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Copy system libs for Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    libglib2.0-0 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages and cached models from builder
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/.cache /root/.cache

# Copy application source
COPY . .

# Create data directory for FAISS index persistence
RUN mkdir -p data

EXPOSE 8000

# Healthcheck — checks the AI service is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
