# Existing System Map

## Current Repo Shape

```text
SmartExamPrep/
â”œâ”€ backend/
â”‚  â”œâ”€ main.py
â”‚  â”œâ”€ config.py / database.py / dependencies.py
â”‚  â”œâ”€ models/models.py
â”‚  â”œâ”€ routers/
â”‚  â”œâ”€ services/
â”‚  â”œâ”€ schemas/
â”‚  â”œâ”€ ml/
â”‚  â”œâ”€ alembic/
â”‚  â”œâ”€ seed.py / seed_demo.py
â”‚  â””â”€ tests/
â”œâ”€ frontend/
â”‚  â”œâ”€ app/
â”‚  â”œâ”€ components/
â”‚  â”œâ”€ hooks/
â”‚  â”œâ”€ lib/
â”‚  â”œâ”€ store/
â”‚  â””â”€ tests/e2e/
â”œâ”€ ml/
â”‚  â”œâ”€ data/
â”‚  â”œâ”€ models/
â”‚  â””â”€ training / evaluation scripts
â””â”€ docs/
```

## Frontend Map

### Routing structure

| Route | File | Purpose |
| --- | --- | --- |
| `/` | `frontend/app/page.tsx` | Marketing landing page |
| `/login` | `frontend/app/(auth)/login/page.tsx` | Login + registration |
| `/onboarding` | `frontend/app/(student)/onboarding/page.tsx` | Basic study preference capture |
| `/dashboard` | `frontend/app/(student)/dashboard/page.tsx` | Student readiness and weak-topic dashboard |
| `/quiz/diagnostic` | `frontend/app/(student)/quiz/diagnostic/page.tsx` | Baseline quiz |
| `/quiz/adaptive` | `frontend/app/(student)/quiz/adaptive/page.tsx` | Weakness-driven quiz |
| `/quiz/result/[attemptId]` | `frontend/app/(student)/quiz/result/[attemptId]/page.tsx` | Result + comparison page |
| `/revision` | `frontend/app/(student)/revision/page.tsx` | Due revision list |
| `/feedback` | `frontend/app/(student)/feedback/page.tsx` | Student feedback form/history |
| `/admin` | `frontend/app/admin/page.tsx` | Admin dashboard |
| `/admin/subjects` | `frontend/app/admin/subjects/page.tsx` | Subject/topic CRUD |
| `/admin/questions` | `frontend/app/admin/questions/page.tsx` | Question list, filter, verify, create |
| `/admin/questions/[id]` | `frontend/app/admin/questions/[id]/page.tsx` | Question detail + preview |
| `/admin/scraper` | `frontend/app/admin/scraper/page.tsx` | Scrape jobs + import review |
| `/admin/syllabus` | `frontend/app/admin/syllabus/page.tsx` | Syllabus upload + import |

### Frontend state and auth flow

| File | Current responsibility |
| --- | --- |
| `frontend/store/authStore.ts` | Persists token, role, and user profile to localStorage; also writes a `token` cookie for Next middleware |
| `frontend/store/dashboardStore.ts` | Stores readiness, weak topics, strong topics, subject progress, AI insight |
| `frontend/store/quizStore.ts` | Persists latest quiz result snapshot for the result page |
| `frontend/middleware.ts` | Protects student/admin routes using the `token` cookie and `jwt-decode` role parsing |
| `frontend/lib/api.ts` | Axios clients, auth header injection, 401 redirect, retry on 5xx |

### Student UI components already present

| Component | Use |
| --- | --- |
| `components/student/QuizCard.tsx` | Shared question renderer for diagnostic, adaptive, and admin preview |
| `components/student/WeaknessBar.tsx` | Topic weakness visualization |
| `components/student/ReadinessGauge.tsx` | Circular readiness score |
| `components/student/RevisionItem.tsx` | Revision task card |
| `components/student/NLPInsightCard.tsx` | AI explanation panel |

### Admin UI components already present

| Component | Use |
| --- | --- |
| `components/admin/AdminGuard.tsx` | Client-side admin role guard |
| `components/admin/AdminSidebar.tsx` | Sidebar navigation + unverified count |
| `components/admin/QuestionFormModal.tsx` | Add/edit question modal |
| `components/admin/SubtopicChipEditor.tsx` | Topic subtopic/tag editing |
| `components/admin/ScrapeJobCard.tsx` | Scrape history row |
| `components/admin/SyllabusTreeViewer.tsx` | Parsed syllabus visualization |

