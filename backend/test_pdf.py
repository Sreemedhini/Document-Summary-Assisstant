from extractor import extract_pdf_text


pdf_path = r"C:\Users\sreem\OneDrive\Desktop\test.pdf"

text = extract_pdf_text(pdf_path)

print("\n===== EXTRACTED PDF TEXT =====\n")
print(text)
