# ai-service/app/ai/embedder.py — 768-dim text embeddings
# Model: all-mpnet-base-v2 (768-dim, matches Vector(768) in backend DB)
import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME    = "sentence-transformers/all-mpnet-base-v2"
EMBEDDING_DIM = 768

_model = None

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model

def embed(text: str) -> list[float]:
    """Convert text to a 768-dim unit vector. Returns list[float] for JSON serialisation."""
    vec = _get_model().encode([text], normalize_embeddings=True, show_progress_bar=False)
    return vec[0].tolist()

def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in one forward pass."""
    vecs = _get_model().encode(texts, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
    return [v.tolist() for v in vecs]
