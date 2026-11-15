# MatchIQ - AI-Powered Campus Placement & ATS Resume Matcher

An intelligent Campus Placement Management System and Applicant Tracking System (ATS) that uses AI to match student resumes with job postings. Built with Spring Boot, FastAPI, PostgreSQL with pgvector, React, and LLMs.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [Authentication System](#authentication-system)
- [AI/ML Pipeline](#aiml-pipeline)
- [Frontend Pages](#frontend-pages)
- [Configuration](#configuration)
- [Development](#development)
- [License](#license)

---

## Project Overview

MatchIQ is a comprehensive campus placement platform that connects students, recruiters, and placement cells. The system uses advanced AI techniques including:

- **Vector embeddings** for semantic matching of resumes and job descriptions
- **LLM-powered explanations** for why a candidate matches or doesn't match a job
- **Cosine similarity scoring** to rank candidates
- **Skill gap analysis** to help students improve their profiles

### How It Works

1. **Students** upload their resumes (PDF), which are parsed and embedded into vector space
2. **Recruiters** create job postings with eligibility criteria (branch, CGPA)
3. **Placement Cell** publishes approved job postings
4. **AI Service** computes match scores between resumes and job postings
5. **System** provides ranked candidates with explanations and skill gap analysis

---

## Key Features

### Multi-Role System
- **Student**: Upload resume, view matches, track score trends
- **Recruiter**: Create job postings, view ranked candidates, analytics
- **Placement Cell**: System-wide analytics, student monitoring, publish approvals

### AI-Powered Matching
- Resume PDF parsing with section extraction
- Vector embeddings using sentence-transformers
- Cosine similarity scoring (0-100)
- LLM-generated match explanations
- Deterministic skill gap analysis

### Smart Features
- **Eligibility Filtering**: Branch and CGPA requirements
- **Score Trends**: Track improvement between resume versions
- **Lazy Scoring**: Compute on-demand with caching
- **Draft Workflow**: DRAFT -> PUBLISHED lifecycle for job postings
- **Role-Based Access**: JWT authentication with route guards

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + Vite | 18.3 + 5.3 |
| **Styling** | Tailwind CSS | 3.4 |
| **Backend** | Spring Boot | 3.3.0 |
| **Java Version** | Java | 21 |
| **ORM** | Spring Data JPA | 3.3 |
| **Security** | Spring Security + JWT | jjwt 0.12.5 |
| **Database** | PostgreSQL + pgvector | 15 |
| **AI Service** | FastAPI | Python 3.10+ |
| **Embeddings** | sentence-transformers | all-MiniLM-L6-v2 |
| **PDF Parsing** | pdfplumber | 0.11.0 |
| **LLM** | OpenAI-compatible API | OpenRouter/Groq |
| **Containerization** | Docker Compose | v3.9 |

### Frontend Dependencies
- `react` ^18.3.1
- `react-dom` ^18.3.1
- `react-router-dom` ^6.24.1
- `@vitejs/plugin-react` ^4.3.1
- `tailwindcss` ^3.4.19
- `autoprefixer` ^10.5.4
- `postcss` ^8.5.25

### Backend Dependencies (Maven)
- `spring-boot-starter-web` - REST API, embedded Tomcat
- `spring-boot-starter-data-jpa` - ORM / Hibernate / repository layer
- `spring-boot-starter-security` - Authentication & authorization
- `spring-boot-starter-validation` - Bean validation (Jakarta)
- `postgresql` (runtime) - PostgreSQL JDBC driver
- `jjwt-api` / `jjwt-impl` / `jjwt-jackson` (0.12.5) - JWT token creation & parsing
- `spring-boot-starter-test` (test) - JUnit, Mockito

### Python Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.111.0 | Web framework for all API endpoints |
| `openai` | 1.51.0 | OpenAI-compatible client for LLM calls |
| `uvicorn[standard]` | 0.30.1 | ASGI server to run the FastAPI app |
| `pdfplumber` | 0.11.0 | PDF text extraction from resume uploads |
| `pydantic` | 2.7.4 | Request/response data validation |
| `psycopg2-binary` | 2.9.9 | PostgreSQL database driver |
| `sentence-transformers` | 3.0.1 | Embedding model (all-MiniLM-L6-v2) |
| `python-multipart` | 0.0.9 | Required by FastAPI for file upload handling |
| `python-dotenv` | 1.0.1 | `.env` file loading |

---

## Architecture

### System Architecture

```
+---------------------------------------------------------------+
|                    Frontend (React)                            |
|                 http://localhost:5173                           |
+---------------------------------------------------------------+
                              |
                              | API Calls (via Vite proxy)
                              v
+---------------------------------------------------------------+
|                   Backend (Spring Boot)                        |
|                   http://localhost:8080                         |
|  +-------------+  +-------------+  +-------------+           |
|  | Controllers |  |  Services   |  | Repositories|           |
|  +-------------+  +-------------+  +-------------+           |
+---------------------------------------------------------------+
                              |
                              | HTTP (RestTemplate)
                              v
+---------------------------------------------------------------+
|                  AI Service (FastAPI)                          |
|                   http://localhost:8000                         |
|  +-------------+  +-------------+  +-------------+           |
|  | PDF Parser  |  |  Embeddings |  |  LLM Explain|           |
|  +-------------+  +-------------+  +-------------+           |
+---------------------------------------------------------------+
                              |
                              | SQL (psycopg2)
                              v
+---------------------------------------------------------------+
|               PostgreSQL + pgvector                            |
|                   http://localhost:5432                         |
+---------------------------------------------------------------+
```

### Backend Layers

```
Controller Layer (REST endpoints, @PreAuthorize)
        |
        v
Service Layer (Business logic, caching)
        |
        v
Repository Layer (Spring Data JPA)
        |
        v
Entity Layer (JPA Entities)
```

### API Communication

- **Frontend <-> Backend**: REST API (JSON) via Vite proxy
- **Backend <-> AI Service**: HTTP (RestTemplate)
- **Backend <-> Database**: JPA/Hibernate
- **AI Service <-> Database**: psycopg2 (raw SQL)

---

## Database Schema

### Tables

#### users
User accounts with role-based access
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'PLACEMENT_CELL', 'RECRUITER')),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
```

#### student_profiles
Student eligibility information
```sql
CREATE TABLE student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch VARCHAR(100),
    cgpa NUMERIC(3,2)
);
```

#### resumes
Uploaded resumes with parsed content
```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    raw_text TEXT,
    parsed_sections JSONB,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now()
);
```

#### resume_embeddings
Vector embeddings of resume sections
```sql
CREATE TABLE resume_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    section VARCHAR(50) NOT NULL,
    embedding vector(384) NOT NULL
);
```

#### job_postings
Job postings from recruiters
```sql
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
```

#### jd_embeddings
Vector embeddings of job descriptions
```sql
CREATE TABLE jd_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    embedding vector(384) NOT NULL
);
```

#### match_results
Cached match scores
```sql
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    explanation TEXT,
    computed_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (resume_id, posting_id)
);
```

### Indexes

```sql
-- Vector similarity indexes for fast cosine distance search
CREATE INDEX ON resume_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON jd_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Project Structure

