# backend/app/services/ocr_service.py
# ============================================================
#  OCR Service — thin business-logic wrapper around app/ai/ocr.py
#  Author: Deepak (AI/ML team member)
#
#  Called by: document_service.py after file upload to MinIO
#             The OCR text is stored in document.ocr_text (DB column)
#
#  Why a separate service file?
#    - ocr.py (in app/ai/) is a pure function module — no FastAPI, no DB
#    - ocr_service.py adds business logic: logging, error handling,
#      language metadata, confidence thresholds
# ============================================================

import logging
from typing import Optional

from app.ai import ocr as ocr_engine

logger = logging.getLogger(__name__)

# Documents with confidence below this threshold get flagged for manual review
CONFIDENCE_THRESHOLD = 0.40


def process_document(file_bytes: bytes, filename: str) -> dict:
    """
    Extract text from an uploaded document file.

    Called by document_service.py right after the file is saved to MinIO.
    The result dict is used to populate document DB columns.

    Args:
        file_bytes: raw bytes of the uploaded file
        filename:   original filename (needs extension for routing)

    Returns:
        {
          "text":         str,   <- store in document.ocr_text
          "confidence":   float, <- 0.0-1.0, flag if < 0.40
          "language":     str,   <- "eng" | "hin" | "tam"
          "pages":        list,  <- [1, 2, 3] pages with content
          "method":       str,   <- "pymupdf_native" | "tesseract_pdf" | "tesseract_image"
          "needs_review": bool,  <- True if confidence < threshold
        }

    Raises:
        ValueError: for unsupported file types
        RuntimeError: if OCR fails completely

    Example (in document_service.py):
        ocr_result = ocr_service.process_document(file_bytes, upload.filename)
        doc.ocr_text  = ocr_result["text"]
        doc.language  = ocr_result["language"]
        if ocr_result["needs_review"]:
            doc.status = "NEEDS_REVIEW"
    """
    logger.info(f"Starting OCR: {filename} ({len(file_bytes)/1024:.1f} KB)")

    try:
        result = ocr_engine.extract(file_bytes, filename)
    except ValueError as e:
        # Unsupported file type — re-raise directly
        raise
    except Exception as e:
        logger.error(f"OCR failed for {filename}: {e}")
        raise RuntimeError(f"OCR processing failed: {e}") from e

    confidence = result.get("confidence", 0.0)
    needs_review = confidence < CONFIDENCE_THRESHOLD and confidence > 0.0

    if needs_review:
        logger.warning(
            f"Low OCR confidence ({confidence:.2f}) for {filename}. "
            f"Document flagged for manual review."
        )
    else:
        logger.info(
            f"OCR complete: {filename} | "
            f"lang={result['language']} | "
            f"pages={result['pages']} | "
            f"confidence={confidence:.2f} | "
            f"method={result['method']}"
        )

    return {
        **result,
        "needs_review": needs_review,
    }


def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """
    Convenience wrapper for PDF-only extraction.
    Matches the function name used in the implementation plan.
    """
    return ocr_engine.extract_from_pdf(file_bytes)


def extract_text_from_image(file_bytes: bytes) -> dict:
    """
    Convenience wrapper for image-only extraction.
    Matches the function name used in the implementation plan.
    """
    return ocr_engine.extract_from_image(file_bytes)