### Current frontend behavior pattern

- Almost all feature pages are client components.
- Data fetching is browser-side through Axios, not server components.
- Page-specific loading/error states are handled inside each page component.
- Zustand is used sparingly and only for auth/dashboard/quiz snapshot state.

## Backend Map

### API entry and infrastructure

| File | Role |
| --- | --- |
| `backend/main.py` | FastAPI app, middleware, exception handlers, startup loading, router registration |
| `backend/config.py` | Settings loading from `.env` |
| `backend/database.py` | SQLAlchemy engine/session |
| `backend/dependencies.py` | DB dependency + current user/admin resolution |

### Router map

| Router | Prefix | Current responsibility |
| --- | --- | --- |
| `auth.py` | `/api/auth` | Register, login, current user, profile update |
| `quiz.py` | `/api/quiz` | Diagnostic questions, adaptive questions, submit, result snapshot load |
| `analysis.py` | `/api/analysis` | Weakness list, dashboard snapshot, analytics metrics |
| `revision.py` | `/api/revision` | Due revision list, mark-done |
| `content.py` | `/api/content` | Student-readable subjects/topics |
| `ai.py` | `/api/ai` | Weak-topic explanation |
| `feedback.py` | `/api/feedback` | Student feedback create/list + admin recent list |
| `admin_content.py` | `/api/admin/content` | Subject/topic CRUD |
| `admin_questions.py` | `/api/admin/questions` | Question CRUD, verify, bulk verify |
| `scraper.py` | `/api/admin/scraper` | Scrape job start/list/detail/import/delete |
| `syllabus.py` | `/api/admin/syllabus` | Upload/list/detail/import/delete syllabus |

### Service map

| Service | Role |
| --- | --- |
| `auth_service.py` | Password hashing, user create/auth, JWT create |
| `quiz_service.py` | Diagnostic selection, submission processing, result snapshot building |
| `weakness_service.py` | Topic mastery update, revision schedule update, weakness readout |
| `recommendation_service.py` | Adaptive quiz candidate scoring and selection |
| `dashboard_service.py` | Student dashboard snapshot |
| `metrics_service.py` | Research/demo metrics snapshot |
| `ai_service.py` | Explanation generation, scraper classification, syllabus parsing |
| `scraper_service.py` | HTML parsing and question import |
| `syllabus_service.py` | PDF extraction and syllabus import |

### Current DB model map

| Table / model | Purpose |
| --- | --- |
| `users` | Auth identity, role, study minutes, experience level |
| `subjects` | Top-level syllabus grouping |
| `topics` | Subject topics with subtopics, NLP tags, display order, difficulty weight |
| `questions` | Question bank entries with source, year, verification, images |
| `quiz_attempts` | Submitted attempts, answers JSON, result snapshot |
| `topic_masteries` | Derived user-topic performance state |
| `revision_schedules` | Due revision schedule per user/topic |
| `scrape_jobs` | URL scrape background job records |
| `syllabus_uploads` | Uploaded PDF parsing records |
| `user_feedback` | Student product feedback |

### Current migration history

| Migration | Scope |
| --- | --- |
| `b16989f61b2d_initial_schema.py` | Initial subjects/users/questions/mastery/revision/scraper/syllabus schema |
| `1c2d8f4a9b71_add_result_snapshot_and_feedback.py` | Adds `quiz_attempts.result_snapshot` and `user_feedback` |

## ML / AI Map

### Runtime ML modules used by the backend

| File | Runtime use |
| --- | --- |
| `backend/ml/weakness_detector.py` | Computes weakness score and mastery level |
| `backend/ml/adaptive_recommender.py` | Selects adaptive practice questions |
| `backend/ml/spaced_revision.py` | Calculates next revision interval |
| `backend/ml/nlp_pipeline.py` | Extracts tags, creates embeddings, duplicate detection |

### Offline ML pipeline

| File | Current role |
| --- | --- |
| `ml/generate_synthetic_data.py` | Produces training CSV from the formula |
| `ml/train_weakness_model.py` | Trains XGBoost regressor |
| `ml/model_evaluation.py` | Evaluates regression/classification quality |
| `ml/export_model.py` | Copies trained model into `backend/ml/models/` |