```
MatchIQ/
|
+-- backend/                              # Java Spring Boot backend
|   +-- pom.xml                           # Maven dependencies
|   +-- src/main/
|       +-- java/com/atsmatcher/
|       |   +-- AtsMatcherApplication.java    # Main application entry
|       |   +-- config/
|       |   |   +-- JwtUtil.java              # JWT token utilities
|       |   |   +-- JwtAuthFilter.java        # JWT authentication filter
|       |   |   +-- SecurityConfig.java       # Spring Security config
|       |   |   +-- SecurityBeansConfig.java  # Password encoder beans
|       |   |   +-- RestClientConfig.java     # RestTemplate config
|       |   +-- controller/
|       |   |   +-- AuthController.java       # Registration & login
|       |   |   +-- MeController.java         # Current user info
|       |   |   +-- ResumeController.java     # Resume upload & retrieval
|       |   |   +-- JobPostingController.java # CRUD for job postings
|       |   |   +-- MatchController.java      # Match results
|       |   |   +-- CandidateController.java  # Candidate ranking
|       |   |   +-- StudentProfileController.java # Student profiles
|       |   |   +-- RecruiterStatsController.java # Recruiter analytics
|       |   |   +-- AnalyticsController.java  # Placement cell analytics
|       |   +-- dto/
|       |   |   +-- AuthResponse.java         # Auth response DTO
|       |   |   +-- LoginRequest.java         # Login request DTO
|       |   |   +-- RegisterRequest.java      # Register request DTO
|       |   |   +-- JobPostingRequest.java    # Job posting DTO
|       |   |   +-- StudentProfileRequest.java # Profile DTO
|       |   +-- entity/
|       |   |   +-- User.java                 # User entity
|       |   |   +-- StudentProfile.java       # Student profile entity
|       |   |   +-- Resume.java               # Resume entity
|       |   |   +-- JobPosting.java           # Job posting entity
|       |   |   +-- MatchResult.java          # Match result entity
|       |   +-- repository/
|       |   |   +-- UserRepository.java       # User repository
|       |   |   +-- StudentProfileRepository.java # Profile repository
|       |   |   +-- ResumeRepository.java     # Resume repository
|       |   |   +-- JobPostingRepository.java # Job posting repository
|       |   |   +-- MatchResultRepository.java # Match result repository
|       |   +-- service/
|       |       +-- MatchingService.java      # Core matching logic
|       |       +-- EligibilityService.java   # Eligibility checking
|       +-- resources/
|           +-- application.properties        # Application config
|
+-- frontend/                             # React + Vite frontend
|   +-- index.html                        # HTML entry point
|   +-- package.json                      # NPM dependencies
|   +-- vite.config.js                    # Vite configuration
|   +-- tailwind.config.js                # Tailwind configuration
|   +-- postcss.config.js                 # PostCSS configuration
|   +-- src/
|       +-- main.jsx                      # React entry point
|       +-- App.jsx                       # Router & routes
|       +-- api/
|       |   +-- client.js                 # API client with auth
|       +-- lib/
|       |   +-- auth.js                   # Auth utilities
|       +-- pages/
|       |   +-- Login.jsx                 # Login page
|       |   +-- Register.jsx              # Registration page
|       |   +-- StudentDashboard.jsx      # Student main page
|       |   +-- RecruiterDashboard.jsx    # Recruiter main page
|       |   +-- PlacementCellDashboard.jsx # Placement cell main page
|       |   +-- StudentsRegister.jsx      # Student list (placement cell)
|       |   +-- StudentDetail.jsx         # Student detail view
|       |   +-- PostingCandidates.jsx     # Candidate ranking view
|       +-- components/
|       |   +-- AppHeader.jsx             # Navigation header
|       |   +-- RequireAuth.jsx           # Route guard
|       |   +-- MatchSeal.jsx             # Score badge component
|       |   +-- ResumePanel.jsx           # Resume display panel
|       |   +-- StatusTag.jsx             # Status badge component
|       +-- styles/
|           +-- tokens.css                # Custom design system
|
+-- rag-service/                          # Python FastAPI AI service
|   +-- main.py                           # FastAPI application
|   +-- database.py                       # PostgreSQL connection
|   +-- requirements.txt                  # Python dependencies
|   +-- tests/
|       +-- test_llm_provider.py          # LLM provider tests
|
+-- db/
|   +-- schema.sql                        # Database schema
|
+-- docker-compose.yml                    # PostgreSQL container
+-- README.md                             # This file
```

