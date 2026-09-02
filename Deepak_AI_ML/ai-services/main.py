from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI(title="SentinelDMS AI Services API", version="2.0.0")

# ─────────────────────────────────────────────────────────────────────────────
# System
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    return {"message": "SentinelDMS AI Services v2.0 — Visit /docs for Swagger UI."}

@app.get("/health", tags=["System"])
async def health():
    """Quick health check — returns index stats."""
    from search.engine import SemanticSearchEngine
    engine = SemanticSearchEngine()
    stats = engine.get_stats()
    return {"status": "ok", "indexStats": stats}

# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

# OCR
class OcrResponse(BaseModel):
    text: str
    confidence: float
    pages: List[int]

# Classification
class ClassifyRequest(BaseModel):
    text: str

class Entities(BaseModel):
    names: List[str]
    dates: List[str]
    caseNumbers: List[str]
    locations: List[str]
    ipcSections: Optional[List[str]] = []

class ClassifyResponse(BaseModel):
    documentType: str
    confidence: float
    entities: Entities

# Semantic Search
class IndexRequest(BaseModel):
    documentId: str
    text: str
    caseId: Optional[str] = "public"      # Week 4: RBAC field
    documentType: Optional[str] = "other"  # Week 4: type tagging

class SearchRequest(BaseModel):
    query: str
    userId: str
    allowedCaseIds: List[str]
    documentTypeFilter: Optional[str] = None  # Week 4: filter by doc type

class SearchResultSnippet(BaseModel):
    documentId: str
    caseId: Optional[str] = "public"
    documentType: Optional[str] = "other"
    score: float
    snippet: str

class SearchResponse(BaseModel):
    results: List[SearchResultSnippet]

# RAG Chatbot
class ChatbotRequest(BaseModel):
    question: str
    userId: str
    allowedCaseIds: List[str]

class SourceSnippet(BaseModel):
    documentId: str
    snippet: str

class ChatbotResponse(BaseModel):
    answer: str
    sources: List[SourceSnippet]

# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

# -- OCR --
@app.post("/ocr/extract", response_model=OcrResponse, tags=["OCR Service"])
async def extract_text(file: UploadFile = File(...)):
    """Extracts text from an uploaded document (PDF/Image) using Tesseract OCR."""
    from ocr.engine import OCREngine
    try:
        file_bytes = await file.read()
        result = OCREngine().extract(file_bytes, file.filename)
        return OcrResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -- Classification --
@app.post("/classify", response_model=ClassifyResponse, tags=["Classification Service"])
async def classify_document(request: ClassifyRequest):
    """Classifies document type and extracts key entities using HuggingFace BART."""
    from classifier.engine import ClassificationEngine
    try:
        result = ClassificationEngine().process(request.text)
        return ClassifyResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# -- OCR + Classify Pipeline (Week 4: Combined endpoint for Balavignesh) --
@app.post("/pipeline/process", tags=["Pipeline"])
async def process_document(
    file: UploadFile = File(...),
    caseId: str = "public",
    documentId: Optional[str] = None,
):
    """
    Full pipeline: Upload → OCR → Classify → Index into FAISS.
    Balavignesh calls this single endpoint after a document is uploaded.
    Returns OCR text + classification + confirmation of indexing.
    """
    from ocr.engine import OCREngine
    from classifier.engine import ClassificationEngine
    from search.engine import SemanticSearchEngine
    import uuid
    try:
        file_bytes = await file.read()
        doc_id = documentId or str(uuid.uuid4())

        # Step 1: OCR
        ocr_result = OCREngine().extract(file_bytes, file.filename)
        text = ocr_result["text"]

        # Step 2: Classify
        classify_result = ClassificationEngine().process(text)
        doc_type = classify_result["documentType"]

        # Step 3: Index into FAISS with caseId + docType
        SemanticSearchEngine().index_document(
            document_id=doc_id,
            text=text,
            case_id=caseId,
            document_type=doc_type,
        )

        return {
            "documentId": doc_id,
            "caseId": caseId,
            "ocrConfidence": ocr_result["confidence"],
            "documentType": doc_type,
            "classificationConfidence": classify_result["confidence"],
            "entities": classify_result["entities"],
            "indexed": True,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- Semantic Search --
@app.post("/search/index", tags=["Semantic Search Service"])
async def index_document(request: IndexRequest):
    """
    Embeds and stores a document's text in FAISS.
    Week 4: Now accepts caseId and documentType for RBAC enforcement.
    """
    from search.engine import SemanticSearchEngine
    try:
        SemanticSearchEngine().index_document(
            document_id=request.documentId,
            text=request.text,
            case_id=request.caseId,
            document_type=request.documentType,
        )
        return {"status": "success", "message": f"Document {request.documentId} indexed."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search/query", response_model=SearchResponse, tags=["Semantic Search Service"])
async def search_documents(request: SearchRequest):
    """
    Semantic search with real RBAC enforcement.
    Week 4: Filters results by allowedCaseIds and optional documentTypeFilter.
    """
    from search.engine import SemanticSearchEngine
    try:
        results = SemanticSearchEngine().query(
            query_text=request.query,
            allowed_case_ids=request.allowedCaseIds,
            document_type_filter=request.documentTypeFilter,
        )
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -- RAG Chatbot --
@app.post("/assistant/ask", response_model=ChatbotResponse, tags=["RAG Chatbot Service"])
async def ask_chatbot(request: ChatbotRequest):
    """Natural language Q&A over authorized documents only."""
    from chatbot.engine import ChatbotEngine
    try:
        result = ChatbotEngine().ask(request.question, request.allowedCaseIds)
        return ChatbotResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
