# backend/app/ai/ocr.py
# OCR engine: PyMuPDF (digital PDFs) + Tesseract (scanned + Hindi + Tamil)
import io, os, re
from pathlib import Path
from PIL import Image
import fitz
import pytesseract
from langdetect import detect

_TESS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(_TESS_PATH):
    pytesseract.pytesseract.tesseract_cmd = _TESS_PATH

LANG_MAP     = {"en": "eng", "hi": "hin", "ta": "tam"}
DEFAULT_LANG = "+".join(LANG_MAP.values())   # "eng+hin+tam"


def _detect_lang(text: str) -> str:
    try:
        return LANG_MAP.get(detect(text.strip()), DEFAULT_LANG)
    except Exception:
        return DEFAULT_LANG


def _img_to_text(image: Image.Image, lang: str = DEFAULT_LANG) -> tuple[str, float]:
    data = pytesseract.image_to_data(
        image, lang=lang,
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


def extract_from_image(file_bytes: bytes) -> dict:
    """OCR a raw image (PNG / JPG / TIFF). Returns {text, confidence, language, pages, method}."""
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    raw, _  = _img_to_text(img, DEFAULT_LANG)
    lang    = _detect_lang(raw)
    text, conf = _img_to_text(img, lang) if lang != DEFAULT_LANG else (raw, _)
    return {"text": text, "confidence": conf, "language": lang, "pages": [1], "method": "tesseract_image"}


def extract_from_pdf(file_bytes: bytes) -> dict:
    """Smart PDF extraction: native text for digital PDFs, Tesseract for scanned."""
    doc   = fitz.open(stream=file_bytes, filetype="pdf")
    parts, pages, confs = [], [], []
    lang, lang_found = DEFAULT_LANG, False
    method = "pymupdf_native"

    for n, page in enumerate(doc, 1):
        native = page.get_text().strip()
        if native:
            if not lang_found:
                lang = _detect_lang(native)
                lang_found = True
            parts.append(native); pages.append(n); confs.append(0.99)
        else:
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72), alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            if not lang_found:
                t, c   = _img_to_text(img, DEFAULT_LANG)
                lang   = _detect_lang(t)
                lang_found = True
                if lang != DEFAULT_LANG:
                    t, c = _img_to_text(img, lang)
            else:
                t, c = _img_to_text(img, lang)
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


def extract(file_bytes: bytes, filename: str) -> dict:
    """Auto-route by file extension. Raises ValueError for unsupported types."""
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_from_pdf(file_bytes)
    elif ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}:
        return extract_from_image(file_bytes)
    raise ValueError(f"Unsupported file type: '{ext}'")
