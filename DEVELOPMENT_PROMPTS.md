# SmartExamPrep â€” End-to-End Development Prompts

> **How to use:** Copy one prompt at a time into GitHub Copilot Chat (or Claude Sonnet / AI Pro).
> Each prompt tells the AI exactly which files to read for context.
> Work top-to-bottom. Do NOT skip chunks â€” each builds on the previous.
>
> **Recommended Models:** GitHub Copilot (GPT-4o / Claude Sonnet 4.5) | Claude Sonnet 4.6 | AI 1.5 Pro
> **Workspace root:** `d:\New folder (2)\SmartExamPrep\`
>
> **Required Agent Skills (installed):**
> - [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md) (backend architecture and API design)
> - [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md) (ML scripts and Python workflows)
> - [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md) (Next.js App Router implementation)
> - [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md) (React/Next.js performance and patterns)
> - [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md) (Tailwind structure and component patterns)
> - [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md) (premium UI design quality)
> - [vercel-services](C:/Users/rajee/.agents/skills/vercel-services/SKILL.md) (multi-service deployment guidance)
> - [github-actions](C:/Users/rajee/.agents/skills/github-actions/SKILL.md) (CI/CD automation where needed)

> **Global rule (mandatory):** PYQ questions may contain one or more images. In every chunk where Question models/schemas/APIs/UI are implemented, include `question_image_urls` (array, default empty), support scraper extraction of image URLs, and render images in admin/student question views.

---

## CHUNK 01 â€” Project Scaffold & Monorepo Setup

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md), [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are setting up a new full-stack monorepo project called SmartExamPrep.

FIRST, read this file for the complete folder structure and tech stack:
  phases/phase-01-product-architecture.md  (Section 1: Monorepo Folder Structure)

TASK: Create the following from scratch:

1. Root-level files:
   - docker-compose.yml  (PostgreSQL on port 5432 + backend on 8000)
   - .env.example        (DATABASE_URL, JWT_SECRET, OPENROUTER_API_KEY / GROQ_API_KEY, NEXT_PUBLIC_API_URL)
   - README.md           (Setup instructions for both frontend and backend)

2. backend/ folder:
   - requirements.txt    (fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary,
                          python-jose, passlib[bcrypt], pydantic-settings, pydantic[email],
                          httpx, beautifulsoup4, pdfplumber, aiofiles, python-multipart,
                          httpx, spacy, sentence-transformers, scikit-learn,
                          xgboost, numpy, pandas, joblib)
   - Dockerfile          (Python 3.11-slim, installs requirements, runs uvicorn)
   - config.py           (Pydantic BaseSettings reading from .env)
   - database.py         (SQLAlchemy engine + SessionLocal + get_db dependency)
   - main.py             (FastAPI app skeleton with CORS, lifespan, router mounts â€” empty routers OK)
   - dependencies.py     (get_current_user, require_admin stubs)

3. frontend/ folder:
   - Run: npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir
   - Then: npm install axios zustand jwt-decode nextjs-toploader zod react-hook-form @hookform/resolvers
   - Then: npx shadcn-ui@latest init (default config)
   - Then: npx shadcn-ui@latest add button input toast dialog table badge card alert-dialog

4. ml/ folder:
   - requirements.txt    (scikit-learn, xgboost, pandas, numpy, joblib, sentence-transformers)
   - Create empty: generate_synthetic_data.py, train_weakness_model.py, model_evaluation.py, export_model.py
   - Create folder: ml/models/ with .gitkeep

OUTPUT: All files created. Confirm the structure matches phase-01-product-architecture.md Section 1.
```

---

## CHUNK 02 â€” Database Models & Alembic

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md)

```
You are building the PostgreSQL database schema for SmartExamPrep.

FIRST, read this entire file before writing any code:
  phases/phase-02-database-design.md

TASK: In backend/models/models.py, implement ALL SQLAlchemy ORM models exactly as specified:
  - User         (role: student|admin, JWT auth)
  - Subject      (name, display_order)
  - Topic        (subtopics JSON, nlp_keyword_tags JSON, difficulty_weight)
   - Question     (options JSON, question_image_urls JSON array, is_verified bool, source_url, scrape_job_id FK)
  - QuizAttempt  (answers JSON with per-question metadata)
  - TopicMastery (weakness_score, mastery_level enum, avg_response_time_s)
  - RevisionSchedule (ease_factor, interval_days, SM-2 fields)
  - ScrapeJob    (raw_html, extracted_questions JSON, status enum)
  - SyllabusUpload (extracted_structure JSON, status enum)

Then set up Alembic:
  - alembic init alembic
  - Edit alembic/env.py to import Base from models.models and set target_metadata
  - Run: alembic revision --autogenerate -m "initial schema"

Then create backend/schemas/ with these files (using Pydantic v2):
  - auth_schemas.py
  - quiz_schemas.py
  - analysis_schemas.py
  - admin_schemas.py      (SubjectCreate, TopicCreate, QuestionCreate, BulkVerifyRequest)
  - scraper_schemas.py    (ScrapeStartRequest, ImportJobRequest)
  - syllabus_schemas.py   (ImportSyllabusRequest)

Read Section 3 of phase-02-database-design.md for exact Pydantic field definitions.

OUTPUT: models.py, all schema files, and alembic/versions/ first migration file.
```

