# ============================================================
#  ocr.py  --  SentinelDMS AI Pipeline
#  Layer 1: Document Text Extraction (OCR Engine)
# ============================================================
#
#  What this file does (plain English):
#  A police officer uploads a scanned FIR or a PDF chargesheet.
#  This engine reads that file and returns plain text from it --
#  whether it is a typed PDF, a scanned image, or a photo of
#  a handwritten document. It also works with Tamil and Hindi.
#
#  Libraries used:
#    fitz        -> PyMuPDF  (reads PDF files)
#    pytesseract -> Python wrapper for Tesseract OCR
#    PIL         -> Pillow   (image loading and processing)
#    io          -> built-in, converts raw bytes to file-like objects
#    pathlib     -> built-in, safe cross-platform file path handling
#    langdetect  -> detects whether text is English / Tamil / Hindi
# ============================================================


# -- IMPORTS --------------------------------------------------

import io
# io.BytesIO lets us treat a bytes object like a file on disk
# without actually saving anything to disk. Fast and safe.

import os
# os.path.exists checks if Tesseract is installed at a path

import fitz
# This is PyMuPDF. "fitz" is the legacy name inherited from
# the original MuPDF C library. It opens PDFs at the C level
# so it is MUCH faster than PyPDF2 or pdfplumber.

import pytesseract
# Python wrapper around the Tesseract OCR binary.
# Tesseract is the OCR engine (written in C++).
# pytesseract just calls it and parses the output.

from PIL import Image
# Pillow -- opens image files (PNG, JPG, TIFF).
# PyMuPDF renders a PDF page into a Pillow image
# so Tesseract can read it.

from pathlib import Path
# Path("document.pdf").suffix -> ".pdf"
# Safer than string slicing for file extensions.

from langdetect import detect
# Detects language from a short text sample.
# Returns codes: "en", "ta" (Tamil), "hi" (Hindi)
# Used to pick the right Tesseract language pack.


# -- TESSERACT CONFIGURATION ----------------------------------
#
# Tesseract is a separate binary (not a Python package).
# On Windows it installs to "C:\Program Files\Tesseract-OCR\tesseract.exe"
# On Linux/Mac it is usually on PATH automatically.
# We check both so the code works on any machine in your team.
#
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(TESSERACT_PATH):
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH
    # This line tells pytesseract WHERE the binary is.
    # Without this on Windows, pytesseract throws "TesseractNotFoundError".


# -- LANGUAGE MAPPING -----------------------------------------
#
# Tesseract uses 3-letter language codes defined by ISO 639-2.
# langdetect uses 2-letter ISO 639-1 codes.
# This dict bridges the two so we never pass a wrong code.
#
# Each Tesseract language needs a ".traineddata" file installed:
#   eng.traineddata  -> already included in default install
#   hin.traineddata  -> install: sudo apt install tesseract-ocr-hin
#   tam.traineddata  -> install: sudo apt install tesseract-ocr-tam
#
LANG_MAP: dict[str, str] = {
    "en": "eng",   # English
    "hi": "hin",   # Hindi   (Devanagari script)
    "ta": "tam",   # Tamil   (Tamil script)
}

# When we OCR without pre-knowing the language, we pass ALL three
# to Tesseract at once. Tesseract handles mixed-script documents fine.
# Format: "eng+hin+tam"  (plus-separated)
#
DEFAULT_LANG = "+".join(LANG_MAP.values())   # -> "eng+hin+tam"


