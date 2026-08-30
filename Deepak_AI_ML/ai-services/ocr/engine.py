import pytesseract
from PIL import Image
import io
import fitz  # PyMuPDF
from pathlib import Path


class OCREngine:
    """
    Handles OCR for both image files (JPG/PNG) and PDF files.
    Uses Tesseract OCR — fully offline, no data leaves your infra.
    """

    def extract_from_image_bytes(self, file_bytes: bytes) -> dict:
        """Run OCR on raw image bytes (from FastAPI UploadFile)."""
        image = Image.open(io.BytesIO(file_bytes))
        # Get OCR data with confidence scores
        ocr_data = pytesseract.image_to_data(
            image, output_type=pytesseract.Output.DICT, lang="eng"
        )
        # Build full text
        words = [
            w for w, c in zip(ocr_data["text"], ocr_data["conf"])
            if int(c) > 0 and w.strip()
        ]
        full_text = " ".join(words)
        # Calculate average confidence (only from valid words)
        confs = [int(c) for c in ocr_data["conf"] if int(c) > 0]
        avg_conf = round(sum(confs) / len(confs) / 100, 2) if confs else 0.0

        return {
            "text": full_text,
            "confidence": avg_conf,
            "pages": [1],
        }

    def extract_from_pdf_bytes(self, file_bytes: bytes) -> dict:
        """
        Run OCR on a PDF file.
        First tries native text extraction (for digital PDFs),
        then falls back to Tesseract for scanned/image-based PDFs.
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        all_text = []
        all_pages = []

        for page_num, page in enumerate(doc, start=1):
            # Try native text first (faster)
            text = page.get_text().strip()
            if not text:
                # Scanned page — render to image and OCR it
                pix = page.get_pixmap(dpi=300)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text = pytesseract.image_to_string(img, lang="eng")
            if text.strip():
                all_text.append(text.strip())
                all_pages.append(page_num)

        return {
            "text": "\n\n".join(all_text),
            "confidence": 0.90,  # Native PDF text is highly reliable
            "pages": all_pages,
        }

    def extract(self, file_bytes: bytes, filename: str) -> dict:
        """Auto-detect file type and run appropriate extraction."""
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self.extract_from_pdf_bytes(file_bytes)
        elif ext in [".jpg", ".jpeg", ".png", ".tiff", ".bmp"]:
            return self.extract_from_image_bytes(file_bytes)
        else:
            raise ValueError(f"Unsupported file type: {ext}. Supported: PDF, JPG, PNG, TIFF")
