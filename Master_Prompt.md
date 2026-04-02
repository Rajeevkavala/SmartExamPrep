You are a senior full-stack engineer, product architect, and AI/ML systems designer.

I want you to help me build an end-to-end MVP called **SmartExamPrep**.

This MVP is ONLY for **GATE CSE** preparation and should focus only on the most important research-worthy features:

1. **Weakness Detection** (ML-powered)
2. **Adaptive Quiz Recommendation** (ML-powered)
3. **Spaced Revision Scheduler** (Algorithm + ML-enhanced)
4. **NLP-based Question Understanding** (NLP-powered)
5. **Admin Panel** (Content Management, Scraping, PDF Syllabus Extraction)

Do NOT add unnecessary startup-scale features.
Do NOT over-engineer.
Do NOT include subscriptions, payment gateway, or multi-exam support.

The goal is to build a **clean, working MVP** that is:
- technically solid
- usable for demo
- suitable for a student research paper
- easy to deploy
- easy to extend later

---

# 🎯 PRODUCT GOAL

Build a web app where a GATE CSE aspirant can:

- sign up / start using the platform
- select GATE CSE as target exam
- take a diagnostic quiz
- get weak topic analysis (ML-driven)
- receive adaptive quiz recommendations (ML-ranked)
- get a spaced revision schedule (algorithm-driven)
- track progress in a dashboard
- receive NLP-generated feedback in plain English

The product should behave like an **intelligent, ML-powered prep assistant**, not just a question bank.

---

# 🧠 CORE RESEARCH IDEA

The unique contribution of this system is a **tri-engine AI architecture**:

### 1) Weakness Detection Engine (ML)
The system should identify weak topics using a trained ML model based on:
- accuracy per topic
- repeated mistake patterns
- response time (z-score normalized)
- recent performance trend
- difficulty-level sensitivity

**ML approach**: Train a lightweight classifier (e.g., Random Forest or XGBoost) that outputs a weakness score (0–100) per topic. For MVP, use a weighted formula with ML-calibrated weights.

### 2) Adaptive Quiz Recommendation Engine (ML + Collaborative Filtering)
The system should recommend the **next best quiz** based on:
- weakest topics (from weakness engine)
- current mastery level
- recent performance
- available study time
- progression from easy → medium → hard

**ML approach**: Use a content-based filtering or lightweight matrix factorization approach. For MVP use rule-based scoring with ML-calibrated priority weights.

### 3) Spaced Revision Engine (Algorithm + ML)
The system should schedule revisions using a modified SM-2 spaced repetition algorithm:
- poor performance → revise in 1 day
- average → revise in 3 days
- good → revise in 7 days
- excellent → revise in 14 days

**ML enhancement**: Use past user cohort data to calibrate optimal intervals per topic difficulty.

### 4) NLP Layer
Use NLP to:
- parse and tag questions by concept/topic automatically
- extract keywords from explanations
- generate human-readable weakness summaries
- compute semantic similarity between questions (avoid repetition)

**NLP approach**: Use sentence-transformers (e.g., `all-MiniLM-L6-v2`) for embedding + cosine similarity. Use spaCy for keyword extraction.

---

# 🏗️ TECH STACK

Use this exact stack:

## Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **ShadCN UI**
- Axios for API calls to FastAPI backend
- Zustand for state management

## Backend
- **FastAPI** (Python)
- **Pydantic** for request/response validation
- **SQLAlchemy** ORM with Alembic migrations
- **Uvicorn** as ASGI server
- Async endpoints where appropriate

## Database
- **PostgreSQL**
- **SQLAlchemy** models (Python-side ORM)
- Alembic for migrations

## ML / AI / NLP Stack
- **scikit-learn** — weakness scoring model, recommendation ranking
- **XGBoost** — optional upgrade for weakness classifier
- **sentence-transformers** — NLP embeddings for semantic question similarity
- **spaCy** — keyword extraction, NLP tagging of questions
- **numpy / pandas** — data processing and feature engineering
- **Google Gemini API** — human-readable explanation generation + scrape formatting assistant
- **joblib** — ML model serialization and loading

