"""
ATS Matcher - RAG microservice
Handles: PDF parsing, embedding generation, vector similarity retrieval,
and LLM-based match explanations.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

# --- Imports (all at the top, before anything uses them) ---
import os
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import pdfplumber
import io

from dotenv import load_dotenv
load_dotenv()  # must run before os.getenv() calls below

from database import get_connection
from openai import OpenAI

openrouter_client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")

# --- App + model setup (runs once at startup) ---
app = FastAPI(title="ATS Matcher RAG Service")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


# --- Schemas ---
class ParsedResume(BaseModel):
    raw_text: str
    sections: dict


class EmbedRequest(BaseModel):
    text: str


class EmbedResumeRequest(BaseModel):
    resume_id: str
    text: str
    section: str = "full"


class EmbedPostingRequest(BaseModel):
    posting_id: str
    text: str


class MatchRequest(BaseModel):
    resume_id: str
    posting_id: str


class ExplainRequest(BaseModel):
    resume_id: str
    posting_id: str


# --- Health check ---
@app.get("/health")
def health():
    return {"status": "ok"}


# --- Phase 3: resume parsing ---
@app.post("/parse-resume", response_model=ParsedResume)
async def parse_resume(file: UploadFile = File(...)):
    """
    Extract raw text from an uploaded PDF resume.
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


# --- Phase 4: generic embedding utility ---
@app.post("/embed")
def embed_text(req: EmbedRequest):
    vector = embedding_model.encode(req.text).tolist()
    return {"embedding": vector}


# --- Phase 4: embed + store a resume's embedding ---
@app.post("/embed-resume")
def embed_resume(req: EmbedResumeRequest):
    vector = embedding_model.encode(req.text).tolist()
    vector_str = "[" + ",".join(str(v) for v in vector) + "]"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO resume_embeddings (resume_id, section, embedding)
                VALUES (%s, %s, %s)
                """,
                (req.resume_id, req.section, vector_str),
            )
        conn.commit()
    finally:
        conn.close()

    return {"status": "stored", "resume_id": req.resume_id, "dims": len(vector)}


# --- Phase 4: embed + store a job posting's embedding ---
@app.post("/embed-posting")
def embed_posting(req: EmbedPostingRequest):
    vector = embedding_model.encode(req.text).tolist()
    vector_str = "[" + ",".join(str(v) for v in vector) + "]"

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO jd_embeddings (posting_id, embedding)
                VALUES (%s, %s)
                """,
                (req.posting_id, vector_str),
            )
        conn.commit()
    finally:
        conn.close()

    return {"status": "stored", "posting_id": req.posting_id, "dims": len(vector)}


# --- Phase 5: matching ---
@app.post("/match")
def match(req: MatchRequest):
    """
    Computes cosine similarity between a resume's embedding and a
    job posting's embedding, returns a 0-100 match score.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    1 - (re.embedding <=> je.embedding) AS similarity
                FROM resume_embeddings re, jd_embeddings je
                WHERE re.resume_id = %s AND je.posting_id = %s
                LIMIT 1
                """,
                (req.resume_id, req.posting_id),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if row is None:
        return {"error": "No embeddings found for this resume/posting pair"}

    similarity = row[0]
    score = round(max(0, similarity) * 100, 2)

    return {
        "resume_id": req.resume_id,
        "posting_id": req.posting_id,
        "score": score,
    }


# --- Phase 6: fetch raw text for explanation generation ---
def fetch_resume_and_posting_text(resume_id: str, posting_id: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT raw_text FROM resumes WHERE id = %s", (resume_id,))
            resume_row = cur.fetchone()

            cur.execute(
                "SELECT title, description, required_skills FROM job_postings WHERE id = %s",
                (posting_id,),
            )
            posting_row = cur.fetchone()
    finally:
        conn.close()

    if resume_row is None or posting_row is None:
        return None, None

    resume_text = resume_row[0]
    posting_text = f"{posting_row[0]}\n{posting_row[1]}\nRequired skills: {posting_row[2]}"
    return resume_text, posting_text


# --- Phase 6: LLM-generated match explanation ---
@app.post("/explain")
def explain_match(req: ExplainRequest):
    resume_text, posting_text = fetch_resume_and_posting_text(req.resume_id, req.posting_id)

    if resume_text is None:
        return {"error": "Resume or posting not found"}

    prompt = f"""You are helping match a candidate's resume against a job posting.

Job posting:
{posting_text}

Resume:
{resume_text}

In 2-3 short sentences, explain how well this resume matches the job posting.
Mention specific skills that match, and specific skills or requirements that seem missing.
Be concise and factual - do not invent skills not present in the resume."""

    response = openrouter_client.chat.completions.create(
        model=OPENROUTER_MODEL,
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    explanation = response.choices[0].message.content

    return {
        "resume_id": req.resume_id,
        "posting_id": req.posting_id,
        "explanation": explanation,
    }