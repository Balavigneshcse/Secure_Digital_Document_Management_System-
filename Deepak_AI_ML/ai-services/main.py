from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI(title="SentinelDMS AI Services API", version="1.0.0")

# --- OCR Service Models ---
class OcrResponse(BaseModel):
    text: str
    confidence: float
    pages: List[int]

# --- Classification Service Models ---
class ClassifyRequest(BaseModel):
    text: str

class Entities(BaseModel):
    names: List[str]
    dates: List[str]
    caseNumbers: List[str]
    locations: List[str]

class ClassifyResponse(BaseModel):
    documentType: str # e.g. "FIR", "chargesheet", "witness_statement", "forensic_report", "court_filing", "other"
    confidence: float
    entities: Entities

# --- Semantic Search Service Models ---
class SearchRequest(BaseModel):
    query: str
    userId: str
    allowedCaseIds: List[str]

class SearchResultSnippet(BaseModel):
    documentId: str
    score: float
    snippet: str

class SearchResponse(BaseModel):
    results: List[SearchResultSnippet]

# --- RAG Chatbot Service Models ---
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


# --- API Endpoints ---

@app.post("/ocr/extract", response_model=OcrResponse, tags=["OCR Service"])
async def extract_text(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded document (PDF/Image) using OCR.
    """
    from ocr.engine import OCREngine
    try:
        file_bytes = await file.read()
        engine = OCREngine()
        result = engine.extract(file_bytes, file.filename)
        return OcrResponse(**result)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/classify", response_model=ClassifyResponse, tags=["Classification Service"])
async def classify_document(request: ClassifyRequest):
    """
    Classifies document type and extracts key entities.
    """
    # TODO: Implement classification and entity extraction logic
    return ClassifyResponse(
        documentType="FIR",
        confidence=0.89,
        entities=Entities(names=["John Doe"], dates=["2023-10-27"], caseNumbers=["CR-1234"], locations=["MG Road"])
    )

@app.post("/search/index", tags=["Semantic Search Service"])
async def index_document(documentId: str, text: str):
    """
    Embeds and stores a document's text in FAISS (called after every upload).
    """
    # TODO: Implement FAISS indexing
    return {"status": "success", "message": f"Document {documentId} indexed successfully."}

@app.post("/search/query", response_model=SearchResponse, tags=["Semantic Search Service"])
async def search_documents(request: SearchRequest):
    """
    Semantic search across documents respecting user access scope.
    """
    # TODO: Implement semantic search logic
    return SearchResponse(
        results=[
            SearchResultSnippet(documentId="doc-123", score=0.92, snippet="Sample matched snippet from doc-123...")
        ]
    )

@app.post("/assistant/ask", response_model=ChatbotResponse, tags=["RAG Chatbot Service"])
async def ask_chatbot(request: ChatbotRequest):
    """
    Natural language Q&A over authorized documents.
    """
    # TODO: Implement LangChain + Ollama RAG logic
    return ChatbotResponse(
        answer="Based on the documents, the incident occurred on MG Road.",
        sources=[SourceSnippet(documentId="doc-123", snippet="...incident occurred on MG Road...")]
    )
