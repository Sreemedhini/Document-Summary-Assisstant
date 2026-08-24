# Document Summary Assistant

An AI-powered web application that accepts PDF and image documents and generates concise summaries, key points, and improvement suggestions.

## Features

- PDF and image upload
- Drag-and-drop support
- PDF text extraction
- OCR for scanned documents and images
- AI-powered summarization
- Short, Medium and Long summary options
- Key points extraction
- Improvement suggestions
- Loading and error states
- Responsive user interface

## Technology Stack

### Frontend
- React.js
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- PDF extraction
- OCR
- AI summarization

## Architecture

```text
User
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
PDF Extraction / OCR
  ↓
AI Summarization
  ↓
Summary + Key Points + Suggestions
  ↓
React Frontend