---

## CHUNK 03 â€” Backend Auth + Config + Dependencies

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md)

```
You are implementing JWT authentication for SmartExamPrep FastAPI backend.

FIRST, read:
  phases/phase-02-database-design.md  (Section 3: auth_schemas.py)
  phases/phase-05-backend-api.md       (Sections 3 and 4: dependencies.py and Auth Router)

TASK:

1. backend/config.py â€” complete Pydantic BaseSettings:
   DATABASE_URL, JWT_SECRET, JWT_ALGORITHM="HS256", OPENROUTER_API_KEY / GROQ_API_KEY, UPLOAD_DIR="uploads"

2. backend/dependencies.py â€” implement:
   - get_db() generator using SessionLocal
   - get_current_user(token, db) â†’ decodes JWT, returns User or raises 401
   - require_admin(user) â†’ checks role=="admin" or raises 403
   - require_student(user) â†’ returns user (any authenticated)

3. backend/services/auth_service.py â€” implement:
   - hash_password(password: str) â†’ str  using passlib bcrypt
   - verify_password(plain, hashed) â†’ bool
   - create_user(req: RegisterRequest, db) â†’ User
   - authenticate_user(email, password, db) â†’ User | None
   - create_token(data: dict) â†’ str  (JWT, 24h expiry)

4. backend/routers/auth.py â€” implement:
   - POST /register â†’ creates student user, returns UserResponse
   - POST /login    â†’ returns TokenResponse with role in payload
   - GET  /me       â†’ returns current user info

5. Wire auth router in main.py: app.include_router(auth.router, prefix="/api/auth")

OUTPUT: config.py, dependencies.py, auth_service.py, auth.py router, updated main.py
```

---

## CHUNK 04 â€” ML Models: Weakness Detector + Spaced Revision + NLP Pipeline