## Admin / Scraping / PDF Stack
- **BeautifulSoup4 + httpx** — async web scraping of question pages from URLs
- **playwright** (optional) — for JS-rendered question pages that BS4 cannot parse
- **pdfplumber + PyMuPDF (fitz)** — extract text from uploaded syllabus PDFs
- **Gemini API (structured output mode)** — parse raw scraped/extracted text into structured JSON (question, options, answer, explanation, topic, subtopic, difficulty, source)
- **python-multipart** — FastAPI file upload handling for PDF
- **aiofiles** — async file I/O for uploaded PDFs

## Auth
- Simple JWT auth using **python-jose** + **passlib** (bcrypt)
- Two roles: `student` and `admin`
- Minimal: email/password only for MVP
- Role-based route protection via FastAPI dependency

## Project Structure
- **Monorepo**: `/frontend` (Next.js) + `/backend` (FastAPI) + `/ml` (ML models & training)
- CORS configured on FastAPI to allow Next.js origin
- Admin panel is a protected section of the same Next.js app (`/admin/*` routes)

## Hosting
- Frontend → Vercel
- Backend → Railway or Render (Docker container)
- Database → Supabase PostgreSQL or Railway PostgreSQL
- PDF upload storage → local `/uploads` folder (MVP) or Supabase Storage (production)

---

# 📦 WHAT I WANT YOU TO GENERATE

I want you to help me build this project **end-to-end** in a structured way.

You must provide the following in order:

---

# PHASE 1 — PRODUCT ARCHITECTURE

Give me:

1. Full monorepo folder structure (`/frontend`, `/backend`, `/ml`) including:
   - `/backend/routers/admin.py` — admin CRUD APIs
   - `/backend/routers/scraper.py` — URL scraping API
   - `/backend/routers/syllabus.py` — PDF upload API
   - `/backend/services/scraper_service.py` — scraping logic
   - `/backend/services/syllabus_service.py` — PDF extraction logic
   - `/frontend/app/admin/` — admin panel pages
2. Feature breakdown (student features + admin features)
3. Page list (Next.js) — student pages + admin pages
4. Component list (shared + admin-specific)
5. FastAPI route list (with router grouping, including admin/scraper/syllabus routers)
6. Database schema overview (SQLAlchemy models) including admin metadata
7. ML pipeline overview
8. Data flow explanation (student path + admin content management path)
9. User flow explanation (student flow + admin flow)

Keep this clean and practical.

---

# PHASE 2 — DATABASE DESIGN

Design a proper **SQLAlchemy** schema for this MVP.

Required entities:

- User (with `role` field: `student` | `admin`)
- Subject
- Topic (with `subtopics` JSON array field)
- Question (with NLP tags/embeddings reference and admin metadata)
- QuizAttempt
- TopicMastery
- StudySession (optional)
- RevisionSchedule
- SyllabusUpload (tracks uploaded PDFs and extracted structure)
- ScrapeJob (tracks URL scraping jobs and their status/results)

Each **Question** should support:
- subject_id (FK)
- topic_id (FK)
- subtopic (string)
- difficulty (enum: easy / medium / hard)
- options (JSON array)
- question_image_urls (JSON array; zero, one, or many image URLs)
- correct_answer (string)
- explanation (string)
- source_type (enum: PYQ / practice / scraped)
- source_url (nullable, populated if scraped)
- year (nullable, for PYQs — e.g. 2022)
- NLP keyword tags (JSON array)
- embedding vector reference (nullable)
- is_verified (bool — admin must verify scraped questions before they go live)
- created_by (FK → User — which admin added this)
- created_at / updated_at timestamps

Each **Topic** should support:
- subject_id (FK)
- name
- subtopics (JSON array of subtopic name strings)
- NLP keyword tags (JSON array)
- order / weight (for curriculum ordering)

Each **SyllabusUpload** should support:
- uploaded_by (FK → User admin)
- filename
- upload_path
- extracted_structure (JSON — the full subject/topic/subtopic tree extracted from the PDF)
- status (enum: pending / processing / done / failed)
- created_at

