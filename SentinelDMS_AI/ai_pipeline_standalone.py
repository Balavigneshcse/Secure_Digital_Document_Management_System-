# ============================================================
#  ai_pipeline.py  --  SentinelDMS Unified AI Pipeline
#  Single-file version for direct FastAPI integration
# ============================================================
#
#  DROP THIS FILE into any FastAPI project and import it.
#
#  Install dependencies first:
#    pip install pymupdf pytesseract pillow langdetect
#               transformers sentence-transformers faiss-cpu
#               torch numpy
#
#  Tesseract binary:
#    Windows: https://github.com/UB-Mannheim/tesseract/wiki
#    Ubuntu:  sudo apt install tesseract-ocr tesseract-ocr-hin tesseract-ocr-tam
#
#  FastAPI usage example:
#
#    from fastapi import FastAPI, UploadFile
#    from ai_pipeline import AIPipeline
#
#    app = FastAPI()
#    ai  = AIPipeline()   # loads models lazily on first call
#
#    @app.post("/documents/process")
#    async def process(file: UploadFile, case_id: str = "public"):
#        raw = await file.read()
#        return ai.process_document(raw, file.filename, case_id=case_id)
#
#    @app.post("/search")
#    async def search(query: str, allowed_cases: list[str] = ["*"]):
#        return ai.search(query, allowed_cases)
#
#    @app.post("/cases/{case_id}/summary")
#    async def summarize(case_id: str, docs: list[dict]):
#        return ai.summarize_case(docs)
#
# ============================================================

from __future__ import annotations

# ── Standard library ─────────────────────────────────────────
import io
import json
import os
import re
from pathlib import Path
from typing import List, Optional

# ── Third-party ──────────────────────────────────────────────
import faiss
import numpy as np
import pytesseract
from langdetect import detect
from PIL import Image
import fitz   # PyMuPDF
from sentence_transformers import SentenceTransformer
from transformers import pipeline as hf_pipeline


# =============================================================
# SECTION 1 — OCR
# =============================================================

_TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = _TESSERACT_PATH

_LANG_MAP = {"en": "eng", "hi": "hin", "ta": "tam"}
_DEFAULT_LANG = "+".join(_LANG_MAP.values())   # "eng+hin+tam"


def _detect_language(text: str) -> str:
    try:
        return _LANG_MAP.get(detect(text.strip()), _DEFAULT_LANG)
    except Exception:
        return _DEFAULT_LANG


def _image_to_text(image: Image.Image, lang: str = _DEFAULT_LANG) -> tuple[str, float]:
    data = pytesseract.image_to_data(
        image,
        lang=lang,
        output_type=pytesseract.Output.DICT,
        config="--psm 3",
    )
    pairs = [
        (w, int(c))
        for w, c in zip(data["text"], data["conf"])
        if int(c) > 0 and w.strip()
    ]
    if not pairs:
        return "", 0.0
    text = " ".join(p[0] for p in pairs)
    conf = round(sum(p[1] for p in pairs) / len(pairs) / 100, 3)
    return text, conf


def _ocr_image(file_bytes: bytes) -> dict:
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    raw, _ = _image_to_text(img, _DEFAULT_LANG)
    lang   = _detect_language(raw)
    text, conf = _image_to_text(img, lang) if lang != _DEFAULT_LANG else (raw, _)
    return {"text": text, "confidence": conf, "language": lang, "pages": [1], "method": "tesseract_image"}


def _ocr_pdf(file_bytes: bytes) -> dict:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    parts, pages, confs = [], [], []
    lang, lang_found = _DEFAULT_LANG, False
    method = "pymupdf_native"

    for n, page in enumerate(doc, 1):
        native = page.get_text().strip()
        if native:
            if not lang_found:
                lang = _detect_language(native)
                lang_found = True
            parts.append(native); pages.append(n); confs.append(0.99)
        else:
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            if not lang_found:
                t, c = _image_to_text(img, _DEFAULT_LANG)
                lang = _detect_language(t)
                lang_found = True
                if lang != _DEFAULT_LANG:
                    t, c = _image_to_text(img, lang)
            else:
                t, c = _image_to_text(img, lang)
            if t.strip():
                parts.append(t.strip()); pages.append(n); confs.append(c)
            method = "tesseract_pdf"

    doc.close()
    return {
        "text":       "\n\n".join(parts),
        "confidence": round(sum(confs)/len(confs), 3) if confs else 0.0,
        "language":   lang,
        "pages":      pages,
        "method":     method,
    }


