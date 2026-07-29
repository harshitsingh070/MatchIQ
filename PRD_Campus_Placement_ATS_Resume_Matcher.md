# Product Requirements Document
## Campus Placement & ATS Resume Matcher

**Version:** 1.0
**Status:** Draft
**Owner:** [Your name]
**Date:** July 29, 2026

---

## 1. Overview

### 1.1 Problem statement
Campus placement cells manually match hundreds of student resumes against job descriptions (JDs) from recruiters every hiring season. This process is slow, inconsistent, and prone to human bias — a strong candidate can be missed simply because a recruiter's JD used different terminology than the resume.

### 1.2 Proposed solution
An internal campus portal that automatically parses student resumes (PDF), matches them against job descriptions using semantic (RAG-based) matching, and surfaces ranked, explainable results to students, placement cells, and recruiters — each through a role-specific view.

### 1.3 Goals
- Learn and demonstrate a full-stack architecture combining React, Spring Boot, a Python RAG microservice, and Postgres with pgvector.
- Reduce manual resume screening effort for placement cells.
- Give students visibility into how well their resume matches specific job postings, with actionable feedback.
- Give recruiters a ranked, explainable shortlist instead of a raw resume dump.

### 1.4 Non-goals (v1)
- Not a public job board — internal to one institution.
- Not handling video resumes, LinkedIn imports, or non-PDF formats.
- Not doing interview scheduling, offer management, or payroll.
- Not fine-tuning custom embedding/LLM models — v1 uses pre-trained models via API/local inference.

---

## 2. Users & roles

| Role | Description | Key needs |
|---|---|---|
| **Student** | Uploads resume, browses postings | See match score + explanation, know what to improve |
| **Placement cell (admin)** | Manages postings, oversees process | Bulk view of matches, control over job postings and eligibility |
| **Recruiter** | Posts JDs, reviews candidates | Ranked candidate list with explanations, filter by score/skill |

Role-based access is enforced at the backend (Spring Security) — each role sees a different dashboard and permission set.

---

## 3. Core user flows

### 3.1 Student flow
1. Register/login → upload resume (PDF).
2. System parses resume into structured sections (skills, experience, education).
3. Student browses active job postings.
4. For each posting, student sees a match score (%) and a short explanation of strengths/gaps.
5. Student can re-upload an updated resume and see score change.

### 3.2 Placement cell flow
1. Login → create/manage job postings (paste or upload JD).
2. Set eligibility criteria (branch, CGPA cutoff, etc.).
3. View aggregate dashboard: postings, applicant counts, average match scores.
4. Approve/publish postings to make them visible to students and recruiters.

### 3.3 Recruiter flow
1. Login → view/post JDs (subject to placement cell approval).
2. View ranked list of matched candidates per posting, sorted by match score.
3. View per-candidate explanation ("Strong match: React, Node.js. Missing: Docker, AWS").
4. Shortlist candidates for the next round.

---

## 4. Functional requirements

### 4.1 Authentication & roles
- FR-1: Users register/login with email + password (JWT-based sessions).
- FR-2: Each user has exactly one role: `STUDENT`, `PLACEMENT_CELL`, or `RECRUITER`.
- FR-3: Endpoints are protected by role at the Spring Security layer.

### 4.2 Resume ingestion
- FR-4: Students upload a resume as PDF (max 5MB).
- FR-5: System extracts text and segments it into sections: contact info, skills, experience, education, projects.
- FR-6: Parsed data is stored in Postgres, linked to the student's profile.
- FR-7: Students can re-upload; the latest resume supersedes the previous one for matching.

### 4.3 Job description management
- FR-8: Placement cell / recruiters can create JDs with title, description, required skills, eligibility criteria.
- FR-9: JDs require placement cell approval before becoming visible to students.