# -- HELPER: detect_language ----------------------------------
#
# Before OCR we might already have some text (from a digital PDF).
# We run this to figure out the primary language so we can re-OCR
# with the right language pack for better accuracy.
#
def detect_language(text: str) -> str:
    """
    Takes a sample of text, returns a Tesseract language string.

    Args:
        text: any string -- even 20-30 words is enough for langdetect

    Returns:
        A Tesseract language code like "eng", "hin", "tam",
        or "eng+hin+tam" if detection fails (safe fallback).

    Examples:
        detect_language("yah ek pratham suchna report hai")  -> "hin"
        detect_language("This is a First Information Report") -> "eng"
        detect_language("itu oru mudhal thagaval arikkai")    -> "tam"
    """
    try:
        # langdetect.detect() needs at least ~20 characters.
        # strip() removes leading/trailing whitespace first.
        detected = detect(text.strip())

        # LANG_MAP.get(detected, DEFAULT_LANG):
        #   If detected code is in our map -> return mapped Tesseract code
        #   If it is some other language (e.g. "fr") -> fall back to all 3
        return LANG_MAP.get(detected, DEFAULT_LANG)

    except Exception:
        # langdetect raises LangDetectException on very short or
        # empty strings. We always fall back safely.
        return DEFAULT_LANG


# -- HELPER: image_to_text ------------------------------------
#
# Core OCR call. Takes a Pillow Image object, returns plain text.
# This is the single place where Tesseract is actually called.
# Keeping it separate means we can unit-test OCR in isolation.
#
def image_to_text(image: Image.Image, lang: str = DEFAULT_LANG) -> tuple[str, float]:
    """
    Runs Tesseract OCR on a single Pillow image.

    Args:
        image: a Pillow Image object (RGB mode preferred)
        lang:  Tesseract language string, default is eng+hin+tam

    Returns:
        (text, confidence) -- a tuple of:
            text:       the extracted string
            confidence: float 0.0-1.0 (average word-level confidence)

    How confidence works:
        Tesseract gives each word a confidence score 0-100.
        We average them and divide by 100 to get 0.0-1.0.
        A score < 0.4 means the scan quality is very poor.
    """
    # image_to_data returns a dict with keys:
    #   "text"  -> list of words
    #   "conf"  -> list of confidence scores (int, -1 means non-word)
    #   "level" -> hierarchy level (page/block/para/line/word)
    #
    # output_type=pytesseract.Output.DICT makes it return a Python dict
    # instead of a tab-separated string (much easier to work with).
    #
    data = pytesseract.image_to_data(
        image,
        lang=lang,
        output_type=pytesseract.Output.DICT,
        config="--psm 3",
        # --psm 3 = "Fully automatic page segmentation, but no OSD"
        # This is the default and works best for document pages.
        # Other useful values:
        #   --psm 6  = single uniform block of text
        #   --psm 11 = sparse text (e.g. forms with labels scattered around)
    )

    # Filter out non-word entries (conf == -1) and empty strings
    valid_pairs = [
        (word, int(conf))
        for word, conf in zip(data["text"], data["conf"])
        if int(conf) > 0 and word.strip()
        # int(conf) > 0  filters out layout-detection tokens that are not words
        # word.strip()   filters out whitespace-only entries
    ]

    if not valid_pairs:
        # Nothing found -- image might be blank or too blurry
        return "", 0.0

    # Join words with a space to form the full extracted text
    words  = [pair[0] for pair in valid_pairs]
    confs  = [pair[1] for pair in valid_pairs]

    text       = " ".join(words)
    confidence = round(sum(confs) / len(confs) / 100, 3)
    #             average of all word confidences, scaled to 0-1

    return text, confidence