def run_ocr(file_bytes: bytes, filename: str) -> dict:
    """Extract text from a PDF or image file. Returns dict with text, confidence, language, pages, method."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _ocr_pdf(file_bytes)
    elif ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}:
        return _ocr_image(file_bytes)
    raise ValueError(f"Unsupported file type: '{ext}'")


# =============================================================
# SECTION 2 — CLASSIFIER
# =============================================================

_CANDIDATE_LABELS = [
    "First Information Report", "Charge Sheet", "Witness Statement",
    "Forensic Report", "Court Filing", "Medical Report", "Arrest Warrant", "Other Document",
]
_LABEL_CODE = {
    "First Information Report": "FIR", "Charge Sheet": "CHARGESHEET",
    "Witness Statement": "WITNESS_STATEMENT", "Forensic Report": "FORENSIC_REPORT",
    "Court Filing": "COURT_FILING", "Medical Report": "MEDICAL_REPORT",
    "Arrest Warrant": "ARREST_WARRANT", "Other Document": "OTHER",
}
_RE_IPC  = re.compile(r"[Ss]ection\s+(\d+[A-Z]?(?:\s*[A-Za-z]+)?)\s+(?:of\s+)?(?:IPC|I\.P\.C\.?|CrPC|BNS|POCSO|IT\s*Act)", re.I)
_RE_CASE = re.compile(r"(?:Case\s+No\.?|FIR\s+No\.?|CR\s+No\.?)\s*:?\s*([\w/\-]+)", re.I)
_RE_DATE = re.compile(r"\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b", re.I)
_RE_NAME = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b")
_NAME_SKIP = {"First Information", "Police Station", "Case No", "Charge Sheet", "Witness Statement", "Investigating Officer"}
_clf_pipe = None

def _get_clf_pipe():
    global _clf_pipe
    if _clf_pipe is None:
        _clf_pipe = hf_pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)
    return _clf_pipe

def _extract_entities(text: str) -> dict:
    names = [n for n in _RE_NAME.findall(text) if len(n.split())>=2 and not any(s in n for s in _NAME_SKIP)]
    return {
        "ipcSections": list(set(_RE_IPC.findall(text)))[:10],
        "caseNumbers": list(set(_RE_CASE.findall(text)))[:5],
        "dates":       list(set(_RE_DATE.findall(text)))[:10],
        "names":       list(dict.fromkeys(names))[:10],
    }

def run_classifier(text: str) -> dict:
    """Classify document type and extract entities. Returns documentType, confidence, allScores, entities."""
    pipe   = _get_clf_pipe()
    sample = " ".join(text.split()[:512])
    result = pipe(sample, candidate_labels=_CANDIDATE_LABELS, multi_label=False)
    return {
        "documentType": _LABEL_CODE.get(result["labels"][0], "OTHER"),
        "confidence":   round(result["scores"][0], 3),
        "allScores":    {_LABEL_CODE.get(l,"OTHER"): round(s,3) for l,s in zip(result["labels"],result["scores"])},
        "entities":     _extract_entities(text),
    }


# =============================================================
# SECTION 3 — SEMANTIC SEARCH (FAISS)
# =============================================================

_EMBED_DIM   = 384
_INDEX_PATH  = Path("data/faiss.index")
_META_PATH   = Path("data/faiss_meta.json")
_embed_model = None
_faiss_index = None
_faiss_meta: list[dict] = []


def _get_embed_model() -> SentenceTransformer:
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model


def _get_index():
    global _faiss_index, _faiss_meta
    if _faiss_index is None:
        if _INDEX_PATH.exists() and _META_PATH.exists():
            _faiss_index = faiss.read_index(str(_INDEX_PATH))
            _faiss_meta  = json.loads(_META_PATH.read_text(encoding="utf-8"))
        else:
            _faiss_index = faiss.IndexFlatL2(_EMBED_DIM)
            _faiss_meta  = []
    return _faiss_index, _faiss_meta


def _save_index():
    _INDEX_PATH.parent.mkdir(exist_ok=True)
    faiss.write_index(_faiss_index, str(_INDEX_PATH))
    _META_PATH.write_text(json.dumps(_faiss_meta, ensure_ascii=False, indent=2), encoding="utf-8")


def _embed_text(text: str) -> np.ndarray:
    return _get_embed_model().encode([text], normalize_embeddings=True).astype("float32")


def index_document(document_id: str, text: str, case_id: str = "public", document_type: str = "OTHER", case_title: Optional[str] = None) -> None:
    """Add a document to the FAISS index. Call after OCR + classify."""
    idx, meta = _get_index()
    vec = _embed_text(" ".join(text.split()[:200]))
    idx.add(vec)
    meta.append({"documentId": document_id, "caseId": case_id, "documentType": document_type, "caseTitle": case_title, "snippet": text[:400]})
    _save_index()


def run_search(query_text: str, allowed_case_ids: List[str], top_k: int = 5, document_type_filter: Optional[str] = None) -> List[dict]:
    """Semantic search over indexed documents. Pass allowed_case_ids=["*"] for no RBAC filter."""
    idx, meta = _get_index()
    if idx.ntotal == 0:
        return []
    vec = _embed_text(query_text)
    distances, indices = idx.search(vec, min(top_k * 5, idx.ntotal))
    results = []
    for dist, i in zip(distances[0], indices[0]):
        if i < 0 or i >= len(meta):
            continue
        m = meta[i]
        if "*" not in allowed_case_ids and m["caseId"] not in allowed_case_ids:
            continue
        if document_type_filter and m["documentType"] != document_type_filter:
            continue
        results.append({"documentId": m["documentId"], "caseId": m["caseId"], "documentType": m["documentType"], "score": round(1.0/(1.0+dist), 3), "snippet": m["snippet"]})
        if len(results) >= top_k:
            break
    return results


# =============================================================
# SECTION 4 — SUMMARIZER
# =============================================================

_summ_pipe = None

def _get_summ_pipe():
    global _summ_pipe
    if _summ_pipe is None:
        _summ_pipe = hf_pipeline("summarization", model="sshleifer/distilbart-cnn-12-6", device=-1, truncation=True)
    return _summ_pipe


def run_summarize(text: str, max_length: int = 200, min_length: int = 50) -> dict:
    """Summarize a single document's text."""
    words = text.split()
    if len(words) < 30:
        return {"summary": text.strip(), "original_length": len(words), "summary_length": len(words), "compression_ratio": 1.0}
    truncated = " ".join(words[:900])
    result = _get_summ_pipe()(truncated, max_length=max_length, min_length=min_length, do_sample=False)
    summary = result[0]["summary_text"].strip()
    return {"summary": summary, "original_length": len(words), "summary_length": len(summary.split()), "compression_ratio": round(len(summary.split())/max(len(words),1), 2)}


