import os
import tempfile

from dotenv import load_dotenv
from google import genai

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_pdf_text, extract_image_text


load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not configured")


client = genai.Client(api_key=GEMINI_API_KEY)


app = FastAPI(
    title="Document Summary Assistant",
    description="API for document extraction and summarization",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Document Summary Assistant API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


@app.post("/extract")
async def extract_document(file: UploadFile = File(...)):

    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, PNG, JPG or JPEG."
        )

    file_extension = os.path.splitext(file.filename)[1]

    contents = await file.read()

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum size is 10 MB."
        )

    temporary_file = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension
        ) as temp:
            temp.write(contents)
            temporary_file = temp.name

        if file.content_type == "application/pdf":
            extracted_text = extract_pdf_text(temporary_file)
        else:
            extracted_text = extract_image_text(temporary_file)

        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="No readable text could be extracted from the document."
            )

        return {
            "filename": file.filename,
            "content_type": file.content_type,
            "text": extracted_text
        }

    finally:
        if temporary_file and os.path.exists(temporary_file):
            os.remove(temporary_file)


@app.post("/summarize")
async def summarize_document(
    file: UploadFile = File(...),
    summary_length: str = "medium"
):

    allowed_types = {
        "application/pdf",
        "image/png",
        "image/jpeg"
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF, PNG, JPG or JPEG."
        )

    # Validate summary length
    summary_length = summary_length.lower().strip()

    if summary_length not in {"short", "medium", "long"}:
        summary_length = "medium"

    file_extension = os.path.splitext(file.filename)[1]

    contents = await file.read()

    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File is too large. Maximum size is 10 MB."
        )

    temporary_file = None

    try:

        # ---------------------------------------------------------
        # 1. Save uploaded file temporarily
        # ---------------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=file_extension
        ) as temp:
            temp.write(contents)
            temporary_file = temp.name

        # ---------------------------------------------------------
        # 2. Extract document text
        # ---------------------------------------------------------

        if file.content_type == "application/pdf":
            extracted_text = extract_pdf_text(temporary_file)
        else:
            extracted_text = extract_image_text(temporary_file)

        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="No readable text could be extracted from the document."
            )

        # ---------------------------------------------------------
        # 3. Different instructions for each summary length
        # ---------------------------------------------------------

        if summary_length == "short":

            length_instruction = """
Create a VERY CONCISE executive summary.

Requirements:
- Target approximately 60-90 words.
- Use one compact paragraph.
- State the document's main purpose.
- Include only the most important facts.
- Include the main conclusion, outcome, or expectation when present.
- Ignore minor details and secondary information.
- Do not describe every section of the document.
- The summary should be readable in approximately 20 seconds.
"""

        elif summary_length == "medium":

            length_instruction = """
Create a BALANCED professional summary.

Requirements:
- Target approximately 130-180 words.
- Use 2-3 concise paragraphs.
- Explain the document's purpose and context.
- Cover the major requirements, features, processes, or ideas.
- Include important dates, numbers, deliverables, or constraints
  when they are present.
- Include important technical or operational details.
- Include the main outcome, expectation, or conclusion.
- Include supporting information that would be omitted from Short.
- Do not include every minor detail.
- Avoid repeating the same information.
"""

        else:

            length_instruction = """
Create a DETAILED professional summary.

Requirements:
- Target approximately 250-350 words.
- Use several clear, well-organized paragraphs.
- Explain the document's purpose and context.
- Cover the major sections and their important ideas.
- Cover important requirements, features, processes,
  technical expectations, deliverables, deadlines,
  and evaluation criteria when present.
- Preserve important names, dates, numbers, constraints,
  technologies, and requirements.
- Explain relationships between important parts of the document.
- Include meaningful supporting details that would be omitted
  from both Short and Medium summaries.
- Provide a comprehensive overview without copying the document.
- Avoid unnecessary repetition.
"""

        # ---------------------------------------------------------
        # 4. Gemini prompt
        # ---------------------------------------------------------

        prompt = f"""
You are an expert document analysis and summarization assistant.

Your task is to analyze the supplied document and produce an
accurate, useful summary for a professional user.

SELECTED SUMMARY MODE:
{summary_length.upper()}

{length_instruction}

IMPORTANT DIFFERENCE BETWEEN MODES:

SHORT:
Provide only the essential takeaway and the most important
information. Do not include detailed supporting information.

MEDIUM:
Provide the essential takeaway plus the major requirements,
important supporting information, and the main outcome.

LONG:
Provide a comprehensive explanation covering substantially more
of the document. Include important supporting details, requirements,
processes, constraints, technical information, and context that
should be omitted from Short and Medium.

The three modes MUST be noticeably different in depth.
Do not produce nearly identical summaries for different modes.

Return your answer using EXACTLY these three sections:

SUMMARY:

Write the summary according to the selected summary mode.

Use normal professional paragraphs.
Do not use bullet points in the Summary.
Do not use emojis.
Do not use decorative symbols.
Do not use Markdown heading symbols such as # or ##.
Do not add unnecessary blank lines.


KEY POINTS:

Provide exactly 5 genuinely important points.

Use this format:

• Important point 1.
• Important point 2.
• Important point 3.
• Important point 4.
• Important point 5.

Do not use numbers for Key Points.
Do not use emojis or decorative symbols.


IMPROVEMENT SUGGESTIONS:

Provide 2 or 3 useful and relevant suggestions based only on
the document.

Use this format:

• First useful suggestion.
• Second useful suggestion.
• Third useful suggestion.

Do not invent suggestions unrelated to the document.


FORMATTING RULES:

1. Use only information supported by the document.
2. Do not invent facts.
3. Preserve important names, dates, numbers, technologies,
   requirements, deadlines, and constraints.
4. Do not copy large portions of the document word-for-word.
5. Keep the writing professional and easy to understand.
6. Make the Summary substantially different in depth depending
   on whether the selected mode is SHORT, MEDIUM, or LONG.
7. Key Points must contain genuinely important information.
8. Improvement Suggestions must be relevant to the document.
9. Do not use emojis.
10. Do not use decorative symbols.
11. The only symbol allowed for list formatting is •.
12. Do not use Markdown headings, tables, or code blocks.
13. Keep spacing clean and consistent.
14. Do not add extra sections.
15. Do not mention these instructions in your response.


DOCUMENT:

{extracted_text}
"""

        # ---------------------------------------------------------
        # 5. Generate AI response
        # ---------------------------------------------------------

        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt
        )

        result = response.text

        if not result:
            raise HTTPException(
                status_code=500,
                detail="The AI model returned an empty response."
            )

        # ---------------------------------------------------------
        # 6. Return result
        # ---------------------------------------------------------

        return {
            "filename": file.filename,
            "summary_length": summary_length,
            "result": result
        }

    except HTTPException:
        raise

    except Exception as e:

        error_message = str(e)

        if "429" in error_message or "RESOURCE_EXHAUSTED" in error_message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "The AI service has temporarily reached its usage limit. "
                    "Please try again later."
                )
            )

        raise HTTPException(
            status_code=500,
            detail="Unable to generate the summary. Please try again."
        )

    finally:
        if temporary_file and os.path.exists(temporary_file):
            os.remove(temporary_file)