Each **ScrapeJob** should support:
- url (the scraped page URL)
- initiated_by (FK → User admin)
- status (enum: pending / processing / done / failed)
- raw_html (text, stored for reprocessing)
- extracted_questions (JSON array of extracted question objects before verification)
- questions_imported (int — how many were approved and inserted)
- error_message (nullable)
- created_at

Each topic mastery should track:
- accuracy
- weakness score (ML output)
- mastery level (enum: Weak / Moderate / Strong)
- last attempted
- next revision date
- total attempts
- correct attempts
- avg response time

Generate:
- Full SQLAlchemy models (`models.py`)
- Alembic migration notes
- Pydantic schemas (`schemas.py`) for request/response
- Explanations for each model

---

# PHASE 3 — SEED DATA DESIGN

I want seed data only for **GATE CSE**.

Create a clean subject-topic structure for:

- Data Structures
- Algorithms
- Operating Systems
- DBMS
- Computer Networks
- Theory of Computation
- Compiler Design
- Digital Logic
- Computer Organization
- Discrete Mathematics
- Aptitude

For each subject:
- create important subtopics
- add NLP keyword tags per topic

Also give me:
- a JSON structure for inserting questions
- NLP preprocessing script to tag questions on insert
- a small sample dataset format for 10–20 questions

Do not generate 1000 questions.
Just create a scalable structure.

---

# PHASE 4 — ML MODEL DESIGN

Now design the full ML intelligence layer.

## A) Weakness Detection ML Model

Design a practical ML pipeline:

**Features (inputs):**
- accuracy (float 0–1)
- repeated_mistakes (int)
- avg_response_time_zscore (float)
- recent_performance_slope (float, last 5 attempts)
- difficulty_sensitivity (float: error rate increase from easy→hard)

**Target (output):**
- weakness_score (float 0–100)

**Model choices:**
- For MVP: weighted formula with ML-calibrated weights
- For production upgrade: XGBoost regressor trained on historical user data

Requirements:
- weakness score: 0–100
- thresholds:
  - Strong: 0–30
  - Moderate: 31–60
  - Weak: 61–100

Give:
- formula + feature engineering
- Python ML class (`WeaknessDetector`)
- joblib serialization
- FastAPI service wrapper
- edge case handling

---

## B) Adaptive Quiz Recommendation ML Model

Design a content-based recommendation engine:

**Inputs:**
- topic mastery scores
- weakness scores per topic
- user level
- recent quiz attempts
- daily study time (minutes)

**Algorithm:**
1. Score each topic using: `priority = weakness_score * (1 - mastery) * recency_factor`
2. Select top-k topics
3. From each topic, rank questions by: difficulty match + low repetition penalty (NLP cosine similarity to recent questions)

Requirements:
- recommend 5–10 questions
- prioritize weak topics
- gradually increase difficulty
- avoid repeating similar questions (use sentence-transformer similarity)
- support "today's recommended quiz"

Give:
- full Python recommendation class (`AdaptiveRecommender`)
- NLP-based deduplication logic
- FastAPI endpoint
- response schema

---

## C) Spaced Revision ML Enhancement

Design revision scheduling using **modified SM-2 algorithm**:

**Base intervals:**
- poor (score < 40%) → 1 day
- average (40–65%) → 3 days
- good (65–85%) → 7 days
- excellent (>85%) → 14 days

**ML enhancement:**
- Use topic difficulty coefficient to scale intervals
- Calibrate multipliers from cohort performance data (if available)

Give:
- Python class (`SpacedRevisionScheduler`)
- formula and explanation
- FastAPI endpoint
- edge case handling

---

## D) NLP Pipeline

Design the NLP layer using spaCy + sentence-transformers:

**Tasks:**
1. Question tagging: extract GATE CSE concepts from question text using spaCy NER + keyword matching
2. Semantic similarity: encode questions using `all-MiniLM-L6-v2`, compute cosine similarity to avoid recommending near-duplicate questions
3. Weakness explanation generation: use topic name + ML scores to build structured prompts → send to Gemini for human-readable output

