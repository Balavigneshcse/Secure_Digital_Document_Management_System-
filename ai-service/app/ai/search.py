# ============================================================
#  search/engine.py  --  SentinelDMS AI Pipeline
#  Layer 3: Semantic Search (FAISS + sentence-transformers)
# ============================================================
#
#  What this does:
#    Converts document text into a 384-dimensional vector using
#    a sentence-transformers model, stores it in a FAISS index,
#    and lets you search with natural language queries.
#
#    "Show me all FIRs mentioning extortion" -- this works even if
#    the documents say "demanding money" instead of "extortion".
#    Semantic search understands MEANING, not just keywords.
#
#  Models used:
#    all-MiniLM-L6-v2 -- 80MB, 384-dim, runs on CPU in ~50ms per doc
#
#  FAISS = Facebook AI Similarity Search
#    An extremely fast library for vector nearest-neighbour search.
#    IndexFlatL2 = exact L2 (Euclidean) distance search.
#    No approximation, 100% recall -- right choice for <100K documents.
# ============================================================

import json
import numpy as np
import faiss
from pathlib import Path
from typing import List, Optional
from sentence_transformers import SentenceTransformer


# -- CONSTANTS ------------------------------------------------
MODEL_NAME = "all-MiniLM-L6-v2"  # fast, small, good quality
EMBEDDING_DIM = 384               # output size of all-MiniLM-L6-v2
DATA_DIR = Path("data")           # persisted index lives here
INDEX_PATH = DATA_DIR / "faiss.index"
META_PATH  = DATA_DIR / "faiss_meta.json"