**Required Skills:** [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are implementing the ML intelligence layer for SmartExamPrep.

FIRST, read this ENTIRE file before writing any code:
  phases/phase-04-ml-model-design.md

TASK: Implement the following Python modules in backend/ml/:

1. backend/ml/weakness_detector.py
   - WeaknessFeatures dataclass (5 fields as specified)
   - WeaknessDetector class:
     * __init__(use_ml_model=False) â€” loads joblib model if exists
     * compute(features) â†’ {weakness_score, mastery_level}
     * _compute_formula(features) â€” weighted formula (exact weights in phase-04 Section A)
     * _compute_ml(features) â€” XGBoost predict if model loaded
     * _get_mastery_level(score) â†’ "Strong"|"Moderate"|"Weak"
     * extract_features_from_db(user_id, topic_id, db) â†’ WeaknessFeatures

2. backend/ml/spaced_revision.py
   - RevisionInput dataclass
   - SpacedRevisionScheduler class:
     * schedule(inp: RevisionInput) â†’ {due_date, interval_days, ease_factor, repetition_count}
     * _base_interval(score) â€” exact thresholds from phase-04 Section C
     * _update_ease_factor(ef, score) â€” SM-2 formula

3. backend/ml/nlp_pipeline.py
   - Module-level _nlp and _embedder singletons
   - load_nlp_models() â€” called at FastAPI startup
   - extract_tags(text) â†’ list[str]  (spaCy noun chunks + GATE_DOMAIN_TERMS set)
   - embed_text(text) â†’ list[float]  (sentence-transformer all-MiniLM-L6-v2)
   - cosine_similarity(a, b) â†’ float
   - is_near_duplicate(candidate_emb, existing_embs, threshold=0.85) â†’ bool
   - build_weakness_prompt(topic_name, subject_name, weakness_score, accuracy, ...) â†’ str

4. backend/ml/adaptive_recommender.py
   - AdaptiveRecommender class:
     * RECENCY_FACTORS dict, SIMILARITY_THRESHOLD=0.85
     * recommend(topic_masteries, recent_embeddings, candidates, daily_study_minutes) â†’ list[dict]
     * _recency_factor(last_attempted_at) â†’ float
     * _is_duplicate(candidate_emb, recent_embs) â†’ bool

Use EXACT formulas from phase-04-ml-model-design.md. Do not simplify.

OUTPUT: weakness_detector.py, spaced_revision.py, nlp_pipeline.py, adaptive_recommender.py
```

---

## CHUNK 05 â€” Student-Facing Backend APIs

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are implementing the student API routes for SmartExamPrep FastAPI backend.

FIRST, read:
  phases/phase-05-backend-api.md   (Sections 5â€“8: quiz, analysis, revision, ai routers)
  phases/phase-04-ml-model-design.md (for context on ML service calls)

TASK: Create these files:

1. backend/services/quiz_service.py
   - get_diagnostic_questions(db) â†’ picks 2 questions per topic, balanced difficulty
   - process_quiz_submission(user_id, req: SubmitQuizRequest, db) â†’ QuizResultResponse
     * Creates QuizAttempt record with answers JSON
     * Calls update_topic_mastery() for each topic in the quiz
     * Returns score, correct_count, topic_scores dict

2. backend/services/weakness_service.py
   - update_topic_mastery(user_id, topic_id, correct, total, avg_time, db)
     * Upsert TopicMastery, call WeaknessDetector, call SpacedRevisionScheduler
   - get_weakness_analysis(user_id, db) â†’ list of TopicWeaknessItem dicts

3. backend/services/dashboard_service.py
   - get_dashboard_data(user_id, db) â†’ full DashboardResponse dict
     * readiness_score (mean of 100-weakness_score)
     * weakest_topics (top 3), strongest_topics, subjects_progress, recent_scores

4. backend/services/recommendation_service.py
   - get_adaptive_questions(user, db) â†’ list of question dicts
     * Gets TopicMasteries, recent embeddings, candidate questions
     * Calls AdaptiveRecommender.recommend()

5. backend/routers/quiz.py       â€” GET /diagnostic, POST /submit, GET /adaptive
6. backend/routers/analysis.py   â€” GET /weakness, GET /dashboard
7. backend/routers/revision.py   â€” GET /plan, POST /mark-done
8. backend/routers/content.py    â€” GET /subjects, GET /subjects/{id}/topics
9. backend/routers/ai.py         â€” POST /explain

10. Wire all routers in main.py with correct prefixes.

OUTPUT: All service files + router files + updated main.py
```

---

## CHUNK 06 â€” AI AI Service

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are implementing the AI AI integration for SmartExamPrep.

FIRST, read this ENTIRE file:
  phases/phase-08-ai-nlp-gemini.md

TASK: Implement backend/services/ai_service.py with:

1. Module setup:
   - genai.configure(api_key=settings.OPENROUTER_API_KEY / GROQ_API_KEY)
   - model = GenerativeModel("gemini-1.5-flash")
   - In-memory cache dict: _explanation_cache: dict[str, str] = {}
   - _cache_key(user_id, topic_id, weakness_score) â†’ md5 hash (5-point bracket)

2. generate_weakness_explanation(topic_name, subject_name, weakness_score,
   accuracy, repeated_mistakes, avg_response_time_s, user_id, topic_id) â†’ str
   - Use exact prompt template from phase-08 Section 4
   - generation_config: max_output_tokens=200, temperature=0.3
   - Fallback: return template string from FALLBACK_EXPLANATIONS dict based on mastery_level

3. classify_scraped_questions(raw_texts: list[str]) â†’ list[dict]
   - Use exact prompt from phase-08 Section 5 (SCRAPER_PROMPT)
   - Process one at a time with asyncio.sleep(0.5) rate limiting
   - Max 20 per batch
   - Parse JSON from response using re.search(r'\{.*\}', response.text, re.DOTALL)

4. parse_syllabus(raw_text: str) â†’ dict
   - Use exact prompt from phase-08 Section 6 (SYLLABUS_PROMPT)
   - Truncate raw_text to 8000 chars before sending
   - Return {"subjects": []} as fallback on failure

OUTPUT: backend/services/ai_service.py (complete, production-safe)
```

---

## CHUNK 07 â€” Admin CRUD APIs (Subjects, Topics, Questions)

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md)

```
You are implementing all admin CRUD API routes for SmartExamPrep.

FIRST, read:
  phases/phase-05-backend-api.md   (Sections: Admin Content Router, Admin Questions Router)
  phases/phase-11-admin-panel.md   (Section 3â€“5 for exact field/filter requirements)

TASK:

1. backend/routers/admin_content.py
   - ALL routes under /api/admin/content/
   - Subjects: GET list (with topic_count), POST create, PUT update, DELETE (cascade)
   - Topics: GET list for subject, POST create, PUT update, DELETE
   - All protected with require_admin dependency

2. backend/routers/admin_questions.py
   - GET /  (paginated + filters: subject_id, topic_id, difficulty, source_type,
             is_verified, year, search query param)
   - GET /{id}
   - POST / (create, auto-call extract_tags from nlp_pipeline)
   - PUT /{id} (partial update)
   - DELETE /{id}
   - POST /{id}/verify
   - POST /bulk-verify { question_ids: list[str] }
   - All protected with require_admin

3. Wire both routers in main.py with prefixes:
   /api/admin/content and /api/admin/questions

Include:
- Proper 404 handling when records not found
- Pagination: limit (max 100) + offset query params
- Full-text search on question_text using SQLAlchemy ilike

OUTPUT: admin_content.py, admin_questions.py, updated main.py
```

---

## CHUNK 08 â€” Scraper Service + Syllabus Service + Their Routers

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are implementing the web scraper and PDF syllabus extraction pipelines for SmartExamPrep admin.

FIRST, read this ENTIRE file:
  phases/phase-05-backend-api.md   (Sections: PHASE 5B â€” Scraper Router + Syllabus Router)

Also read for service implementations:
  phases/phase-08-ai-nlp-gemini.md (Sections 5 and 6 for AI prompts used here)

TASK:

1. backend/services/scraper_service.py
   - run_scrape_job(job_id, url) â€” async background task:
     * httpx.AsyncClient.get(url) to fetch HTML
     * parse_html_questions(html) â€” BS4 heuristic parser (find question blocks with A./B. options)
     * classify_scraped_questions(raw_texts) â€” call from ai_service
     * Update ScrapeJob.extracted_questions, ScrapeJob.status = "done"
   - import_scraped_questions(job_id, accepted_indices, admin_id, db) â†’ int
     * For each accepted index: find Subject+Topic, create Question with is_verified=True
     * Returns count imported

2. backend/routers/scraper.py
   - POST /start  â†’ creates ScrapeJob, triggers background_tasks.add_task(run_scrape_job)
   - GET  /jobs   â†’ paginated list
   - GET  /jobs/{job_id} â†’ single job with extracted_questions
   - POST /jobs/{job_id}/import { accepted_indices: list[int] }
   - DELETE /jobs/{job_id}

3. backend/services/syllabus_service.py
   - process_syllabus_upload(upload_id, file: UploadFile) â€” async background task:
     * aiofiles save to uploads/syllabi/{upload_id}_{filename}
     * pdfplumber extract all text (join pages)
     * parse_syllabus(raw_text) from ai_service
     * Update SyllabusUpload.extracted_structure, status="done"
   - import_syllabus_to_db(upload_id, override_structure, admin_id, db) â†’ dict
     * Upsert Subject + Topic records (merge subtopics if topic exists)
     * Return {subjects_created, topics_created}

4. backend/routers/syllabus.py
   - POST /upload  â†’ saves UploadFile, triggers background task
   - GET  /uploads â†’ list all
   - GET  /uploads/{id}
   - POST /uploads/{id}/import
   - DELETE /uploads/{id}

5. Wire both routers in main.py.

OUTPUT: scraper_service.py, scraper.py, syllabus_service.py, syllabus.py, updated main.py
```

---

## CHUNK 09 â€” ML Training Pipeline + Seed Data

**Required Skills:** [python-executor](C:/Users/rajee/.agents/skills/python-executor/SKILL.md)

```
You are implementing the offline ML training pipeline and database seeding for SmartExamPrep.

FIRST, read:
  phases/phase-09-ml-training-pipeline.md  (complete)
  phases/phase-03-seed-data.md             (complete)

TASK A â€” ML Training Pipeline (in ml/ folder):

1. ml/generate_synthetic_data.py
   - compute_weakness_score() â€” exact weighted formula matching WeaknessDetector formula
   - generate(n_samples=10000) â€” sample from Beta/Poisson/Normal distributions as specified
   - Save to ml/data/synthetic_train.csv

2. ml/train_weakness_model.py
   - Load CSV, split 80/20, Pipeline(StandardScaler + XGBRegressor)
   - XGB params: n_estimators=200, max_depth=6, lr=0.05, subsample=0.8
   - Print MAE, RÂ², 5-fold CV MAE, feature importances
   - Save to ml/models/weakness_model.pkl with joblib

3. ml/model_evaluation.py
   - Load model + CSV, compute regression metrics + classification report
     (label weak/moderate/strong, compare predicted vs true labels)

4. ml/export_model.py
   - Copy ml/models/weakness_model.pkl â†’ backend/ml/models/weakness_model.pkl

TASK B â€” Database Seed Script (in backend/ folder):

5. backend/seed.py
   - Create admin user: admin@smartexamprep.com / Admin@1234
   - Load full 11-subject JSON from phase-03-seed-data.md Section 1
   - Insert all Subject + Topic records with subtopics + nlp_tags
   - Insert 3 sample questions from phase-03-seed-data.md Section 2
   - Print success summary

6. backend/seed_data/subjects.json  â€” full JSON from phase-03 Section 1
7. backend/seed_data/questions.json â€” sample questions from phase-03 Section 2

OUTPUT: All ml/ scripts + backend/seed.py + seed_data/ JSON files
```

---

## CHUNK 10 â€” Frontend: Setup, API Client, Auth Store, Middleware

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are setting up the Next.js 14 frontend foundation for SmartExamPrep.

FIRST, read:
  phases/phase-06-frontend-ui.md   (Sections 1â€“4: Setup, API Client, Zustand, Middleware)

TASK (all files in frontend/ folder):

1. frontend/lib/api.ts
   - api (student Axios instance) + adminApi (admin Axios instance)
   - Both point to NEXT_PUBLIC_API_URL + /api (or /api/admin)
   - addAuthInterceptors() applied to both:
     * Request: inject Bearer token from localStorage
     * Response: 401 â†’ clear token + redirect /login
     * Response: 5xx â†’ retry once after 1s
     * Response: error â†’ show toast (import from @/components/ui/use-toast)

2. frontend/store/authStore.ts
   - Zustand + persist middleware
   - State: token, role ("student"|"admin"|null), user object
   - Actions: setAuth(token, role, user), logout()

3. frontend/store/dashboardStore.ts
   - State: readiness_score, weakest_topics, strongest_topics, subjects_progress,
             recent_scores, nlp_insight, isLoaded
   - Actions: setDashboard(data), setInsight(text)

4. frontend/middleware.ts
   - /admin/* routes: check jwt-decode(cookie token).role === "admin" or redirect /login or /dashboard
   - /dashboard, /quiz, /revision routes: check token exists or redirect /login

5. frontend/lib/validations.ts
   - loginSchema, registerSchema, questionSchema using Zod

6. frontend/app/layout.tsx (root layout)
   - Dark background, Inter font from next/font/google
   - Include NextTopLoader (indigo color, no spinner)
   - Include Toaster from shadcn

OUTPUT: api.ts, adminApi.ts, authStore.ts, dashboardStore.ts, middleware.ts, validations.ts, layout.tsx
```

---

## CHUNK 11 â€” Student Pages: Landing, Auth, Onboarding, Dashboard

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the student-facing pages for SmartExamPrep Next.js frontend.

FIRST, read:
  phases/phase-06-frontend-ui.md   (Sections 5â€“7: Landing, Auth, Dashboard)
  phases/phase-07-dashboard-design.md (Sections 3â€“5: all dashboard components)

TASK: Build these pages and components:

PAGES:
1. frontend/app/page.tsx â€” Landing Page
   - Dark gradient (slate-900 â†’ indigo-950), Navbar with Login/Get Started links
   - Hero: H1 + tagline + CTA button
   - 3 feature cards (Weakness Detection, Adaptive Quiz, Spaced Revision)

2. frontend/app/(auth)/login/page.tsx â€” Auth Page
   - Tab toggle: Login / Register
   - Form with email + password (+ name for register)
   - On login: setAuth() then redirect based on role (adminâ†’/admin, studentâ†’/dashboard)
   - Zod validation with react-hook-form

3. frontend/app/(student)/onboarding/page.tsx â€” Onboarding
   - Set daily_study_minutes (slider: 30â€“180) + experience_level (select)
   - PUT /api/auth/me to save, then redirect /quiz/diagnostic

4. frontend/app/(student)/dashboard/page.tsx â€” Dashboard
   - Fetch GET /api/analysis/dashboard on mount
   - Render: ReadinessGauge, WeaknessBar Ã— 3, subject progress bars, NLPInsightCard, quick action buttons
   - Fetch POST /api/ai/explain for top weak topic, set nlp_insight in store

COMPONENTS:
5. frontend/components/student/ReadinessGauge.tsx â€” SVG circular gauge (per phase-07 Section 4)
6. frontend/components/student/WeaknessBar.tsx â€” horizontal bar with mastery label
7. frontend/components/student/NLPInsightCard.tsx â€” gradient card with AI insight text
8. frontend/components/shared/LoadingSpinner.tsx â€” centered spinner with message
9. frontend/components/shared/EmptyState.tsx â€” icon + title + description + optional CTA

Use Tailwind dark theme throughout (slate-900 backgrounds, indigo accents).

OUTPUT: All page files + 5 component files
```

---

## CHUNK 12 â€” Student Quiz Pages + Revision Page

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the quiz and revision pages for SmartExamPrep student frontend.

FIRST, read:
  phases/phase-06-frontend-ui.md   (Sections 8 for Diagnostic Quiz)
  phases/phase-07-dashboard-design.md (Section 6: Revision Page)

TASK:

1. frontend/app/(student)/quiz/diagnostic/page.tsx
   - Fetch GET /api/quiz/diagnostic on mount â†’ questions array
   - Show one question at a time with QuizCard component
   - Track selected answer + time_taken_s per question
   - "Next" button advances, last question shows "Submit"
   - POST /api/quiz/submit â†’ redirect to /quiz/result/[attempt_id]

2. frontend/app/(student)/quiz/adaptive/page.tsx
   - Same structure as diagnostic but fetches GET /api/quiz/adaptive
   - Show "Today's AI-Recommended Quiz" header with weak topic badges

3. frontend/app/(student)/quiz/result/[attemptId]/page.tsx
   - Fetch result from Zustand or re-fetch attempt data
   - Show: score %, correct count, per-topic performance breakdown
   - WeaknessBar for each topic with before/after comparison
   - CTA: "Go to Dashboard" or "Take Another Quiz"

4. frontend/app/(student)/revision/page.tsx
   - Fetch GET /api/revision/plan
   - Empty state if no revisions due: "ðŸŽ‰ All caught up!"
   - List of RevisionItem cards with topic name, due date, last score, interval
   - "Done âœ“" button calls POST /api/revision/mark-done then refreshes

5. frontend/components/student/QuizCard.tsx
   - Props: question, selectedAnswer, onSelect(optionLetter)
   - Shows question text + all question images (if any), then 4 option buttons with selection highlighting
   - Difficulty badge top-right, subject/topic label

6. frontend/components/student/RevisionItem.tsx
   - Topic name, subject, due date (red if overdue), last score, interval days
   - "Mark Done" button

OUTPUT: diagnostic quiz, adaptive quiz, result, revision pages + QuizCard + RevisionItem components
```

---

## CHUNK 13 â€” Admin Layout + Dashboard + Subjects Manager

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the admin panel pages for SmartExamPrep.

FIRST, read:
  phases/phase-11-admin-panel.md   (Sections 1â€“3: Overview, Dashboard, Subjects Manager)
  phases/phase-06-frontend-ui.md   (Sections 9â€“10: Admin Layout, AdminSidebar, AdminGuard)

TASK:

1. frontend/app/admin/layout.tsx
   - Wraps all /admin/* pages with AdminGuard + AdminSidebar
   - Full-height flex layout: sidebar left, content right

2. frontend/components/admin/AdminGuard.tsx
   - Client component: reads role from authStore
   - If !token â†’ redirect /login, if role !== "admin" â†’ redirect /dashboard
   - Returns null while checking

3. frontend/components/admin/AdminSidebar.tsx
   - Fixed left sidebar (w-64, slate-900 bg)
   - Nav links: Dashboard, Subjects, Questions, Scraper, Syllabus (with icons)
   - Badge on Questions: fetches unverified count, shows red pill
   - Active route highlighted in indigo

4. frontend/app/admin/page.tsx â€” Admin Dashboard
   - Fetch stats from 4â€“5 API calls in parallel (Promise.all)
   - 6 stat cards: Total Questions, Unverified (red), Subjects, Topics, Scrape Jobs, PDF Uploads
   - Alert banner if unverified > 0 with link to /admin/questions?is_verified=false
   - 3 quick action cards (Scrape, Upload Syllabus, Manage Questions)

5. frontend/app/admin/subjects/page.tsx â€” Subjects Manager
   - Fetch GET /api/admin/content/subjects
   - Accordion list: click subject row â†’ expands to show its topics
   - Add Subject button â†’ dialog with SubjectCreate form
   - Per subject: inline edit name, delete button with AlertDialog confirm
   - Per topic: name + subtopic count + Edit/Delete buttons

6. frontend/components/admin/SubtopicChipEditor.tsx
   - Array of chips with Ã— remove button
   - Input + Add button (Enter key also adds)
   - Used inside topic create/edit dialog

OUTPUT: layout.tsx, AdminGuard, AdminSidebar, admin page, subjects page, SubtopicChipEditor
```

---

## CHUNK 14 â€” Admin Questions Manager + Question Form

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the Questions Manager admin page for SmartExamPrep.

FIRST, read:
  phases/phase-11-admin-panel.md   (Section 5: Questions Manager layout and columns)
  phases/phase-06-frontend-ui.md   (Section 12: Admin Questions Page full code)

TASK:

1. frontend/app/admin/questions/page.tsx
   - Filter bar: search input, difficulty pills, source_type pills, "Unverified Only" toggle
   - Paginated data table (PAGE_SIZE=20) with columns:
     Checkbox | Question (truncated) | Topic | Difficulty (badge) | Source | Verified | Actions
   - Multi-select checkboxes â†’ "Verify X selected" button appears
   - Actions per row: Verify âœ“ (optimistic update), Delete (AlertDialog confirm)
   - Pagination controls (Prev / Next with count display)
   - "+ Add Question" button â†’ opens QuestionFormModal

2. frontend/components/admin/QuestionFormModal.tsx
   - Full-screen modal overlay
   - Fields: question_text (textarea), options Aâ€“D (4 inputs), correct_answer (select),
             explanation (textarea), question_image_urls (multi-input), difficulty (select), source_type (select),
             subject_id (select from API), topic_id (select filtered by subject)
   - Zod validation (questionSchema from validations.ts)
   - Submits POST or PUT based on whether question prop is passed
   - Loading state on submit button

3. frontend/app/admin/questions/[id]/page.tsx â€” Question Detail/Edit
   - Two-column layout: edit form (left) + preview panel (right)
   - Preview renders question exactly as student sees it
   - Verify button (if not verified): POST /api/admin/questions/{id}/verify
   - NLP tags display (chips, read-only)
   - Save changes button

OUTPUT: questions/page.tsx, QuestionFormModal.tsx, questions/[id]/page.tsx
```

---

## CHUNK 15 â€” Admin Scraper Page

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the URL Scraper admin page for SmartExamPrep.

FIRST, read:
  phases/phase-11-admin-panel.md   (Section 7: Scraper Page full workflow)
  phases/phase-06-frontend-ui.md   (Section 13: Scraper Page full code)

TASK:

1. frontend/hooks/useScrapeJobPoller.ts
   - Accepts jobId: string | null
   - Uses setInterval (3000ms) to poll GET /api/admin/scraper/jobs/{jobId}
   - Stops polling when status === "done" or "failed"
   - Returns current job data
   - Clears interval on unmount

2. frontend/app/admin/scraper/page.tsx
   - URL input + "Scrape" button â†’ POST /start, then start polling
   - Active job section:
     * Status badge (pending=yellow, processing=blue, done=green, failed=red)
     * "Scraping and classifying with AI..." pulse text when processing
     * Extracted questions table when done:
          - Per question: detected subjectâ†’topicâ†’subtopic tag, question text, question images (0..n), options (correct highlighted green), explanation
       - Per row: "Accept âœ…" / "Reject âŒ" toggle button
     * "Import X Accepted" button â†’ POST /jobs/{id}/import { accepted_indices }
     * Error message if failed
   - Past jobs list below: ScrapeJobCard Ã— n

3. frontend/components/admin/ScrapeJobCard.tsx
   - Shows: URL (truncated), date, extracted count, imported count, status badge
   - onClick â†’ sets as active job to review

OUTPUT: useScrapeJobPoller.ts, scraper/page.tsx, ScrapeJobCard.tsx
```

---

## CHUNK 16 â€” Admin Syllabus Upload Page

**Required Skills:** [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [tailwind-design-system](C:/Users/rajee/.agents/skills/tailwind-design-system/SKILL.md)

```
You are building the PDF Syllabus Upload admin page for SmartExamPrep.

FIRST, read:
  phases/phase-11-admin-panel.md   (Section 8: Syllabus Upload workflow)
  phases/phase-06-frontend-ui.md   (Section 14: Syllabus Upload Page full code)

TASK:

1. frontend/app/admin/syllabus/page.tsx
   - File input section styled as drag-and-drop dropzone (dashed border, slate-900 bg)
   - Accept .pdf files only
   - On upload: POST /api/admin/syllabus/upload with FormData
     * Track upload progress via Axios onUploadProgress â†’ show progress bar (0â€“100%)
   - Poll GET /api/admin/syllabus/uploads/{id} every 2s until status done/failed
   - When done: render SyllabusTreeViewer with extracted_structure
   - "Import to Database" button â†’ POST /api/admin/syllabus/uploads/{id}/import
   - Success toast: "âœ… X subjects + Y topics imported"
   - Error display if status === "failed"
   - Past uploads list at bottom (filename, status, subjects_imported, topics_imported)

2. frontend/components/admin/SyllabusTreeViewer.tsx
   - Renders {subjects: [{name, topics: [{name, subtopics}]}]} JSON
   - Each subject is a <details> / <summary> expandable section
   - Topics listed inside with subtopics as small chip badges
   - Shows subject count + topic count in summary line

OUTPUT: syllabus/page.tsx, SyllabusTreeViewer.tsx
```

---

## CHUNK 17 â€” MVP Polish: Error Handling, Loading States, Validation

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [nextjs-developer](C:/Users/rajee/.agents/skills/nextjs-developer/SKILL.md), [vercel-react-best-practices](C:/Users/rajee/.agents/skills/vercel-react-best-practices/SKILL.md), [frontend-design](C:/Users/rajee/.agents/skills/frontend-design/SKILL.md)

```
You are adding production-quality polish to SmartExamPrep.

FIRST, read this ENTIRE file:
  phases/phase-10-mvp-polish.md

TASK:

FRONTEND:
1. Update frontend/lib/api.ts with full interceptor setup:
   - Retry once on 5xx (with 1s delay, config._retried flag)
   - Show error toast on all failed requests (extract detail from response or fallback message)
   - 401 â†’ clear token + redirect /login

2. frontend/components/shared/LoadingSpinner.tsx â€” centered spinner + message prop
3. frontend/components/shared/EmptyState.tsx â€” icon, title, description, optional CTA link

4. Apply to all student pages:
   - Loading state: show <LoadingSpinner /> while fetching
   - Empty state: show <EmptyState /> when data is empty (e.g., no quiz history)

5. Apply to admin pages:
   - Optimistic UI for verify action: immediately flip is_verified in state, rollback on error
   - AlertDialog confirmation before any delete or bulk-delete
   - Toast on every admin mutation (create/update/delete/verify/import)

BACKEND:
6. backend/main.py â€” add global exception handlers:
   - StarletteHTTPException handler â†’ JSON {detail, status_code}
   - RequestValidationError handler â†’ JSON {detail, errors: [{field, message}]}
   - Generic Exception handler â†’ 500 JSON + log to stderr

7. Add FastAPI request logging middleware (log method + path + status_code)

8. frontend/app/layout.tsx â€” add NextTopLoader from nextjs-toploader (color: "#6366f1")

OUTPUT: Updated api.ts, main.py, layout.tsx + LoadingSpinner + EmptyState components applied everywhere
```

---

## CHUNK 18 â€” Deployment Configuration

**Required Skills:** [backend-architect](C:/Users/rajee/.agents/skills/backend-architect/SKILL.md), [vercel-services](C:/Users/rajee/.agents/skills/vercel-services/SKILL.md), [github-actions](C:/Users/rajee/.agents/skills/github-actions/SKILL.md)

```
You are finalizing deployment configuration for SmartExamPrep.

FIRST, read:
  phases/phase-01-product-architecture.md  (Section on Hosting)

TASK:

1. backend/Dockerfile (production-ready):
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   RUN python -m spacy download en_core_web_sm
   COPY . .
   RUN mkdir -p uploads/syllabi ml/models
   EXPOSE 8000
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

2. docker-compose.yml (complete):
   - postgres:15 service with POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, volume
   - backend service: build from ./backend, depends_on postgres, env_file .env, port 8000
   - Add healthcheck for postgres

3. frontend/vercel.json:
   { "rewrites": [{ "source": "/api/:path*", "destination": "http://YOUR_BACKEND_URL/api/:path*" }] }
   (placeholder URL with comment to replace)

4. .env.example (complete, with comments):
   DATABASE_URL=postgresql://postgres:password@localhost:5432/smartexamprep
   JWT_SECRET=change-this-to-32-char-random-string
   OPENROUTER_API_KEY / GROQ_API_KEY=your-openrouter-or-groq-api-key-from-google-ai-studio
   NEXT_PUBLIC_API_URL=http://localhost:8000

5. README.md (complete setup guide):
   ## Quick Start
   ### Backend
   1. cp .env.example .env && fill in values
   2. docker-compose up -d postgres
   3. cd backend && pip install -r requirements.txt
   4. python -m spacy download en_core_web_sm
   5. alembic upgrade head
   6. python seed.py
   7. uvicorn main:app --reload

   ### ML Training (optional)
   1. cd ml && pip install -r requirements.txt
   2. python generate_synthetic_data.py
   3. python train_weakness_model.py
   4. python export_model.py

   ### Frontend
   1. cd frontend && npm install
   2. cp .env.example .env.local && set NEXT_PUBLIC_API_URL
   3. npm run dev â†’ http://localhost:3000

   ### Admin Login
   Email: admin@smartexamprep.com / Password: Admin@1234

OUTPUT: Dockerfile, docker-compose.yml, vercel.json, .env.example, README.md
```

---

## Quick Reference: File-to-Phase Mapping

| Chunk | Files Created | Phase Reference |
|---|---|---|
| 01 | Scaffold, requirements, Dockerfile | phase-01 |
| 02 | models.py, schemas/, alembic/ | phase-02 |
| 03 | auth_service.py, dependencies.py, auth.py | phase-05 (auth) |
| 04 | weakness_detector.py, spaced_revision.py, nlp_pipeline.py, adaptive_recommender.py | phase-04 |
| 05 | quiz/analysis/revision/content/ai routers + services | phase-05 |
| 06 | ai_service.py | phase-08 |
| 07 | admin_content.py, admin_questions.py | phase-05, phase-11 |
| 08 | scraper_service.py, syllabus_service.py, routers | phase-05, phase-08 |
| 09 | ml/scripts, backend/seed.py, seed_data/ | phase-09, phase-03 |
| 10 | api.ts, stores, middleware.ts, layout.tsx | phase-06 |
| 11 | Landing, Auth, Onboarding, Dashboard + components | phase-06, phase-07 |
| 12 | Diagnostic, Adaptive, Result, Revision pages | phase-06, phase-07 |
| 13 | Admin layout, sidebar, guard, admin dashboard, subjects | phase-11, phase-06 |
| 14 | Questions manager, QuestionFormModal, question detail | phase-11, phase-06 |
| 15 | Scraper page, ScrapeJobCard, polling hook | phase-11, phase-06 |
| 16 | Syllabus upload page, SyllabusTreeViewer | phase-11, phase-06 |
| 17 | Global error handling, polish, interceptors | phase-10 |
| 18 | Dockerfile, docker-compose, README | phase-01 |

---

## PYQ Image Support Addendum

- Treat `question_image_urls` as mandatory in Question schemas and API payload shapes (default `[]`).
- Scraper/AI output must carry image URLs for image-based PYQs.
- Student and admin question UIs must render multiple images safely and responsively.