---

## Prerequisites

### Required Software

- **Docker Desktop** - For PostgreSQL container
- **Java 21** - For Spring Boot backend
- **Maven 3.9+** - For building Java backend
- **Python 3.10+** - For AI service
- **Node.js 18+** - For React frontend
- **Git** - For version control

### API Keys (Optional)

For LLM explanations, you need at least one:
- **OpenRouter API Key** - For nvidia/nemotron-3 model
- **Groq API Key** - For llama-3.3-70b model

Set in `rag-service/.env`:
```env
OPENROUTER_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MatchIQ.git
cd MatchIQ
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

Verify it's running:
```bash
docker exec -it ats-postgres psql -U ats_user -d ats_matcher -c "\dt"
```

### 3. Setup Database Schema

```bash
docker exec -i ats-postgres psql -U ats_user -d ats_matcher < db/schema.sql
```

### 4. Setup Backend

```bash
cd backend

# Install dependencies
mvn clean install

# Run the application
mvn spring-boot:run
```

Backend runs at: `http://localhost:8080`

### 5. Setup Python AI Service

#### Windows:
```bash
cd rag-service

# Create virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn main:app --reload --port 8000
```

#### Linux/macOS:
```bash
cd rag-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the service
uvicorn main:app --reload --port 8000
```

AI Service runs at: `http://localhost:8000`
Swagger docs: `http://localhost:8000/docs`

