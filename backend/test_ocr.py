from extractor import extract_image_text


image_path = r"C:\Users\sreem\OneDrive\Desktop\test.png"

text = extract_image_text(image_path)

print("\n===== EXTRACTED TEXT =====\n")
print(text)