Give:
- Python NLP module (`nlp_pipeline.py`)
- embedding utility functions
- similarity threshold logic
- Pydantic models for NLP outputs

---

# PHASE 5 — BACKEND API DEVELOPMENT (FastAPI)

Now generate all backend APIs using **FastAPI**.

I want for each endpoint:
- route + method
- Pydantic request/response schema
- validation logic
- Python async implementation
- service layer separation (`services/`, `routers/`, `models/`)

Required API Endpoints:

### Auth Router (`/api/auth`)
1. `POST /register` — register user (role defaults to `student`)
2. `POST /login` — JWT login (return role in token payload)
3. `GET /me` — get current user

### Quiz Router (`/api/quiz`)
4. `GET /diagnostic` — fetch diagnostic quiz questions
5. `POST /submit` — submit quiz answers
6. `GET /adaptive` — fetch today's adaptive quiz (ML-generated)

### Analysis Router (`/api/analysis`)
7. `GET /weakness` — get ML weakness scores per topic
8. `GET /dashboard` — get full dashboard summary

### Revision Router (`/api/revision`)
9. `GET /plan` — get today's revision plan
10. `POST /mark-done` — mark a revision topic as done

### Content Router (`/api/content`)
11. `GET /subjects` — list all subjects
12. `GET /subjects/{id}/topics` — list topics for a subject

### AI Router (`/api/ai`)
13. `POST /explain` — generate NLP + Gemini explanation for weakness

---

## PHASE 5A — ADMIN API DEVELOPMENT (FastAPI)

All admin routes are protected with `require_admin` dependency (role check from JWT).

### Admin — Subjects & Topics Router (`/api/admin/content`)
1. `GET /subjects` — list all subjects (with topic count)
2. `POST /subjects` — create a new subject
3. `PUT /subjects/{id}` — update subject name/metadata
4. `DELETE /subjects/{id}` — delete subject (cascade to topics, questions)
5. `GET /subjects/{id}/topics` — list all topics for a subject
6. `POST /subjects/{id}/topics` — create a topic under a subject
7. `PUT /topics/{id}` — update topic (name, subtopics JSON, keyword tags)
8. `DELETE /topics/{id}` — delete topic (cascade to questions)

### Admin — Questions / PYQ Router (`/api/admin/questions`)
9. `GET /questions` — list all questions with filters (subject, topic, difficulty, source_type, is_verified)
10. `GET /questions/{id}` — get a single question with full detail
11. `POST /questions` — manually create a question
12. `PUT /questions/{id}` — edit any field of a question
13. `DELETE /questions/{id}` — delete a question
14. `POST /questions/{id}/verify` — mark scraped question as verified (goes live)
15. `POST /questions/bulk-verify` — bulk verify multiple questions

For each admin question endpoint provide:
- complete Pydantic request/response schemas
- pagination (limit/offset) for list endpoints
- filter query params (subject_id, topic_id, difficulty, source_type, is_verified, year)
- admin audit fields (created_by, updated_at)

---

## PHASE 5B — WEB SCRAPER API + PDF SYLLABUS API (FastAPI)

### Scraper Router (`/api/admin/scraper`)

Design a robust async web scraper that:
1. Accepts a URL from admin
2. Fetches the page HTML (using `httpx` async client)
3. Parses the HTML with `BeautifulSoup4` to extract:
   - question text
  - question image URLs (one or more, if present)
   - option A, B, C, D
   - correct answer
   - explanation (if present)
   - year / exam tag (if present)
4. Sends extracted raw text to **Gemini API (structured JSON mode)** with a prompt that asks Gemini to:
   - identify the subject
   - identify the topic and subtopic
   - assign difficulty (easy / medium / hard)
   - clean up the question text
   - fill in explanation if missing
   - return structured JSON matching the Question schema
5. Stores the extracted questions in `ScrapeJob.extracted_questions` with `is_verified = False`
6. Admin reviews and verifies questions in the Admin Panel before they go live

