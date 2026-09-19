# backend/app/services/ai_service.py
# ============================================================
#  AI Service — implements all stubs from the implementation plan
#  Author: Deepak (AI/ML team member)
#
#  This file is the ONLY file the rest of the backend (document_service,
#  audit_service, API routes) needs to import. It delegates to the
#  specialized modules in app/ai/.
#
#  Stub interface (from plan):
#    classify_document(text)          -> classification label
#    generate_embedding(text)         -> vector for pgvector (768-dim)
#    semantic_search(query, ...)      -> list of matching docs
#    summarize_document(text)         -> single-doc summary
#    summarize_case(documents)        -> full case summary
#    index_document(...)              -> add to FAISS index
#    remove_document(document_id)     -> remove from FAISS index
#
#  NOTE: rag_query() from the original stub is REPLACED by
#  summarize_case(). RAG requires a running LLM (~5GB VRAM).
#  distilBART summarization gives equivalent value at ~300MB.
# ============================================================

from typing import Optional

from app.ai import classifier, embedder, search, summarizer


# ── Classification ────────────────────────────────────────────

def classify_document(text: str) -> dict:
    """
    Classify a document and extract entities.

    Called by: document_service.py after OCR, before saving to DB.

    Args:
        text: raw OCR text from a document

    Returns:
        {
          "documentType": "FIR",           <- use as document.classification value
          "confidence":   0.93,
          "allScores":    {"FIR": 0.93, "CHARGESHEET": 0.04, ...},
          "entities": {
            "ipcSections": ["302", "34"],
            "caseNumbers": ["404/2024"],
            "dates":       ["15-08-2024"],
            "names":       ["Vikram Singh"],
          }
        }

    Example:
        result = classify_document(ocr_text)
        doc.classification   = result["documentType"]   # store in DB
        doc.entities         = result["entities"]       # store in DB (JSON)
    """
    return classifier.classify(text)


# ── Embedding (for pgvector column) ──────────────────────────

def generate_embedding(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding vector.

    Called by: document_service.py, stored in document.embedding (pgvector).

    Args:
        text: document text (OCR result)

    Returns:
        list[float] of length 768 — assign directly to document.embedding

    Example:
        doc.embedding = generate_embedding(ocr_text)
        # SQLAlchemy + pgvector stores this automatically

    Model: sentence-transformers/all-mpnet-base-v2 (768-dim)
    Matches Vector(768) column in backend/app/models/document.py
    """
    return embedder.embed(text)


# ── Semantic Search ───────────────────────────────────────────

def semantic_search(
    query: str,
    allowed_case_ids: list[str],
    top_k: int = 5,
    document_type_filter: Optional[str] = None,
) -> list[dict]:
    """
    Natural language search over indexed documents.

    Called by: documents API route (GET /api/v1/documents/search)

    Args:
        query:                natural language query string
        allowed_case_ids:     list of case IDs this user can access
                              (from RBAC — get from current_user.accessible_cases)
                              pass ["*"] to skip RBAC (ADMIN only)
        top_k:                number of results to return (default 5)
        document_type_filter: optional filter e.g. "FIR", "CHARGESHEET"

    Returns:
        list of {documentId, caseId, documentType, score, snippet}
        sorted by relevance (best first)

    Example:
        results = semantic_search(
            query="extortion case threatening emails",
            allowed_case_ids=current_user.case_ids,
        )
    """
    return search.semantic_search(query, allowed_case_ids, top_k, document_type_filter)


# ── FAISS Index Management ────────────────────────────────────

def index_document(
    document_id: str,
    text: str,
    case_id: str = "public",
    document_type: str = "OTHER",
    case_title: Optional[str] = None,
) -> None:
    """
    Add a document to the FAISS search index.

    Called by: document_service.py immediately after upload + OCR.

    Args:
        document_id:   document UUID (from database)
        text:          OCR text
        case_id:       case UUID (for RBAC filtering in search)
        document_type: e.g. "FIR" (from classify_document result)
        case_title:    human-readable case name (optional, for display)

    Example:
        index_document(
            document_id = str(doc.id),
            text        = ocr_result["text"],
            case_id     = str(doc.case_id),
            document_type = classify_result["documentType"],
        )
    """
    search.index_document(document_id, text, case_id, document_type, case_title)


def remove_document(document_id: str) -> bool:
    """
    Remove a document from FAISS index (soft-delete).

    Called by: document_service.py on soft delete.

    Returns True if found and removed, False if not found.
    """
    return search.remove_document(document_id)


# ── Summarization (replaces RAG) ─────────────────────────────

def summarize_document(text: str, max_length: int = 200) -> dict:
    """
    Summarize a single document.

    Called by: documents API (GET /api/v1/documents/{id}/summary)

    Args:
        text:       document OCR text (from document.ocr_text in DB)
        max_length: max output token count

    Returns:
        {summary, original_length, summary_length, compression_ratio}

    Example:
        result = summarize_document(doc.ocr_text)
        return {"summary": result["summary"]}
    """
    return summarizer.summarize(text, max_length=max_length)


def summarize_case(documents: list[dict]) -> dict:
    """
    Summarize an entire investigation case.

    Called by: cases API (GET /api/v1/cases/{id}/summary)

    Args:
        documents: list of dicts — each must have:
                   "text"         (str) — document OCR text
                   "documentType" (str) — "FIR", "CHARGESHEET", etc.

    Returns:
        {
          "overallSummary":  "Vikram Singh was charged with...",
          "byDocumentType": {
            "FIR":         "Complainant filed FIR on...",
            "CHARGESHEET": "Accused charged under Section 384...",
          },
          "totalDocuments": 3
        }

    Example:
        docs = [
            {"text": doc.ocr_text, "documentType": doc.classification}
            for doc in case.documents
        ]
        return summarize_case(docs)
    """
    return summarizer.summarize_case(documents)


# ── Stub: rag_query (kept for interface compatibility) ────────

def rag_query(question: str, context_docs: list[str]) -> dict:
    """
    REPLACED BY summarize_case().

    Original plan had LLM RAG here, but that requires a running
    Llama-3-8B (5GB VRAM) which exceeds our server's capacity
    when all other services are running.

    This stub uses the summarizer as a fallback so the API does not break.
    Upgrade path: swap this with a real LLM call when GPU is available.
    """
    combined_text = "\n\n".join(context_docs[:3])   # top 3 context docs
    summary_result = summarizer.summarize(
        f"Question: {question}\n\nContext:\n{combined_text}",
        max_length=250,
        min_length=50,
    )
    return {
        "answer":   summary_result["summary"],
        "method":   "summarization_fallback",
        "warning":  "RAG not active. Using summarization. Enable LLM for true RAG.",
        "sources":  len(context_docs),
    }
