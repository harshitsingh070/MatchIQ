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
import re
from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import pdfplumber
import io

from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

from database import get_connection
from openai import OpenAI

# --- App + model setup (runs once at startup) ---
app = FastAPI(title="ATS Matcher RAG Service")
embedding_model = None


# --- LLM provider config: tries each in order, falls through on any failure ---

def get_provider_priority() -> list[str]:
    """
    Reads LLM_PROVIDER_PRIORITY from .env, e.g. "openrouter,groq".
    Falls back to trying both, openrouter first, if not set.
    """
    raw = os.getenv("LLM_PROVIDER_PRIORITY", "openrouter,groq")
    providers = [p.strip().lower() for p in raw.split(",") if p.strip()]
    valid = [p for p in providers if p in {"openrouter", "groq"}]
    return valid if valid else ["openrouter", "groq"]


def get_llm_model(provider: str) -> str:
    if provider == "groq":
        return os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    return os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-super-120b-a12b:free")


_client_cache: dict[str, OpenAI] = {}


def get_llm_client(provider: str) -> OpenAI:
    if provider in _client_cache:
        return _client_cache[provider]

    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set")
        client = OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")
    else:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise RuntimeError("OPENROUTER_API_KEY is not set")
        client = OpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1")

    _client_cache[provider] = client
    return client


def extract_required_skills(required_skills_text: str) -> list[str]:
    """Split a posting's required_skills field into a clean list of skills."""
    skills = []
    for part in re.split(r"[,;/]|\band\b", required_skills_text or ""):
        part = part.strip()
        if len(part) >= 2:
            skills.append(part)
    return skills


def compute_skill_gaps(resume_text: str, required_skills: list[str]) -> tuple[list[str], list[str]]:
    """
    Deterministically split required skills into those present in the resume
    and those missing. Uses lookaround boundaries so "Java" does not match
    inside "JavaScript".
    """
    present: list[str] = []
    missing: list[str] = []
    for skill in required_skills:
        pattern = r"(?<![a-z0-9])" + re.escape(skill.lower()) + r"(?![a-z0-9])"
        if re.search(pattern, resume_text.lower()):
            present.append(skill)
        else:
            missing.append(skill)
    return present, missing


def generate_explanation(prompt: str) -> tuple[str, str]:
    """
    Tries each provider in priority order. Returns (explanation, provider_used)
    from the first one that succeeds. Raises RuntimeError with details of every
    attempt if all providers fail (missing key, rate limit, model unavailable, etc.)
    """
    errors = []

    for provider in get_provider_priority():
        try:
            client = get_llm_client(provider)
            response = client.chat.completions.create(
                model=get_llm_model(provider),
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}],
            )
            explanation = response.choices[0].message.content
            return explanation, provider
        except Exception as exc:
            errors.append(f"{provider}: {exc}")
            continue  # try the next provider in the list

    raise RuntimeError("All LLM providers failed - " + " | ".join(errors))


def get_embedding_model():
    global embedding_model
    if embedding_model is None:
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return embedding_model


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

SECTION_HEADERS = {
    "skills": ["skills", "technical skills", "technologies"],
    "experience": ["experience", "work experience", "professional experience"],
    "education": ["education", "academic background"],
    "projects": ["projects", "personal projects"],
}


def split_into_sections(raw_text: str) -> dict:
    """
    Split raw resume text into labelled sections by looking for heading lines.

    NOTE: this is a heuristic, not a real NLP parser. It keys off exact
    section headers and will miss resumes with unconventional formatting or
    no clear headers. That's an accepted limitation for this project's scope;
    a smarter parser is not worth the dependency cost here.
    """
    lines = raw_text.split("\n")
    sections = {key: [] for key in SECTION_HEADERS}
    sections["other"] = []
    current_section = "other"

    for line in lines:
        stripped = line.strip()
        lower = stripped.lower()

        matched_section = None
        for section_key, headers in SECTION_HEADERS.items():
            if any(lower == h or lower.startswith(h + ":") for h in headers):
                matched_section = section_key
                break

        if matched_section:
            current_section = matched_section
            continue  # don't include the header line itself

        if stripped:
            sections[current_section].append(stripped)

    return {key: "\n".join(lines) for key, lines in sections.items() if lines}


@app.post("/parse-resume", response_model=ParsedResume)
async def parse_resume(file: UploadFile = File(...)):
    """
    Extract raw text from an uploaded PDF resume and split it into
    sections (skills, experience, education, projects) by heading.
    """
    contents = await file.read()
    text_chunks = []

    with pdfplumber.open(io.BytesIO(contents)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_chunks.append(page_text)

    raw_text = "\n".join(text_chunks)
    sections = split_into_sections(raw_text)

    return ParsedResume(raw_text=raw_text, sections=sections)


# --- Phase 4: generic embedding utility ---
@app.post("/embed")
def embed_text(req: EmbedRequest):
    vector = get_embedding_model().encode(req.text).tolist()
    return {"embedding": vector}


# --- Phase 4: embed + store a resume's embedding ---
@app.post("/embed-resume")
def embed_resume(req: EmbedResumeRequest):
    vector = get_embedding_model().encode(req.text).tolist()
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
    vector = get_embedding_model().encode(req.text).tolist()
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
        return None, None, None

    resume_text = resume_row[0]
    posting_text = f"{posting_row[0]}\n{posting_row[1]}\nRequired skills: {posting_row[2]}"
    return resume_text, posting_text, posting_row[2]


# --- Phase 6: LLM-generated match explanation, with automatic provider fallback ---
@app.post("/explain")
def explain_match(req: ExplainRequest):
    resume_text, posting_text, required_skills_text = fetch_resume_and_posting_text(
        req.resume_id, req.posting_id)

    if resume_text is None:
        return {"error": "Resume or posting not found"}

    required_skills = extract_required_skills(required_skills_text)
    present_skills, missing_skills = compute_skill_gaps(resume_text, required_skills)

    prompt = f"""You are helping match a candidate's resume against a job posting.

Job posting:
{posting_text}

Resume:
{resume_text}

Skills present in the resume: {', '.join(present_skills) if present_skills else 'none'}
Skills missing from the resume: {', '.join(missing_skills) if missing_skills else 'none'}

In 2-3 short sentences, explain how well this resume matches the job posting.
Mention the specific present and missing skills listed above. Be concise and
factual - do not invent skills not present in the resume."""

    try:
        explanation, provider_used = generate_explanation(prompt)
    except RuntimeError as exc:
        return {
            "resume_id": req.resume_id,
            "posting_id": req.posting_id,
            "error": str(exc),
        }

    return {
        "resume_id": req.resume_id,
        "posting_id": req.posting_id,
        "provider": provider_used,
        "explanation": explanation,
        "present_skills": present_skills,
        "missing_skills": missing_skills,
    }