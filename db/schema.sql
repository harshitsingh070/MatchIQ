-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'PLACEMENT_CELL', 'RECRUITER')),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch VARCHAR(100),
    cgpa NUMERIC(3,2)
);

CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    raw_text TEXT,
    parsed_sections JSONB,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);

-- 384 dims matches the all-MiniLM-L6-v2 embedding model; change if you pick a different model
CREATE TABLE resume_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    embedding vector(384) NOT NULL
);

CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT,
    eligibility_criteria JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'APPROVED', 'PUBLISHED')),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE jd_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL
);

CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    explanation TEXT,
    computed_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (resume_id, posting_id)
);

-- Index for fast vector similarity search (cosine distance)
CREATE INDEX ON resume_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON jd_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