# -- MAIN CLASS: OCREngine ------------------------------------
#
# This is the class you import everywhere else in the pipeline.
# Usage:
#   engine = OCREngine()
#   result = engine.extract(file_bytes, "fir_scan.pdf")
#   print(result["text"])       # the extracted text
#   print(result["language"])   # "hin", "tam", or "eng"
#   print(result["confidence"]) # 0.87 (higher = better scan quality)
#
class OCREngine:
    """
    Unified OCR engine for SentinelDMS.

    Handles three document types:
      1. Digital PDF  -> text extracted directly via PyMuPDF (no OCR needed, fast)
      2. Scanned PDF  -> each page rendered to image, then Tesseract OCR
      3. Image file   -> directly processed by Tesseract

    Language support: English, Hindi, Tamil (auto-detected).
    """

    # -- METHOD 1: extract_from_image -------------------------
    def extract_from_image(self, file_bytes: bytes, filename: str = "") -> dict:
        """
        OCR a raw image file (JPG, PNG, TIFF, BMP).

        Args:
            file_bytes: raw bytes from the uploaded file
            filename:   original filename (used only for logging)

        Returns:
            dict with keys: text, confidence, language, pages, method
        """
        # io.BytesIO wraps the bytes in a file-like object.
        # Image.open() expects a file path OR a file-like object.
        # We never save anything to disk -- all in memory.
        image = Image.open(io.BytesIO(file_bytes))

        # Convert to RGB. Some images are RGBA (with alpha/transparency)
        # or grayscale. Tesseract works best with RGB.
        # .convert("RGB") is a no-op if already RGB, so always safe to call.
        image = image.convert("RGB")

        # First pass: OCR with all 3 languages to get initial text
        raw_text, _ = image_to_text(image, lang=DEFAULT_LANG)

        # Detect the dominant language from the first pass result
        detected_lang = detect_language(raw_text)

        # Second pass: re-OCR with the specific detected language.
        # Why? Tesseract is more accurate when it focuses on one script.
        # Running "eng+hin+tam" on a pure Hindi document works but
        # "hin" alone gives ~5-10% better accuracy.
        if detected_lang != DEFAULT_LANG:
            final_text, confidence = image_to_text(image, lang=detected_lang)
        else:
            final_text, confidence = raw_text, _

        return {
            "text":       final_text,
            "confidence": confidence,
            "language":   detected_lang,   # "hin", "tam", "eng", or "eng+hin+tam"
            "pages":      [1],             # images are always 1 page
            "method":     "tesseract_image",
        }

    # -- METHOD 2: extract_from_pdf ---------------------------
    def extract_from_pdf(self, file_bytes: bytes) -> dict:
        """
        Extract text from a PDF file.

        Strategy:
          - For each page, first try PyMuPDF native extraction (instant).
          - If the page has no text (i.e. it is a scanned image), render
            the page to a Pillow image at 300 DPI and run Tesseract on it.
          - Auto-detect language from the first page with text.

        Args:
            file_bytes: raw PDF bytes

        Returns:
            dict with keys: text, confidence, language, pages, method
        """
        # fitz.open(stream=..., filetype="pdf"):
        #   stream=  -> pass bytes directly instead of a file path
        #   filetype -> tell PyMuPDF it is a PDF (do not guess from extension)
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        all_text_parts: list[str]   = []  # one entry per page
        all_pages:      list[int]   = []  # page numbers that had content
        all_confs:      list[float] = []
        detected_lang   = DEFAULT_LANG
        lang_detected   = False           # flag: stop detecting after first page
        method_used     = "pymupdf_native"

        for page_num, page in enumerate(doc, start=1):
            # -- NATIVE TEXT EXTRACTION -----------------------
            # page.get_text() returns the text embedded in the PDF.
            # For typed/digital PDFs this is instant and perfect accuracy.
            # For scanned PDFs it returns an empty string.
            native_text = page.get_text().strip()

            if native_text:
                # Digital PDF page -- use the native text directly
                page_text = native_text
                page_conf = 0.99   # native PDF text is 99% reliable
                method_used = "pymupdf_native"

                # Detect language from first page that has text
                if not lang_detected:
                    detected_lang = detect_language(native_text)
                    lang_detected = True

            else:
                # Scanned page -- must OCR it
                # Render the PDF page to a pixel image at 300 DPI.
                # 300 DPI is the sweet spot: good enough for Tesseract,
                # not so large it makes OCR painfully slow.
                #
                # fitz.Matrix(scale_x, scale_y) sets the scale factor.
                # 72 DPI is the default PDF unit. 300/72 = 4.17 scale.
                zoom   = 300 / 72
                matrix = fitz.Matrix(zoom, zoom)
                pix    = page.get_pixmap(matrix=matrix, alpha=False)
                # alpha=False -> no transparency channel -> pure RGB

                # Convert the PyMuPDF Pixmap to a Pillow Image.
                # pix.samples is the raw RGB bytes of the rendered image.
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # OCR the rendered image
                if not lang_detected:
                    # We do not know the language yet -- use all 3
                    page_text, page_conf = image_to_text(img, lang=DEFAULT_LANG)
                    detected_lang = detect_language(page_text)
                    lang_detected = True
                    # Re-OCR with specific language for better accuracy
                    if detected_lang != DEFAULT_LANG:
                        page_text, page_conf = image_to_text(img, lang=detected_lang)
                else:
                    # Language already known from earlier pages
                    page_text, page_conf = image_to_text(img, lang=detected_lang)

                method_used = "tesseract_pdf"

            if page_text.strip():
                all_text_parts.append(page_text.strip())
                all_pages.append(page_num)
                all_confs.append(page_conf)

        doc.close()  # Always close the fitz document to free memory

        # Average confidence across all pages
        avg_conf = round(sum(all_confs) / len(all_confs), 3) if all_confs else 0.0

        # Join pages with double newline -- easy to spot page boundaries
        full_text = "\n\n".join(all_text_parts)

        return {
            "text":       full_text,
            "confidence": avg_conf,
            "language":   detected_lang,
            "pages":      all_pages,
            "method":     method_used,
        }

    # -- METHOD 3: extract (public entry point) ---------------
    def extract(self, file_bytes: bytes, filename: str) -> dict:
        """
        Auto-detect file type and route to the right extraction method.

        This is the ONLY method you call from outside this file.

        Args:
            file_bytes: raw bytes of the uploaded document
            filename:   original filename WITH extension ("fir_scan.pdf")

        Returns:
            {
              "text":       str,   <- the full extracted text
              "confidence": float, <- 0.0 to 1.0
              "language":   str,   <- "eng", "hin", "tam", or "eng+hin+tam"
              "pages":      list,  <- [1, 2, 3, ...] pages with content
              "method":     str,   <- "pymupdf_native" | "tesseract_pdf" | "tesseract_image"
            }

        Raises:
            ValueError if the file type is not supported.
        """
        # Path(filename).suffix -> ".pdf", ".jpg", etc.
        # .lower() -> normalise "FIR.PDF" -> ".pdf"
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            return self.extract_from_pdf(file_bytes)

        elif ext in {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp"}:
            return self.extract_from_image(file_bytes, filename)

        else:
            # Raise a clear error -- never silently fail on unknown formats
            raise ValueError(
                f"Unsupported file type: '{ext}'. "
                f"Supported formats: PDF, JPG, PNG, TIFF, BMP"
            )


# -- QUICK TEST (run this file directly to verify) ------------
#
# python engine.py my_document.pdf
#
# This block ONLY runs when you execute the file directly.
# It does NOT run when imported by main.py or any other module.
# That is what  if __name__ == "__main__":  means.
#
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python engine.py <path_to_document>")
        print("Example: python engine.py fir_scan.pdf")
        sys.exit(1)

    filepath = sys.argv[1]
    with open(filepath, "rb") as f:   # "rb" = read binary (raw bytes)
        data = f.read()

    engine = OCREngine()
    result = engine.extract(data, filepath)

    print(f"\n{'='*50}")
    print(f"File      : {filepath}")
    print(f"Method    : {result['method']}")
    print(f"Language  : {result['language']}")
    print(f"Pages     : {result['pages']}")
    print(f"Confidence: {result['confidence']}")
    print(f"{'='*50}")
    print(result["text"][:1000])   # First 1000 chars only
    print(f"{'='*50}\n")
