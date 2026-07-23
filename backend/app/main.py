import sys
import os
import io

# allow importing from app/nlp regardless of where uvicorn is run from
sys.path.append(os.path.join(os.path.dirname(__file__), "nlp"))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader

from extract import extract_from_report
from explainer import generate_explanation
from mapping.bone_lookup import build_viewer_payload

app = FastAPI(title="Bone Injury Visualizer API")

# Get frontend URL from environment variable, default to localhost for dev
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Allow multiple origins (dev + prod)
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternative dev port
    FRONTEND_URL,  # Your production frontend URL
]

# allow the React dev server to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Accepts a list!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReportTextRequest(BaseModel):
    report_text: str


def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def run_pipeline(report_text: str) -> dict:
    extraction = extract_from_report(report_text)
    viewer_payload = build_viewer_payload(extraction, report_text)
    explanation = generate_explanation(extraction, report_text)
    return {
        "extraction": extraction,
        "viewer": viewer_payload,
        "explanation": explanation,
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/analyze")
def analyze_report(request: ReportTextRequest):
    """
    Accepts raw report text (pasted or typed), runs the full pipeline:
    extraction -> bone mapping -> explanation. Returns everything the
    frontend needs to render the 3D view and the plain-language summary.
    """
    if not request.report_text or not request.report_text.strip():
        raise HTTPException(status_code=400, detail="report_text cannot be empty")

    try:
        result = run_pipeline(request.report_text)
        result["report_text"] = request.report_text
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@app.post("/analyze-file")
async def analyze_report_file(file: UploadFile = File(...)):
    """
    Accepts an uploaded .txt or .pdf file.
    """
    filename_lower = file.filename.lower()

    if not (filename_lower.endswith(".txt") or filename_lower.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported")

    contents = await file.read()

    if filename_lower.endswith(".pdf"):
        try:
            report_text = extract_text_from_pdf(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")
    else:
        report_text = contents.decode("utf-8")

    if not report_text.strip():
        raise HTTPException(
            status_code=400,
            detail="No readable text found in the uploaded file (if this is a scanned PDF, it may need OCR)."
        )

    try:
        result = run_pipeline(report_text)
        result["report_text"] = report_text
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")