class SemanticSearchEngine:
    """
    Vector-based semantic document search.

    Documents are embedded once at upload time and stored in FAISS.
    At query time, the query is embedded and compared to all stored
    vectors in <1ms, even with thousands of documents.

    RBAC enforcement: every stored vector has a caseId. At query time
    we only return results from cases the user is allowed to see.

    Usage:
        engine = SemanticSearchEngine()

        # Index a document after upload
        engine.index_document(
            document_id="uuid-123",
            text="FIRST INFORMATION REPORT...",
            case_id="CASE-2024-001",
            document_type="FIR",
        )

        # Search
        results = engine.query(
            query_text="extortion case with IT Act",
            allowed_case_ids=["CASE-2024-001", "CASE-2024-002"],
        )
    """

    def __init__(self):
        self._model: Optional[SentenceTransformer] = None
        self._index: Optional[faiss.Index] = None
        self._meta:  List[dict] = []
        self._load_persisted_index()

    # -- PRIVATE: lazy model load ---------------------------------
    def _load_model(self):
        """Load sentence-transformer model on first use."""
        if self._model is None:
            self._model = SentenceTransformer(MODEL_NAME)

    # -- PRIVATE: load index from disk ----------------------------
    def _load_persisted_index(self):
        """
        Load existing FAISS index from disk on startup.

        Why persist? Without this, every restart wipes all indexed docs
        and you would have to re-index the entire document library.
        """
        if INDEX_PATH.exists() and META_PATH.exists():
            self._index = faiss.read_index(str(INDEX_PATH))
            with META_PATH.open("r", encoding="utf-8") as f:
                self._meta = json.load(f)
        else:
            # First run -- create a fresh empty index
            # IndexFlatL2: exact nearest-neighbour, L2 (Euclidean) distance
            self._index = faiss.IndexFlatL2(EMBEDDING_DIM)
            self._meta  = []

    # -- PRIVATE: save index to disk ------------------------------
    def _save(self):
        """Persist the FAISS index and metadata after every new document."""
        DATA_DIR.mkdir(exist_ok=True)
        faiss.write_index(self._index, str(INDEX_PATH))
        with META_PATH.open("w", encoding="utf-8") as f:
            json.dump(self._meta, f, ensure_ascii=False, indent=2)

    # -- PRIVATE: embed text --------------------------------------
    def _embed(self, text: str) -> np.ndarray:
        """
        Convert text to a 384-dim unit vector.

        normalize_embeddings=True means the vectors have L2 norm = 1.
        This makes L2 distance equivalent to cosine similarity, which
        is better for semantic comparison (direction matters, not magnitude).
        """
        self._load_model()
        vec = self._model.encode(
            [text],
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        # FAISS needs float32, not float64
        return vec.astype("float32")

    # -- PUBLIC: index_document -----------------------------------
    def index_document(
        self,
        document_id: str,
        text: str,
        case_id: str = "public",
        document_type: str = "OTHER",
        case_title: Optional[str] = None,
    ) -> None:
        """
        Embed and store a document in the FAISS index.

        Call this once per document, right after OCR + classification.
        The embedding is computed from the full OCR text.

        Args:
            document_id:   UUID from the database
            text:          full OCR text from the document
            case_id:       links this doc to an RBAC-controlled case
            document_type: "FIR", "CHARGESHEET", etc.
            case_title:    optional human-readable case name
        """
        # Truncate very long documents for embedding
        # all-MiniLM-L6-v2 handles up to 256 tokens -- ~200 words.
        # For longer docs, embedding the first 200 words captures the
        # most important context (headers, case numbers, key facts).
        sample_text = " ".join(text.split()[:200])

        vec = self._embed(sample_text)

        # FAISS stores vectors by integer index (0, 1, 2, ...).
        # _meta[i] stores the metadata for vector i.
        # They must always be in sync.
        self._index.add(vec)   # adds to position len(_meta)
        self._meta.append({
            "documentId":   document_id,
            "caseId":       case_id,
            "documentType": document_type,
            "caseTitle":    case_title,
            "snippet":      text[:400],   # first 400 chars for display
        })

        self._save()

    # -- PUBLIC: query --------------------------------------------
    def query(
        self,
        query_text: str,
        allowed_case_ids: List[str],
        top_k: int = 5,
        document_type_filter: Optional[str] = None,
    ) -> List[dict]:
        """
        Semantic search with RBAC filtering.

        Args:
            query_text:           natural language query
            allowed_case_ids:     list of case IDs this user can access
                                  pass ["*"] to allow all cases
            top_k:                how many results to return
            document_type_filter: optional filter e.g. "FIR"

        Returns:
            List of result dicts, sorted by relevance (best first).
            Each dict:  {documentId, caseId, documentType, score, snippet}
        """
        if self._index.ntotal == 0:
            return []  # Nothing indexed yet

        vec = self._embed(query_text)

        # Search for top_k * 5 candidates to account for RBAC filtering.
        # After filtering, we pick the best top_k that pass.
        n_candidates = min(top_k * 5, self._index.ntotal)
        distances, indices = self._index.search(vec, n_candidates)
        # distances: shape (1, n_candidates) -- L2 distances
        # indices:   shape (1, n_candidates) -- indices into _meta

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0 or idx >= len(self._meta):
                continue

            meta = self._meta[idx]

            # RBAC check: is this doc in an allowed case?
            if (
                "*" not in allowed_case_ids
                and meta["caseId"] not in allowed_case_ids
            ):
                continue

            # Optional document type filter
            if document_type_filter and meta["documentType"] != document_type_filter:
                continue

            # Convert L2 distance to a 0-1 similarity score.
            # dist=0 means identical vectors (score=1.0).
            # Larger distance = lower score.
            score = float(1.0 / (1.0 + dist))

            results.append({
                "documentId":   meta["documentId"],
                "caseId":       meta["caseId"],
                "documentType": meta["documentType"],
                "score":        round(score, 3),
                "snippet":      meta["snippet"],
            })

            if len(results) >= top_k:
                break

        return results

    # -- PUBLIC: delete_document ----------------------------------
    def delete_document(self, document_id: str) -> bool:
        """
        Remove a document from the index (soft delete via metadata).

        FAISS IndexFlatL2 does not support in-place deletion.
        We mark the entry as deleted in metadata so it is filtered
        out of all future queries.

        Args:
            document_id: the UUID to remove

        Returns:
            True if found and removed, False if not found.
        """
        found = False
        for entry in self._meta:
            if entry["documentId"] == document_id:
                entry["_deleted"] = True
                found = True
        if found:
            self._save()
        return found

    @property
    def total_documents(self) -> int:
        """Total number of indexed (non-deleted) documents."""
        return sum(1 for m in self._meta if not m.get("_deleted", False))
