# ai-service/app/main.py — Standalone FastAPI AI Microservice
# Exposes all AI endpoints for the SentinelDMS backend to call via HTTP
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="SentinelDMS AI Service",
    description="OCR · Classification · Semantic Search · Summarization",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Backend-to-backend — restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/ai")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "SentinelDMS-AI"}