**Endpoints:**
1. `POST /scrape/start` — submit a URL to scrape
   - Request: `{ url: string, notes: string (optional) }`
   - Response: `{ job_id: uuid, status: "pending" }`
2. `GET /scrape/jobs` — list all scrape jobs (paginated)
3. `GET /scrape/jobs/{job_id}` — get status + extracted questions for a job
4. `POST /scrape/jobs/{job_id}/import` — approve and import all verified questions from a job to the main questions table
5. `DELETE /scrape/jobs/{job_id}` — cancel / delete a scrape job

**Scraper Service (`scraper_service.py`):**
- `async def fetch_page(url: str) -> str` — fetch raw HTML with httpx
- `def parse_questions(html: str) -> list[RawQuestion]` — BS4 parsing with site-agnostic heuristics
- `async def classify_with_gemini(raw_questions: list[RawQuestion]) -> list[StructuredQuestion]` — call Gemini with structured prompt
- `def save_scrape_job(job_id, url, results)` — persist to DB

**Gemini Prompt Template for Scraper:**
```
You are a GATE CSE question classifier. Given the following raw question text scraped from a webpage, return a valid JSON object with these exact fields:
{
  "question_text": "cleaned question",
  "question_image_urls": ["https://example.com/image1.png"],
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "A" or "B" or "C" or "D",
  "explanation": "detailed explanation",
  "subject": "e.g. Operating Systems",
  "topic": "e.g. CPU Scheduling",
  "subtopic": "e.g. Round Robin",
  "difficulty": "easy" | "medium" | "hard",
  "year": null or 2022,
  "source_type": "PYQ" or "practice"
}
Do not add anything outside of this JSON. Raw text:
{raw_text}
```

---

### Syllabus PDF Router (`/api/admin/syllabus`)

Design a PDF upload and extraction pipeline:

**How it works:**
1. Admin uploads a GATE CSE syllabus PDF via multipart/form-data
2. FastAPI saves the file using `aiofiles` to `/uploads/syllabi/`
3. Backend reads the PDF using `pdfplumber` to extract all text
4. Extracted text is sent to **Gemini API** with a structured prompt:
   - Gemini parses the text and returns a clean JSON tree:
     ```json
     {
       "subjects": [
         {
           "name": "Operating Systems",
           "topics": [
             {
               "name": "CPU Scheduling",
               "subtopics": ["Round Robin", "Priority Scheduling", "FCFS", "SJF"]
             }
           ]
         }
       ]
     }
     ```
5. Admin reviews the extracted structure in the Admin Panel
6. Admin clicks "Import to DB" → backend creates Subject, Topic records in DB
7. SyllabusUpload record is updated with status `done` and the extracted JSON

**Endpoints:**
1. `POST /syllabus/upload` — upload PDF
   - Request: multipart/form-data with `file` (PDF) field
   - Response: `{ upload_id: uuid, status: "processing" }`
2. `GET /syllabus/uploads` — list all syllabus uploads
3. `GET /syllabus/uploads/{id}` — get extraction result (extracted JSON tree)
4. `POST /syllabus/uploads/{id}/import` — import extracted structure into DB as Subject + Topic records
5. `DELETE /syllabus/uploads/{id}` — delete upload record and file

**Syllabus Service (`syllabus_service.py`):**
- `async def save_uploaded_pdf(file: UploadFile) -> str` — save to disk, return path
- `def extract_text_from_pdf(path: str) -> str` — use pdfplumber to extract raw text
- `async def parse_syllabus_with_gemini(raw_text: str) -> dict` — call Gemini with structured prompt
- `def import_structure_to_db(structure: dict, db: Session, admin_id: uuid)` — upsert Subject + Topic + subtopics

**Gemini Prompt Template for Syllabus:**
```
You are a university syllabus parser. Given the following text extracted from a GATE CSE syllabus PDF, return a valid JSON object with the structure:
{
  "subjects": [
    {
      "name": "Subject Name",
      "topics": [
        {
          "name": "Topic Name",
          "subtopics": ["subtopic 1", "subtopic 2"]
        }
      ]
    }
  ]
}
Do not include anything outside this JSON. Syllabus text:
{raw_text}
```

