# backend/app/ai/summarizer.py
# Case summarization using distilBART-CNN
# Replaces RAG from original plan — faster, no LLM required
from transformers import pipeline as hf_pipeline

MODEL_NAME = "sshleifer/distilbart-cnn-12-6"   # 300MB, 3x faster than bart-large-cnn
# Switch to "facebook/bart-large-cnn" for higher quality

_pipe = None

def _get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = hf_pipeline(
            "summarization",
            model=MODEL_NAME,
            device=-1,       # CPU; change to 0 for GPU
            truncation=True,
        )
    return _pipe


def summarize(text: str, max_length: int = 200, min_length: int = 50) -> dict:
    """
    Summarize a single document.

    Args:
        text:       document text (from OCR or DB)
        max_length: max output tokens
        min_length: min output tokens (prevents 1-sentence outputs)

    Returns:
        {summary, original_length, summary_length, compression_ratio}
    """
    words = text.split()
    if len(words) < 30:
        return {
            "summary": text.strip(),
            "original_length": len(words),
            "summary_length":  len(words),
            "compression_ratio": 1.0,
        }
    truncated = " ".join(words[:900])
    result    = _get_pipe()(truncated, max_length=max_length, min_length=min_length, do_sample=False)
    summary   = result[0]["summary_text"].strip()
    return {
        "summary":           summary,
        "original_length":   len(words),
        "summary_length":    len(summary.split()),
        "compression_ratio": round(len(summary.split()) / max(len(words), 1), 2),
    }


def summarize_case(documents: list[dict]) -> dict:
    """
    Hierarchical case summary from multiple documents.

    Args:
        documents: [{"text": "...", "documentType": "FIR"}, ...]

    Returns:
        {overallSummary, byDocumentType, totalDocuments}
    """
    if not documents:
        return {"overallSummary": "No documents.", "byDocumentType": {}, "totalDocuments": 0}

    # Group texts by document type
    by_type: dict[str, list[str]] = {}
    for doc in documents:
        by_type.setdefault(doc.get("documentType","OTHER"), []).append(doc.get("text",""))

    per_type, summaries = {}, []
    for dtype, texts in by_type.items():
        combined  = " ".join(" ".join(t.split()[:450]) for t in texts)
        r         = summarize(combined, max_length=130, min_length=20)
        per_type[dtype] = r["summary"]
        summaries.append(f"{dtype}: {r['summary']}")

    if len(summaries) == 1:
        overall = list(per_type.values())[0]
    else:
        overall = summarize(" ".join(summaries), max_length=200, min_length=50)["summary"]

    return {
        "overallSummary":  overall,
        "byDocumentType":  per_type,
        "totalDocuments":  len(documents),
    }