### 4.4 Matching engine (RAG pipeline)
- FR-10: On upload or JD publish, the system generates vector embeddings for resume sections and JD text.
- FR-11: Embeddings are stored in Postgres via the pgvector extension.
- FR-12: For a given resume-JD pair, the system computes similarity (cosine distance) to produce a match score (0–100%).
- FR-13: The system retrieves the most relevant matched/missing skill chunks and passes them to an LLM to generate a short natural-language explanation.
- FR-14: Match results (score + explanation) are cached/stored so they don't need to be recomputed on every view.

### 4.5 Dashboards
- FR-15: Student dashboard lists postings with match score and explanation, sorted by score.
- FR-16: Recruiter dashboard lists candidates per posting, sorted by score, with filters (min score, branch, skill).
- FR-17: Placement cell dashboard shows posting-level and institution-level analytics (avg. score, applicant volume).

---

## 5. Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | Matching for a single resume-JD pair should return in under 3 seconds (excluding first-time embedding generation) |
| Scalability | Support at least 2,000 students and 200 concurrent JDs without redesign |
| Security | Passwords hashed (bcrypt), JWT expiry, role checks on every protected endpoint |
| Privacy | Resumes and personal data visible only to the uploading student, placement cell, and recruiters for postings the student applied to |
| Reliability | If the LLM explanation call fails, the numeric match score must still be returned (graceful degradation) |
| Maintainability | Clear separation between Spring Boot (business logic) and Python service (ML/RAG logic) via internal REST API |

---

## 6. System architecture (summary)

- **Frontend:** React (role-based dashboards for student, placement cell, recruiter)
- **Backend:** Spring Boot (auth, roles, business logic, orchestration)
- **RAG/ML service:** Python (FastAPI) — PDF parsing, embedding generation, vector retrieval, LLM-based explanation generation
- **Database:** PostgreSQL with the `pgvector` extension for embedding storage and similarity search
- **LLM:** Called by the Python service to generate match explanations from retrieved resume/JD chunks

Spring Boot communicates with the Python service over internal REST calls; it never talks to Postgres' vector tables directly — the Python service owns the embedding/retrieval logic.

---

## 7. Data model (high level)

- **User**: id, email, password_hash, role
- **StudentProfile**: id, user_id, branch, cgpa
- **Resume**: id, student_id, raw_text, parsed_sections (JSON), uploaded_at
- **ResumeEmbedding**: id, resume_id, section, vector
- **JobPosting**: id, recruiter_id, title, description, required_skills, eligibility_criteria, status (draft/approved/published)
- **JDEmbedding**: id, posting_id, vector
- **MatchResult**: id, resume_id, posting_id, score, explanation, computed_at

---

## 8. Milestones (learning-oriented build plan)

| Phase | Deliverable |
|---|---|
| 1 | Postgres schema + pgvector extension set up |
| 2 | Spring Boot: entities, JPA repos, role-based auth, CRUD APIs |
| 3 | Python service: PDF parsing endpoint |
| 4 | Python service: embedding generation + pgvector storage |
| 5 | Python service: similarity retrieval + match scoring |
| 6 | Python service: LLM-based explanation generation |
| 7 | Spring Boot ↔ Python integration |
| 8 | React frontend: all three role dashboards |
| 9 | End-to-end testing, polish, deploy demo |

---

## 9. Open questions

- Which LLM/API will generate explanations (cost, rate limits, self-hosted vs. hosted)?
- Should placement cell approval be mandatory for every JD, or only for first-time recruiters?
- Do we need resume versioning/history, or does each new upload fully replace the old one?
- What's the eligibility-filtering logic — hard filter (hide ineligible postings) or soft filter (show but flag)?

---

## 10. Success metrics (for a learning project)

- Functional end-to-end flow: student uploads resume → sees match scores → recruiter sees ranked candidates.
- Working RAG pipeline: embeddings stored/retrieved correctly, explanations generated from retrieved context (not hallucinated).
- Clean separation of concerns across the three services, each independently testable.