### 6. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Get current user info |
| POST | `/api/resumes` | Upload PDF resume |
| GET | `/api/resumes/mine` | Get latest resume with parsed sections |
| GET | `/api/students/me/profile` | Get own profile |
| PUT | `/api/students/me/profile` | Update own profile |
| GET | `/api/matches/my` | Get ranked match results |
| GET | `/api/matches/trend` | Get score trend between resume versions |
| GET | `/api/postings` | List published eligible postings |

### Recruiter Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/postings` | Create new job posting (DRAFT) |
| PUT | `/api/postings/{id}` | Edit a draft posting |
| GET | `/api/postings` | List all postings |
| GET | `/api/postings/{id}/candidates` | Get ranked candidates for posting |
| GET | `/api/recruiter/my-postings` | Get stats for own postings |

### Placement Cell Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/postings/{id}/publish` | Publish a posting (triggers embedding) |
| GET | `/api/placement-cell/analytics` | Get system-wide analytics |
| GET | `/api/placement-cell/students` | List all students with stats |
| GET | `/api/placement-cell/students/{email}` | Get detailed student view |

### Python AI Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/parse-resume` | Parse PDF into text + sections |
| POST | `/embed` | Generate text embedding |
| POST | `/embed-resume` | Embed and store resume vector |
| POST | `/embed-posting` | Embed and store job posting vector |
| POST | `/match` | Cosine similarity between resume and posting |
| POST | `/explain` | LLM-generated match explanation |

---

## Authentication System

### JWT Token Flow

1. **Login/Register** -> Backend validates credentials -> Returns JWT token
2. **API Requests** -> Frontend adds `Authorization: Bearer <token>` header
3. **Backend Filter** -> `JwtAuthFilter` validates token -> Sets SecurityContext
4. **Role-Based Access** -> `@PreAuthorize` annotations check user role

### Token Details

- **Algorithm**: HMAC-SHA256
- **Expiration**: 24 hours
- **Claims**: email (subject), role, issued-at
- **Secret**: Configured in `application.properties`

### Frontend Session

- Token stored in `localStorage`
- Auto-redirect on 401 (session expired)
- Role-based route guards via `RequireAuth` component
- Three localStorage keys: `token`, `role`, `email`

### User Roles

| Role | Capabilities |
|------|-------------|
| `STUDENT` | Upload resume, view matches, track score trends, manage profile |
| `RECRUITER` | Create/edit job postings, view ranked candidates, analytics |
| `PLACEMENT_CELL` | Publish postings, system-wide analytics, student monitoring |

---

## AI/ML Pipeline

### Resume Processing Flow

```
1. Upload PDF
   |
   v
2. pdfplumber extracts text (page-by-page)
   |
   v
3. Heuristic section splitting (skills, experience, education, projects, other)
   |
   v
4. sentence-transformers generates embeddings (all-MiniLM-L6-v2, 384 dimensions)
   |
   v
5. Store in pgvector tables (resume_embeddings)
```

### Matching Flow

```
1. Student views matches
   |
   v
2. EligibilityService checks branch/CGPA requirements
   |
   v
3. MatchingService.getOrComputeMatch()
   |
   v
4. Check cache (match_results table)
   |
   v
5. If miss:
   a. Compute cosine similarity via pgvector (<=> operator)
   b. Call LLM for explanation via /explain endpoint
   c. Analyze skill gaps (deterministic regex matching)
   d. Store in cache
   |
   v
6. Return ranked results sorted by score descending
```

### LLM Integration

**Multi-Provider Fallback:**

| Priority | Provider | Model | API Key Env Var |
|----------|----------|-------|-----------------|
| 1 | OpenRouter | `nvidia/nemotron-3-super-120b-a12b:free` | `OPENROUTER_API_KEY` |
| 2 | Groq | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |

- Providers tried in order; if one fails, the next is attempted
- Client instances cached for performance
- Max tokens per explanation: 300

### Skill Gap Analysis

- **Deterministic** regex word-boundary matching
- Identifies present and missing skills from job requirements
- Used in LLM prompt for context
- Supports comma, semicolon, slash, and "and" as skill separators

### Embedding Model

- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Storage**: pgvector with IVFFlat index (100 lists)
- **Similarity**: Cosine distance (`<=>` operator)

---

## Frontend Pages

### Login Page (`/`)
- Email/password form
- Auto-redirect if already authenticated
- Link to registration

### Registration Page (`/register`)
- Email/password/role selection
- Three roles: Student, Recruiter, Placement Cell

### Student Dashboard (`/student`)
- Resume upload with drag-and-drop (PDF only)
- Profile editor (branch, CGPA)
- Ranked match list with score seals
- Skill tags (green=present, red=missing)
- Score trend indicator (delta vs. previous resume)