### Current AI prompt use

| Prompt | Purpose |
| --- | --- |
| `WEAKNESS_PROMPT` | Student-friendly weak-topic explanation |
| `SCRAPER_PROMPT` | Converts scraped text to structured question JSON |
| `SYLLABUS_PROMPT` | Converts PDF text to syllabus JSON |

## How Data Flows Today

## 1. Auth and onboarding flow

```text
Login/Register page
  -> POST /api/auth/register or /api/auth/login
  -> token stored in localStorage + cookie by authStore
  -> Next middleware allows protected routes
  -> onboarding page PUT /api/auth/me
  -> users.daily_study_minutes and users.experience_level updated
```

## 2. Diagnostic quiz flow

```text
/quiz/diagnostic
  -> GET /api/quiz/diagnostic
  -> quiz_service.get_diagnostic_questions()
  -> verified questions sampled by topic
  -> submit via POST /api/quiz/submit
  -> QuizAttempt row created
  -> TopicMastery updated
  -> RevisionSchedule updated
  -> result_snapshot stored
  -> frontend redirects to /quiz/result/[attemptId]
```

## 3. Adaptive quiz flow

```text
/quiz/adaptive
  -> GET /api/analysis/weakness
  -> GET /api/quiz/adaptive
  -> recommendation_service.get_adaptive_questions()
  -> TopicMastery + recent QuizAttempt answers + embeddings used
  -> submit uses same /api/quiz/submit pipeline
```

## 4. Dashboard flow

```text
/dashboard
  -> GET /api/analysis/dashboard
  -> dashboard_service aggregates:
       TopicMastery
       QuizAttempt recent scores
       Subject averages
  -> frontend separately POSTs /api/ai/explain for weakest topic
  -> explanation saved in dashboard store only
```

## 5. Revision flow

```text
/revision
  -> GET /api/revision/plan
  -> RevisionSchedule rows due now and not done
  -> POST /api/revision/mark-done
  -> schedule marked complete by topic_id
```

## 6. Admin question/content flow

```text
Admin UI
  -> /api/admin/content/* for subject/topic CRUD
  -> /api/admin/questions/* for question CRUD
  -> question create/update uses NLP tag extraction
  -> student quiz endpoints read from verified questions
```

## 7. Scraper flow

```text
Admin scraper page
  -> POST /api/admin/scraper/start
  -> ScrapeJob created
  -> BackgroundTasks runs scraper_service.run_scrape_job()
  -> fetch remote HTML
  -> parse candidate blocks with BeautifulSoup
  -> AI classifies them
  -> extracted_questions stored on ScrapeJob
  -> admin accepts indices
  -> POST /api/admin/scraper/jobs/{job_id}/import
  -> questions inserted into Question table
```

## 8. Syllabus flow

```text
Admin syllabus page
  -> POST /api/admin/syllabus/upload
  -> SyllabusUpload created
  -> BackgroundTasks runs syllabus_service.process_syllabus_upload()
  -> PDF text extracted with pdfplumber
  -> AI parses subject/topic structure
  -> extracted_structure stored
  -> admin imports
  -> subjects/topics inserted or merged
```

## Current Data Lifecycle

### User progress lifecycle

- raw answers are stored in `quiz_attempts.answers`
- aggregated topic state is stored in `topic_masteries`
- revision due state is stored in `revision_schedules`
- result-page analytics are persisted in `quiz_attempts.result_snapshot`

### Analytics lifecycle

- dashboard reads current `topic_masteries` and recent `quiz_attempts`
- metrics read `quiz_attempts`, `topic_masteries`, and `revision_schedules`
- no dedicated historical dashboard table exists

### Content lifecycle

- content enters through seed files, admin CRUD, scraper import, or syllabus import
- student flows only consume verified questions

## What Is Missing In The Current System Map

The following domains do not yet have first-class storage or routes:

- roadmap generation
- daily planner generation
- planner carry-forward state
- study activity logging beyond quizzes/revision
- PYQ browse/practice surfaces for students
- chatbot session/message history

That absence is the main architectural gap between the current product and the requested upgrade set.

