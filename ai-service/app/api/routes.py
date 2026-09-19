# ai-service/app/api/routes.py — All AI endpoints
# Called by the backend team's FastAPI (Balavignesh) via internal HTTP
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional
from pathlib import Path
import uuid

from app.ai import ocr, classifier, embedder, search, summarizer

router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────

class ProcessResponse(BaseModel):
    document_id: str
    ocr: dict
    classifier: dict
    embedding_dim: int
    indexed: bool

class SearchRequest(BaseModel):
    query: str
    allowed_case_ids: list[str] = ["*"]
    top_k: int = 5
    document_type_filter: Optional[str] = None

class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 200

class CaseSummarizeRequest(BaseModel):
    documents: list[dict]   # [{"text": "...", "documentType": "FIR"}, ...]

class EmbedRequest(BaseModel):
    text: str


# ── OCR ──────────────────────────────────────────────────────

@router.post("/ocr", summary="Extract text from PDF or image")
async def ocr_endpoint(file: UploadFile = File(...)):
    """
    Accepts: PDF, PNG, JPG, TIFF
    Returns: {text, confidence, language, pages, method}
    """
    file_bytes = await file.read()
    try:
        result = ocr.extract(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


# ── Classify ─────────────────────────────────────────────────

@router.post("/classify", summary="Classify document type + extract entities")
async def classify_endpoint(file: UploadFile = File(None), text: str = Form(None)):
    """
    Accepts: either a file (will OCR it first) or plain text.
    Returns: {documentType, confidence, allScores, entities}
    """
    if file:
        file_bytes = await file.read()
        ocr_result = ocr.extract(file_bytes, file.filename)
        raw_text   = ocr_result["text"]
    elif text:
        raw_text = text
    else:
        raise HTTPException(status_code=400, detail="Provide either a file or text.")
    return classifier.classify(raw_text)


# ── Full Pipeline: OCR + Classify + Embed + Index ────────────

@router.post("/process", summary="Full pipeline: OCR → Classify → Embed → Index")
async def process_document(
    file:     UploadFile = File(...),
    case_id:  str = Form("public"),
    doc_title: str = Form(""),
):
    """
    Single endpoint for document upload processing.
    Backend calls this after storing the file in MinIO.

    Returns: {document_id, ocr, classifier, embedding_dim, indexed}
    """
    file_bytes  = await file.read()
    document_id = str(uuid.uuid4())

    # 1. OCR
    try:
        ocr_result = ocr.extract(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 2. Classify
    clf_result = classifier.classify(ocr_result["text"])

    # 3. Embed + Index (FAISS)
    indexed = False
    if ocr_result["text"].strip():
        vec = embedder.embed(ocr_result["text"])
        search.index_document(
            document_id  = document_id,
            text         = ocr_result["text"],
            case_id      = case_id,
            document_type= clf_result["documentType"],
        )
        indexed = True

    return {
        "document_id":   document_id,
        "ocr":           ocr_result,
        "classifier":    clf_result,
        "embedding_dim": embedder.EMBEDDING_DIM,
        "indexed":       indexed,
    }


# ── Embedding ─────────────────────────────────────────────────

@router.post("/embed", summary="Generate 768-dim embedding vector")
async def embed_endpoint(body: EmbedRequest):
    """
    Returns list[float] of 768 values.
    Backend stores this in PostgreSQL pgvector column.
    """
    vec = embedder.embed(body.text)
    return {"embedding": vec, "dim": len(vec), "model": embedder.MODEL_NAME}


# ── Semantic Search ───────────────────────────────────────────

@router.post("/search", summary="Semantic search over indexed documents")
async def search_endpoint(body: SearchRequest):
    """
    Returns list of {documentId, caseId, documentType, score, snippet}
    RBAC: pass allowed_case_ids from backend JWT. ["*"] = admin (all cases).
    """
    return search.semantic_search(
        body.query,
        body.allowed_case_ids,
        body.top_k,
        body.document_type_filter,
    )


# ── Summarize single doc ──────────────────────────────────────

@router.post("/summarize", summary="Summarize a single document")
async def summarize_endpoint(body: SummarizeRequest):
    """
    Returns: {summary, original_length, summary_length, compression_ratio}
    """
    return summarizer.summarize(body.text, max_length=body.max_length)


# ── Summarize full case ───────────────────────────────────────

@router.post("/summarize-case", summary="Summarize all documents in a case")
async def summarize_case_endpoint(body: CaseSummarizeRequest):
    """
    documents = [{"text": "...", "documentType": "FIR"}, ...]
    Returns: {overallSummary, byDocumentType, totalDocuments}
    """
    return summarizer.summarize_case(body.documents)


# ── Index management ──────────────────────────────────────────

@router.delete("/index/{document_id}", summary="Remove document from FAISS index")
async def remove_from_index(document_id: str):
    found = search.remove_document(document_id)
    return {"removed": found, "document_id": document_id}

@router.get("/index/stats", summary="FAISS index statistics")
async def index_stats():
    idx, meta = search._get_index()
    active = sum(1 for m in meta if not m.get("_deleted", False))
    return {"total_vectors": idx.ntotal, "active_documents": active}