Also include:
- FastAPI middleware setup (CORS, logging)
- dependency injection for DB session
- JWT auth dependency (`require_student`, `require_admin`)
- global exception handler
- `routers/`, `services/`, `models/`, `schemas/`, `ml/` folder structure

---

# PHASE 6 — FRONTEND UI DEVELOPMENT (Next.js)

Now design the frontend pages using Next.js App Router + Tailwind + ShadCN.

The frontend calls the **FastAPI backend** via Axios with JWT bearer token.

Generate full page breakdown and code for:

### Student Pages
1. Landing Page
2. Auth Page (Login / Register)
3. Onboarding Page
4. Diagnostic Quiz Page
5. Quiz Result Analysis Page (with ML weakness breakdown)
6. Dashboard Page
7. Adaptive Quiz Page
8. Revision Plan Page

### Admin Pages (`/admin/*` — only accessible if role === 'admin')
9. **Admin Dashboard** (`/admin`) — stats: total questions, subjects, topics, pending scrape jobs, unverified questions
10. **Subjects Manager** (`/admin/subjects`) — list/create/edit/delete subjects; expandable rows showing topics
11. **Topics Manager** (`/admin/subjects/[id]/topics`) — list/create/edit/delete topics; inline subtopics editor (JSON chip editor)
12. **Questions Manager** (`/admin/questions`) — full data table with filters (subject, topic, difficulty, source, verified status); inline edit; delete; bulk verify
13. **Question Detail / Edit Page** (`/admin/questions/[id]`) — full form to edit all fields of a question; preview panel; verify button
14. **Scraper Page** (`/admin/scraper`) — URL input form; list of past scrape jobs; per-job view with extracted questions table; approve/reject each question; bulk import button
15. **Syllabus Upload Page** (`/admin/syllabus`) — PDF drag-and-drop upload; progress indicator; extracted subject/topic/subtopic tree viewer; "Import to DB" button

For each page provide:
- layout structure
- sections
- components used
- API calls to FastAPI admin endpoints
- UX notes
- complete code if possible

### Admin-specific UI Components to build:
- `<AdminSidebar />` — fixed sidebar with links to all admin sections
- `<AdminGuard />` — HOC/wrapper that redirects non-admin users to `/dashboard`
- `<DataTable />` — reusable ShadCN-based table with sort/filter/pagination
- `<SubtopicChipEditor />` — add/remove subtopic chips inline
- `<QuestionFormModal />` — create/edit question in a modal form
- `<ScrapeJobCard />` — shows URL, status badge, question count, import button
- `<SyllabusTreeViewer />` — renders extracted JSON as collapsible tree
- `<PDFDropzone />` — drag-and-drop PDF upload with progress bar
- `<ScrapedQuestionReview />` — side-by-side raw vs structured question with accept/reject

Also include:
- Axios API client setup (`/lib/api.ts`) with separate `adminApi` instance
- JWT token storage and auth header injection
- Role-based route protection middleware (`middleware.ts`)
- Zustand store for user/session state including `role`

---

# PHASE 7 — DASHBOARD DESIGN

Design the dashboard with these widgets:

- Overall Readiness Score (ML computed)
- Weakest 3 Topics (ML ranked)
- Strongest Topics
- Today's Recommended Quiz (ML generated)
- Today's Revision Topics (spaced repetition output)
- Subject-wise Progress (accuracy chart)
- Recent Quiz Performance (trend line)
- NLP Insight Card ("What the AI thinks about your prep")

Make it clean, not cluttered.

Also provide:
- Zustand state shape for dashboard
- FastAPI `/api/analysis/dashboard` response shape
- Frontend component code (React + Tailwind)

---

# PHASE 8 — AI / NLP / GEMINI INTEGRATION

Use AI/NLP where it adds **real measurable value**:

### NLP (sentence-transformers + spaCy):
- Tag questions by GATE CSE topic on insert
- Avoid recommending near-duplicate questions (cosine similarity check)
- Keyword extraction for revision summaries

