"""
ATS Matcher - RAG microservice
Handles: PDF parsing, embedding generation, vector similarity retrieval,
and LLM-based match explanations.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import pdfplumber
import io

app = FastAPI(title="ATS Matcher RAG Service")


class ParsedResume(BaseModel):
    raw_text: str
    # Placeholder - real section splitting comes in Phase 3/4
    sections: dict


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse-resume", response_model=ParsedResume)
async def parse_resume(file: UploadFile = File(...)):
    """
    Phase 3: extract raw text from an uploaded PDF resume.
    Next step (Phase 3b): split raw_text into sections
    (skills, experience, education) - start simple with keyword
    heuristics, upgrade to a smarter parser later.
    """
    contents = await file.read()
    text_chunks = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(page_text)

    raw_text = "\n".join(text_chunks)

    return ParsedResume(
        raw_text=raw_text,
        sections={"todo": "add section splitting logic here"},
    )


# --- Phase 4 stub: embeddings ---
class EmbedRequest(BaseModel):
    text: str


@app.post("/embed")
def embed_text(req: EmbedRequest):
    """
    Phase 4: replace this stub with sentence-transformers.
    Example:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("all-MiniLM-L6-v2")
        vector = model.encode(req.text).tolist()
    """
    return {"todo": "wire up sentence-transformers here", "input_len": len(req.text)}


# --- Phase 5 stub: matching ---
class MatchRequest(BaseModel):
    resume_id: str
    posting_id: str


@app.post("/match")
def match(req: MatchRequest):
    """
    Phase 5: query pgvector for cosine similarity between
    resume_embeddings and jd_embeddings, return a score.
    """
    return {"todo": "implement pgvector similarity query", **req.model_dump()}
