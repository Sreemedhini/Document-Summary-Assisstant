import pymupdf
import pytesseract

from PIL import Image


# Windows Tesseract installation path
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_pdf_text(file_path):
    document = pymupdf.open(file_path)

    text = ""

    for page in document:
        text += page.get_text()

    document.close()

    return text.strip()


def extract_image_text(file_path):
    image = Image.open(file_path)

    text = pytesseract.image_to_string(image)

    return text.strip()