### Gemini (Google Generative AI):
- Generate human-readable weakness summaries
- Give short, actionable study advice per weak topic
- Generate "why this topic matters for GATE" micro-notes

Integration requirements:
- Safe prompt design (structured prompts, no hallucination leakage)
- FastAPI async Gemini call
- Graceful fallback if Gemini API fails (return pre-written template)
- Response caching (Redis or in-memory) to avoid repeated API calls

Example Gemini outputs:
- "You are struggling in CPU Scheduling because your accuracy is 34% on medium-difficulty conceptual questions. Focus on Banker's Algorithm and priority scheduling next."
- "Revise Deadlock Detection tomorrow. Your last 3 attempts showed repeated mistakes on resource allocation graphs."

Generate production-safe implementation.

---

# PHASE 9 — ML MODEL TRAINING PIPELINE

Since we are using ML, also design:

## `/ml` folder structure:
- `train_weakness_model.py` — training script
- `feature_engineering.py` — extract features from DB
- `model_evaluation.py` — evaluate model accuracy
- `export_model.py` — export with joblib
- `models/weakness_model.pkl` — serialized model

## Training Data:
- Synthetic data generation script for MVP (before real user data)
- Feature matrix definition
- Label definition (manually annotated weakness score for seed data)

## Model Serving:
- Model loaded once at FastAPI startup (`lifespan` event)
- Inference function exposed as a Python service
- Response time target: < 100ms per prediction

Give full implementation including:
- synthetic data generation
- training script
- FastAPI model loading pattern

---

# PHASE 10 — MVP POLISH

Add practical MVP improvements:

- loading states on all async operations
- empty states for new users (no quiz history)
- form validation (Pydantic on backend, Zod on frontend)
- retry logic on failed API calls (Axios interceptor)
- error toasts (ShadCN toast component)
- simple progress indicators
- API response caching on frontend (React Query / SWR optional)

### Admin-specific polish:
- Optimistic UI for question CRUD (instant table update before server confirms)
- Scrape job polling (poll `/api/admin/scraper/jobs/{id}` every 3s until status = done)
- PDF upload progress bar (track multipart upload progress via Axios `onUploadProgress`)
- Confirmation dialogs before delete/bulk actions (ShadCN AlertDialog)
- Toast notifications for all admin actions (created / updated / deleted / imported)
- Unverified question count badge on admin sidebar

Keep everything realistic and deployable.

---

# PHASE 11 — ADMIN PANEL FULL DESIGN

Design the complete Admin Panel as a polished, production-grade internal tool.

## Admin Dashboard Stats
The admin home page (`/admin`) must show:
- Total questions in DB (breakdown by source: PYQ / practice / scraped)
- Unverified questions count (requires attention badge)
- Total subjects + topics
- Scrape jobs this week (count + success rate)
- Syllabus uploads processed
- Active student count

## Subjects & Topics Manager
- Accordion-style list: Subject → Topics → Subtopics
- Inline edit for subject name
- Topic form: name, subtopics (chip multi-input), keyword tags
- Drag-to-reorder topics within a subject (for curriculum ordering)
- Color-coded topic difficulty weight badge

## Questions Manager
- Full data table with columns:
  - ID, Question Text (truncated), Subject, Topic, Subtopic, Difficulty, Source, Year, Verified, Created At, Actions
- Row actions: Edit (modal), Delete, Verify
- Multi-row select + Bulk Verify / Bulk Delete
- Filter bar: Subject / Topic / Difficulty / Source / Verified
- Search bar: full-text search on question text
- Clicking a row opens Question Detail page

## Scraper Workflow (Admin)
1. Admin goes to `/admin/scraper`
2. Enters a URL (e.g., GeeksForGeeks GATE PYQ page, or any exam question page)
3. Clicks "Scrape" — backend fetches and processes asynchronously
4. Status badge updates via polling: Pending → Processing → Done / Failed
5. When done, admin sees a table of extracted questions with:
   - Question text, Options, Answer, Explanation, Detected Topic, Difficulty
   - Each row has: ✅ Accept | ❌ Reject toggle
