import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import os
import json


class SemanticSearchEngine:
    """
    Semantic Search Engine with FAISS + SentenceTransformers.

    Week 4 Upgrade:
    - Real RBAC access-scope enforcement via caseId filtering
    - document_type stored in metadata for filtered search
    - Bulk indexing support for loading CSV datasets
    """

    def __init__(
        self,
        model_name: str = "all-MiniLM-L6-v2",
        index_path: str = "data/faiss_index.bin",
        meta_path: str = "data/faiss_meta.json",
    ):
        self.model = SentenceTransformer(model_name)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        self.index_path = index_path
        self.meta_path = meta_path

        # Load or create FAISS index
        if os.path.exists(self.index_path) and os.path.exists(self.meta_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            print(f"[Search] Loaded FAISS index with {self.index.ntotal} documents.")
        else:
            self.index = faiss.IndexFlatL2(self.embedding_dim)
            self.metadata = []
            print("[Search] Created fresh FAISS index.")

    def save_index(self):
        """Persist index and metadata to disk."""
        os.makedirs(os.path.dirname(self.index_path), exist_ok=True)
        faiss.write_index(self.index, self.index_path)
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False)

    def index_document(
        self,
        document_id: str,
        text: str,
        case_id: Optional[str] = None,
        document_type: Optional[str] = None,
    ):
        """
        Embeds text and adds it to FAISS with metadata.

        Week 4: now stores caseId and documentType for RBAC filtering.
        """
        embedding = self.model.encode([text])[0]
        self.index.add(np.array([embedding], dtype=np.float32))

        self.metadata.append({
            "documentId": document_id,
            "caseId": case_id or "public",          # "public" = accessible to all
            "documentType": document_type or "other",
            "text": text[:500] + ("..." if len(text) > 500 else ""),
        })
        self.save_index()

    def bulk_index(self, documents: List[Dict[str, Any]]):
        """
        Bulk index multiple documents at once (much faster than one-by-one).
        Each dict must have: documentId, text
        Optional keys: caseId, documentType

        Used for loading the Karnataka FIR CSV dataset.
        """
        if not documents:
            return

        texts = [d["text"] for d in documents]
        embeddings = self.model.encode(texts, batch_size=32, show_progress_bar=True)
        self.index.add(np.array(embeddings, dtype=np.float32))

        for d, emb in zip(documents, embeddings):
            self.metadata.append({
                "documentId": d["documentId"],
                "caseId": d.get("caseId", "public"),
                "documentType": d.get("documentType", "other"),
                "text": d["text"][:500] + ("..." if len(d["text"]) > 500 else ""),
            })

        self.save_index()
        print(f"[Search] Bulk indexed {len(documents)} documents. Total: {self.index.ntotal}")

    def query(
        self,
        query_text: str,
        allowed_case_ids: List[str],
        top_k: int = 3,
        document_type_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search with RBAC enforcement.

        Week 4: Real access-scope filtering.
        - If allowed_case_ids is empty [] → return all (admin/unrestricted mode)
        - If allowed_case_ids contains specific IDs → only return matching caseIds
          OR documents with caseId = "public"
        - Optional document_type_filter to narrow results to e.g. only "FIR" docs
        """
        if self.index.ntotal == 0:
            return []

        # Embed query
        query_embedding = self.model.encode([query_text])[0]

        # Fetch extra results to account for RBAC filtering reducing the pool
        fetch_k = min(self.index.ntotal, top_k * 10)
        distances, indices = self.index.search(
            np.array([query_embedding], dtype=np.float32), k=fetch_k
        )

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx == -1 or idx >= len(self.metadata):
                continue

            meta = self.metadata[idx]

            # ── RBAC Access Control ──────────────────────────────────────────
            # Empty allowed_case_ids = unrestricted (admin/system calls)
            # Otherwise: allow "public" docs + docs matching allowed case IDs
            if allowed_case_ids:
                if meta["caseId"] != "public" and meta["caseId"] not in allowed_case_ids:
                    continue  # BLOCKED — user not authorized for this case

            # ── Optional document type filter ────────────────────────────────
            if document_type_filter and meta["documentType"] != document_type_filter:
                continue

            results.append({
                "documentId": meta["documentId"],
                "caseId": meta["caseId"],
                "documentType": meta["documentType"],
                "score": round(float(1 / (1 + dist)), 4),
                "snippet": meta["text"],
            })

            if len(results) >= top_k:
                break

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Returns index statistics for the admin dashboard."""
        type_counts: Dict[str, int] = {}
        case_counts: Dict[str, int] = {}
        for m in self.metadata:
            dt = m.get("documentType", "other")
            cid = m.get("caseId", "public")
            type_counts[dt] = type_counts.get(dt, 0) + 1
            case_counts[cid] = case_counts.get(cid, 0) + 1

        return {
            "totalDocuments": self.index.ntotal,
            "byDocumentType": type_counts,
            "byCaseId": case_counts,
        }