def run_summarize_case(documents: List[dict]) -> dict:
    """
    Summarize an entire case.
    documents = [{"text": "...", "documentType": "FIR"}, ...]
    """
    if not documents:
        return {"overallSummary": "No documents.", "byDocumentType": {}, "totalDocuments": 0}
    by_type: dict[str, list[str]] = {}
    for doc in documents:
        by_type.setdefault(doc.get("documentType","OTHER"), []).append(doc.get("text",""))
    per_type, type_summaries = {}, []
    for dtype, texts in by_type.items():
        combined = " ".join(" ".join(t.split()[:450]) for t in texts)
        r = run_summarize(combined, max_length=130, min_length=20)
        per_type[dtype] = r["summary"]
        type_summaries.append(f"{dtype}: {r['summary']}")
    overall = run_summarize(" ".join(type_summaries))["summary"] if len(type_summaries)>1 else list(per_type.values())[0]
    return {"overallSummary": overall, "byDocumentType": per_type, "totalDocuments": len(documents)}


# =============================================================
# SECTION 5 — UNIFIED PIPELINE CLASS
# =============================================================

class AIPipeline:
    """
    One-stop class that ties all AI modules together.
    Instantiate once in your FastAPI app (as a module-level variable).

    All models are lazy-loaded -- they load on first call, not on startup.
    """

    def process_document(
        self,
        file_bytes: bytes,
        filename: str,
        document_id: str = "",
        case_id: str = "public",
        case_title: Optional[str] = None,
        auto_index: bool = True,
    ) -> dict:
        """
        Full pipeline: OCR -> Classify -> Index -> Return.

        Args:
            file_bytes:   raw bytes from FastAPI UploadFile.read()
            filename:     original filename (needs extension)
            document_id:  UUID to store in the index (use str(uuid4()) if empty)
            case_id:      case this document belongs to (for RBAC)
            case_title:   human-readable case name
            auto_index:   automatically add to FAISS after processing

        Returns:
            {
              "ocr":        { text, confidence, language, pages, method },
              "classifier": { documentType, confidence, allScores, entities },
              "indexed":    True/False
            }
        """
        import uuid as _uuid
        if not document_id:
            document_id = str(_uuid.uuid4())

        ocr_result  = run_ocr(file_bytes, filename)
        clf_result  = run_classifier(ocr_result["text"])

        indexed = False
        if auto_index and ocr_result["text"].strip():
            index_document(
                document_id  = document_id,
                text         = ocr_result["text"],
                case_id      = case_id,
                document_type= clf_result["documentType"],
                case_title   = case_title,
            )
            indexed = True

        return {
            "documentId": document_id,
            "ocr":        ocr_result,
            "classifier": clf_result,
            "indexed":    indexed,
        }

    def search(self, query: str, allowed_case_ids: List[str], top_k: int = 5, document_type_filter: Optional[str] = None) -> List[dict]:
        """Semantic search. Pass allowed_case_ids=['*'] to search all."""
        return run_search(query, allowed_case_ids, top_k, document_type_filter)

    def summarize(self, text: str, max_length: int = 200) -> dict:
        """Summarize a single document text."""
        return run_summarize(text, max_length=max_length)

    def summarize_case(self, documents: List[dict]) -> dict:
        """Summarize multiple documents as a case. Each doc: {'text':..., 'documentType':...}"""
        return run_summarize_case(documents)
