import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import io

class OCRService:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        text = ""
        try:
            pdf = fitz.open(stream=file_bytes, filetype="pdf")
            for page in pdf:
                text += page.get_text()
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
        return text.strip()

    @staticmethod
    def extract_text_from_image(file_bytes: bytes) -> str:
        text = ""
        try:
            image = Image.open(io.BytesIO(file_bytes))
            text = pytesseract.image_to_string(image)
        except Exception as e:
            print(f"Error extracting text from image: {e}")
        return text.strip()

    @staticmethod
    def process_document(file_bytes: bytes, file_type: str) -> str:
        if "pdf" in file_type.lower():
            return OCRService.extract_text_from_pdf(file_bytes)
        elif "image" in file_type.lower() or file_type.lower() in ["image/png", "image/jpeg"]:
            return OCRService.extract_text_from_image(file_bytes)
        return ""
