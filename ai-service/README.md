# SentinelDMS AI Service

Standalone FastAPI microservice for all AI operations.
Runs on port **8001**. Backend (port 8000) calls this via internal HTTP.

## Structure
```
ai-service/
├── app/
│   ├── main.py          ← FastAPI entry point
│   ├── ai/              ← Pure AI engines (no web deps)
│   │   ├── ocr.py       ← PyMuPDF + Tesseract (En/Hi/Ta)
│   │   ├── classifier.py← BART zero-shot + regex entities
│   │   ├── embedder.py  ← 768-dim embeddings (all-mpnet-base-v2)
│   │   ├── search.py    ← FAISS semantic search + RBAC
│   │   └── summarizer.py← distilBART case summarizer
│   └── api/
│       └── routes.py    ← All HTTP endpoints
├── data/                ← FAISS index (auto-created, gitignored)
├── ai_pipeline.py       ← Single-file standalone (for friend)
├── requirements.txt
└── Dockerfile
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /ai/ocr | Extract text from PDF/image |
| POST | /ai/classify | Classify document type + extract entities |
| POST | /ai/process | Full pipeline: OCR → Classify → Embed → Index |
| POST | /ai/embed | Generate 768-dim embedding vector |
| POST | /ai/search | Semantic search with RBAC |
| POST | /ai/summarize | Summarize single document |
| POST | /ai/summarize-case | Summarize full case (multiple docs) |
| DELETE | /ai/index/{id} | Remove document from FAISS index |
| GET | /ai/index/stats | FAISS index statistics |

## Quick Start
```bash
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
# Docs at http://localhost:8001/docs
```

## Docker
```bash
docker build -t sentinel-ai .
docker run -p 8001:8001 -v $(pwd)/data:/app/data sentinel-ai
```

## Models Downloaded on First Run (~2GB)
| Model | Size | Used for |
|-------|------|----------|
| facebook/bart-large-mnli | ~1.6 GB | Classification |
| sentence-transformers/all-mpnet-base-v2 | ~420 MB | Embeddings (768-dim) |
| sshleifer/distilbart-cnn-12-6 | ~300 MB | Summarization |
