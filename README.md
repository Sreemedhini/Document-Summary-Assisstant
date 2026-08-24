# Document Summary Assistant

An AI-powered web application that analyzes PDF and image documents and generates concise, structured summaries, key points, and improvement suggestions.

## Overview

Document Summary Assistant allows users to upload documents and obtain useful insights without manually reading the entire document.

The application supports both PDF documents and image-based documents such as scanned pages. It extracts the text from the uploaded document and processes the extracted content to generate an AI-powered summary.

Users can choose between three summary lengths:

- **Short** – Quick overview
- **Medium** – Balanced detail
- **Long** – Detailed analysis

The generated results include:

- AI Summary
- Key Points
- Improvement Suggestions

## Features

### 1. Document Upload

- Upload PDF files
- Upload PNG, JPG, and JPEG images
- Drag-and-drop file upload
- File picker support
- Maximum file size of 10 MB
- Client-side file type validation

### 2. Text Extraction

- Extracts text from PDF documents
- Uses OCR for image/scanned documents
- Processes extracted content before summary generation

### 3. AI Summary Generation

The application generates:

- Concise document summaries
- Important key points
- Main ideas from the document
- Improvement suggestions

Users can select one of three summary lengths:

- Short
- Medium
- Long

### 4. User Interface

The application provides:

- Clean and simple interface
- Drag-and-drop upload area
- Summary length selection
- Loading indicator during processing
- Error messages for invalid uploads or backend failures
- Structured presentation of generated results
- Responsive layout for smaller screens

## Technology Stack

### Frontend

- React
- JavaScript
- CSS
- Vite

### Backend

- Python
- FastAPI

### Document Processing

- PDF text extraction
- OCR for image documents
- Text preprocessing and cleaning

### AI Processing

The backend integrates AI-based text processing to generate summaries, key points, and improvement suggestions.

## Project Structure

```text
Document-Summary-Assistant/
│
├── backend/
│   ├── extractor.py
│   ├── main.py
│   ├── requirements.txt
│   ├── test_ocr.py
│   ├── test_pdf.py
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── .gitignore
├── README.md
└── ...