6. Admin clicks "Import Accepted" → selected questions go into DB with `is_verified = true`
7. Rejected questions are discarded

For the Scraper page generate:
- Full React component with polling hook
- ScrapeJobCard component
- ScrapedQuestionReview table with Accept/Reject toggles
- FastAPI service code
- Gemini prompt logic

## Syllabus Upload Workflow (Admin)
1. Admin goes to `/admin/syllabus`
2. Drags or selects a GATE CSE Syllabus PDF
3. Clicks Upload → PDF is sent to FastAPI
4. Backend extracts text with pdfplumber → sends to Gemini → gets structured JSON
5. Admin sees the extracted structure in a collapsible tree view:
   - Subject → Topics → Subtopics
6. Admin can manually edit the tree before importing (rename/delete nodes)
7. Clicks "Import to Database" → Subject and Topic records are created/updated in DB

For the Syllabus page generate:
- Full React component with PDFDropzone
- SyllabusTreeViewer with editable nodes
- FastAPI `/api/admin/syllabus/upload` implementation
- pdfplumber extraction code
- Gemini structured prompt code

---

# PHASE 12 — RESEARCH PAPER SUPPORT

Finally, help me convert this MVP into a research project.

Give me:

1. Project abstract
2. Novelty statement (ML + NLP + spaced repetition + automated content ingestion)
3. Problem statement
4. Methodology (explain ML pipeline + scraping pipeline + syllabus extraction)
5. System architecture explanation (frontend ↔ FastAPI ↔ ML ↔ PostgreSQL ↔ Gemini ↔ Admin)
6. Evaluation plan
7. Metrics to measure:
   - accuracy improvement over time
   - weak topic recovery rate
   - revision effectiveness
   - recommendation relevance (user rating)
   - NLP tagging accuracy
   - scraper extraction accuracy (vs manually entered questions)
   - syllabus extraction F1-score
8. Experiment design for 10–30 students
9. Possible IEEE-style paper title ideas
10. Related works section outline (spaced repetition, adaptive learning, NLP in education, automated content extraction)

---

# IMPORTANT BUILD RULES

Follow these rules strictly:

- Keep the system MVP-first
- Prefer clarity over complexity
- Avoid unnecessary libraries (use only what's in the tech stack)
- Keep code modular and production-friendly
- Use **Python type hints** properly throughout FastAPI
- Use **TypeScript** properly throughout Next.js
- Make ML logic easy to understand and explain in a research paper
- Do not skip implementation details
- Whenever possible, give real code, not only theory
- Explain why each ML/NLP feature exists
- Structure the response phase-by-phase
- If the response is too long, continue in the next message without losing context
- Separate concerns: frontend fetches, backend processes, ML infers

---

# OUTPUT STYLE

I want your output to be:
- highly practical
- implementation-focused
- clear enough to directly build from
- suitable for a student developer building solo

Start with **PHASE 1 — PRODUCT ARCHITECTURE**
and continue step-by-step.

Do not jump randomly.
Build this like a real product architect with ML expertise and content management experience.

For admin features, always prioritize:
- Security (all admin routes must validate `role === admin` from JWT)
- Auditability (all admin mutations should log who did what and when)
- Graceful failure (scraper and PDF extraction can fail — always handle errors and show meaningful messages to admin)

---

# PYQ IMAGE SUPPORT (MANDATORY)

PYQ questions may include one or more images (diagram, graph, table, scanned figure). Treat image support as a first-class requirement across all phases.

Apply these rules everywhere question models, schemas, APIs, scraper output, and UI are defined:

- Add `question_image_urls` as an array field on Question (`[]` default).
- Keep image support optional so text-only questions continue to work.
- In scraper flows, extract all relevant image URLs from the source page and include them in `question_image_urls`.
- In admin create/edit flows, support adding, previewing, reordering, and deleting multiple question images.
- In student quiz/result pages, render all question images in order before options, with responsive sizing and lazy loading.
- In NLP/Gemini processing, combine `question_text` with OCR/caption text (if available) so image-dependent PYQs are classified correctly.