### Recruiter Dashboard (`/recruiter`)
- Create/edit draft postings with eligibility criteria
- Stats tiles (total, published, candidates scored, avg match)
- Per-posting performance metrics
- View candidates link

### Placement Cell Dashboard (`/placement-cell`)
- Analytics summary tiles
- Per-posting performance with publish button
- Score bar visualization (colored horizontal bars)
- Link to students register

### Students Register (`/placement-cell/students`)
- List of all students
- Resume status indicators (red/green)
- Scoring stats per student
- "No resume" flagging

### Student Detail (`/placement-cell/students/:email`)
- Individual student drill-down
- All matches with scores and explanations
- Resume panel with parsed sections

### Posting Candidates (`/recruiter/postings/:id/candidates`)
- Ranked candidate list
- Match scores and explanations
- Skill gap analysis (present/missing)
- Context-aware back navigation

---

## Configuration

### Backend (`application.properties`)

```properties
# Server
server.port=8080

# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/ats_matcher
spring.datasource.username=ats_user
spring.datasource.password=ats_pass
spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=true

# JWT
app.jwt.secret=change-this-to-a-long-random-secret
app.jwt.expiration-ms=86400000  # 24 hours

# RAG Service
app.rag-service.url=http://localhost:8000
```

### Frontend (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080'
    }
  }
})
```

### Python AI Service (`.env`)

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ats_matcher
DB_USER=ats_user
DB_PASSWORD=ats_pass

# LLM Providers (optional - at least one needed for explanations)
OPENROUTER_API_KEY=your_openrouter_key
GROQ_API_KEY=your_groq_key

# Provider priority (comma-separated, default: openrouter,groq)
LLM_PROVIDER_PRIORITY=openrouter,groq

# Custom models (optional)
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
GROQ_MODEL=llama-3.3-70b-versatile
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: "3.9"
services:
  postgres:
    image: ankane/pgvector:latest
    container_name: ats-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ats_matcher
      POSTGRES_USER: ats_user
      POSTGRES_PASSWORD: ats_pass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/1-schema.sql

volumes:
  pgdata:
```

---

## Development

### Running All Services

1. Start PostgreSQL: `docker compose up -d`
2. Start Backend: `cd backend && mvn spring-boot:run`
3. Start AI Service: `cd rag-service && uvicorn main:app --reload --port 8000`
4. Start Frontend: `cd frontend && npm run dev`

### Common Commands

**Backend:**
```bash
cd backend
mvn clean install          # Build
mvn spring-boot:run        # Run
mvn test                   # Run tests
```

**Python AI Service:**
```bash
cd rag-service
pip install -r requirements.txt  # Install deps
uvicorn main:app --reload        # Run
python -m pytest tests/          # Run tests
```

**Frontend:**
```bash
cd frontend
npm install               # Install deps
npm run dev               # Run dev server
npm run build             # Build for production
```

**Database Operations:**
```bash
# Connect to database
docker exec -it ats-postgres psql -U ats_user -d ats_matcher

# List tables
\dt

# View table structure
\d users

# Run schema
\i /path/to/schema.sql
```

---

## Design System

The frontend uses a custom design system with these design tokens:

### Colors

| Token | Hex | Purpose |
|-------|-----|---------|
| `ink` | `#1F2A44` | Primary text / dark surfaces |
| `ink-soft` | `#4A5470` | Secondary text |
| `paper` | `#EDEFEF` | Page background |
| `paper-raised` | `#FFFFFF` | Card/surface background |
| `brass` | `#B8892B` | Accent / links / moderate match |
| `brass-soft` | `#D9B968` | Hover accent |
| `sage` | `#4B6455` | Positive / strong match |
| `sage-bg` | `#E4EAE4` | Positive background |
| `brick` | `#A23B34` | Negative / weak match / errors |
| `brick-bg` | `#F3E6E4` | Error background |
| `rule` | `#D3D6D2` | Borders and hairlines |

### Typography

| Family | Usage |
|--------|-------|
| Newsreader (serif) | Headings |
| Inter (sans-serif) | Body text |
| IBM Plex Mono (monospace) | Labels, meta, data |

### Match Score Colors

| Score Range | Color | Label |
|-------------|-------|-------|
| >= 70 | Sage (green) | Strong |
| >= 40 | Brass (gold) | Moderate |
| < 40 | Brick (red) | Weak |

---

## License

MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
