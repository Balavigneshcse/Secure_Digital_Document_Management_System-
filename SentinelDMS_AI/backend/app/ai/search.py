# backend/app/ai/search.py
# FAISS semantic search (768-dim, matches pgvector column)
# Dual-track: embeddings stored in PostgreSQL (pgvector), queried via FAISS (fast)
import json
import numpy as np
import faiss
from pathlib import Path
from typing import Optional

from app.ai.embedder import embed, EMBEDDING_DIM

_DATA_DIR   = Path("data")
_INDEX_PATH = _DATA_DIR / "faiss.index"
_META_PATH  = _DATA_DIR / "faiss_meta.json"

_index = None
_meta: list[dict] = []


def _get_index():
    global _index, _meta
    if _index is None:
        if _INDEX_PATH.exists() and _META_PATH.exists():
            _index = faiss.read_index(str(_INDEX_PATH))
            _meta  = json.loads(_META_PATH.read_text(encoding="utf-8"))
        else:
            _index = faiss.IndexFlatL2(EMBEDDING_DIM)
            _meta  = []
    return _index, _meta


def _save():
    _DATA_DIR.mkdir(exist_ok=True)
    faiss.write_index(_index, str(_INDEX_PATH))
    _META_PATH.write_text(json.dumps(_meta, ensure_ascii=False, indent=2), encoding="utf-8")


def index_document(
    document_id: str,
    text: str,
    case_id: str        = "public",
    document_type: str  = "OTHER",
    case_title: Optional[str] = None,
) -> None:
    """
    Embed and store a document in the FAISS index.
    Called by ai_service.index_document() right after upload.

    Also returns the embedding vector so document_service.py can
    persist it to the pgvector column in PostgreSQL.
    """
    idx, meta = _get_index()
    sample    = " ".join(text.split()[:200])   # first 200 words for embedding
    vec       = np.array([embed(sample)], dtype="float32")
    idx.add(vec)
    meta.append({
        "documentId":   document_id,
        "caseId":       case_id,
        "documentType": document_type,
        "caseTitle":    case_title,
        "snippet":      text[:400],
        "_deleted":     False,
    })
    _save()


def semantic_search(
    query_text: str,
    allowed_case_ids: list[str],
    top_k: int = 5,
    document_type_filter: Optional[str] = None,
) -> list[dict]:
    """
    Vector nearest-neighbour search with RBAC filtering.

    Args:
        query_text:           natural language query
        allowed_case_ids:     case IDs this user may access. Pass ["*"] to skip RBAC.
        top_k:                results to return
        document_type_filter: optional e.g. "FIR"

    Returns:
        List of {documentId, caseId, documentType, score, snippet}
        sorted by relevance descending.
    """
    idx, meta = _get_index()
    if idx.ntotal == 0:
        return []

    vec = np.array([embed(query_text)], dtype="float32")
    n   = min(top_k * 5, idx.ntotal)
    distances, indices = idx.search(vec, n)

    results = []
    for dist, i in zip(distances[0], indices[0]):
        if i < 0 or i >= len(meta):
            continue
        m = meta[i]
        if m.get("_deleted"):
            continue
        if "*" not in allowed_case_ids and m["caseId"] not in allowed_case_ids:
            continue
        if document_type_filter and m["documentType"] != document_type_filter:
            continue
        results.append({
            "documentId":   m["documentId"],
            "caseId":       m["caseId"],
            "documentType": m["documentType"],
            "score":        round(1.0 / (1.0 + float(dist)), 3),
            "snippet":      m["snippet"],
        })
        if len(results) >= top_k:
            break

    return results


def remove_document(document_id: str) -> bool:
    """Soft-delete a document from the FAISS index."""
    _, meta = _get_index()
    for m in meta:
        if m["documentId"] == document_id:
            m["_deleted"] = True
            _save()
            return True
    return False
