# backend/app/ai/embedder.py
# 768-dim text embeddings using all-mpnet-base-v2
# Matches the pgvector column: embedding Vector(768) in document model
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME    = "sentence-transformers/all-mpnet-base-v2"
EMBEDDING_DIM = 768   # matches Vector(768) in document.py model

_model = None

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed(text: str) -> list[float]:
    """
    Convert text to a 768-dim unit vector.

    Returns a plain Python list[float] so it can be:
      - Stored directly into pgvector column (SQLAlchemy accepts list[float])
      - Added to FAISS index (convert to np.array first)
      - Returned in API responses as JSON

    Args:
        text: any string (will be truncated to model max internally)

    Returns:
        list of 768 floats, L2-normalized (unit vector)
    """
    model = _get_model()
    vec   = model.encode(
        [text],
        normalize_embeddings=True,   # L2 norm = 1 (cosine sim == L2 dist)
        show_progress_bar=False,
    )
    return vec[0].tolist()   # numpy float32 array -> Python list[float]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts efficiently in one forward pass."""
    model = _get_model()
    vecs  = model.encode(
        texts,
        normalize_embeddings=True,
        batch_size=32,
        show_progress_bar=False,
    )
    return [v.tolist() for v in vecs]
