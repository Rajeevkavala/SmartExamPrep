# PHASE 1 — PRODUCT ARCHITECTURE

> **Goal:** Define the complete blueprint of SmartExamPrep — folder structure, feature breakdown, page list, component list, API route list, DB schema overview, ML pipeline, and user flows.

---

## 1. Monorepo Folder Structure

```
SmartExamPrep/
├── frontend/                          # Next.js 14 App Router
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (student)/
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── quiz/
│   │   │   │   ├── diagnostic/page.tsx
│   │   │   │   ├── adaptive/page.tsx
│   │   │   │   └── result/[attemptId]/page.tsx
│   │   │   └── revision/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx             # AdminGuard + AdminSidebar wrapper
│   │   │   ├── page.tsx               # Admin Dashboard
│   │   │   ├── subjects/
│   │   │   │   ├── page.tsx           # Subjects Manager
│   │   │   │   └── [id]/topics/page.tsx
│   │   │   ├── questions/
│   │   │   │   ├── page.tsx           # Questions Manager (data table)
│   │   │   │   └── [id]/page.tsx      # Question Detail / Edit
│   │   │   ├── scraper/page.tsx       # URL Scraper Tool
│   │   │   └── syllabus/page.tsx      # PDF Syllabus Upload
│   │   ├── layout.tsx                 # Root layout
│   │   └── page.tsx                   # Landing Page
│   ├── components/
│   │   ├── shared/                    # Shared across student + admin
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorToast.tsx
│   │   ├── student/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── TopicBadge.tsx
│   │   │   ├── WeaknessBar.tsx
│   │   │   ├── ReadinessGauge.tsx
│   │   │   ├── RevisionItem.tsx
│   │   │   └── ProgressChart.tsx
│   │   └── admin/
│   │       ├── AdminSidebar.tsx
│   │       ├── AdminGuard.tsx
│   │       ├── DataTable.tsx
│   │       ├── SubtopicChipEditor.tsx
│   │       ├── QuestionFormModal.tsx
│   │       ├── ScrapeJobCard.tsx
│   │       ├── ScrapedQuestionReview.tsx
│   │       ├── SyllabusTreeViewer.tsx
│   │       └── PDFDropzone.tsx
│   ├── lib/
│   │   ├── api.ts                     # Axios student API client
│   │   ├── adminApi.ts                # Axios admin API client
│   │   └── utils.ts
│   ├── store/
│   │   ├── authStore.ts               # Zustand: user, role, token
│   │   └── dashboardStore.ts          # Zustand: dashboard state
│   ├── middleware.ts                  # Role-based route protection
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── backend/                           # FastAPI (Python)
│   ├── main.py                        # App entry, lifespan, CORS, routers
│   ├── config.py                      # Settings (env vars, DB URL, JWT secret)
│   ├── database.py                    # SQLAlchemy engine + session
│   ├── dependencies.py                # get_db, get_current_user, require_admin
│   ├── models/
│   │   └── models.py                  # All SQLAlchemy ORM models
│   ├── schemas/
│   │   ├── auth_schemas.py
│   │   ├── quiz_schemas.py
│   │   ├── analysis_schemas.py
│   │   ├── revision_schemas.py
│   │   ├── admin_schemas.py
│   │   ├── scraper_schemas.py
│   │   └── syllabus_schemas.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── quiz.py
│   │   ├── analysis.py
│   │   ├── revision.py
│   │   ├── content.py
│   │   ├── ai.py
│   │   ├── admin_content.py
│   │   ├── admin_questions.py
│   │   ├── scraper.py
│   │   └── syllabus.py
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── quiz_service.py
│   │   ├── weakness_service.py
│   │   ├── recommendation_service.py
│   │   ├── revision_service.py
│   │   ├── gemini_service.py
│   │   ├── scraper_service.py
│   │   └── syllabus_service.py
│   ├── ml/
│   │   ├── weakness_detector.py       # WeaknessDetector class
│   │   ├── adaptive_recommender.py    # AdaptiveRecommender class
│   │   ├── spaced_revision.py         # SpacedRevisionScheduler class
│   │   ├── nlp_pipeline.py            # NLP tagging + embeddings
│   │   └── models/
│   │       └── weakness_model.pkl     # Trained model (joblib)
│   ├── uploads/
│   │   └── syllabi/                   # Uploaded PDF storage
│   ├── alembic/                       # DB migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
├── ml/                                # Offline ML training pipeline
│   ├── train_weakness_model.py
│   ├── feature_engineering.py
│   ├── model_evaluation.py
│   ├── generate_synthetic_data.py
│   ├── export_model.py
│   └── models/
│       └── weakness_model.pkl
│
├── docker-compose.yml                 # PostgreSQL + backend + frontend
├── .env.example
└── README.md
```

---

## 2. Feature Breakdown

### Student Features
| Feature | Description |
|---|---|
| Registration / Login | Email + password auth, JWT token |
| Onboarding | Set daily study time, experience level |
| Diagnostic Quiz | 20-question initial quiz across all subjects |
| Weakness Analysis | ML-powered weak topic detection with scores |
| Adaptive Quiz | Daily quiz recommended by ML engine |
| Spaced Revision | SM-2 based topic revision scheduling |
| Dashboard | Readiness score, weak topics, progress charts |
| NLP Insights | Gemini-generated plain English feedback |

### Admin Features
| Feature | Description |
|---|---|
| Admin Dashboard | Stats: questions, subjects, scrape jobs, unverified count |
| Subjects Manager | Full CRUD for subjects |
| Topics Manager | Full CRUD for topics + subtopics chip editor |
| Questions Manager | Full CRUD for PYQs/practice questions with filters |
| Question Verification | Approve scraped questions before they go live |
| URL Scraper | Paste URL → auto-extract + classify questions with Gemini |
| Syllabus PDF Upload | Upload PDF → Gemini extracts subject/topic tree → import to DB |

---

## 3. Page List (Next.js)

### Student Pages
| Route | Page |
|---|---|
| `/` | Landing Page |
| `/login` | Login / Register (tabs) |
| `/onboarding` | Onboarding setup |
| `/dashboard` | Main student dashboard |
| `/quiz/diagnostic` | Diagnostic quiz |
| `/quiz/adaptive` | Today's adaptive quiz |
| `/quiz/result/[id]` | Quiz result + weakness breakdown |
| `/revision` | Spaced revision plan |

### Admin Pages (role-protected)
| Route | Page |
|---|---|
| `/admin` | Admin Dashboard |
| `/admin/subjects` | Subjects Manager |
| `/admin/subjects/[id]/topics` | Topics Manager |
| `/admin/questions` | Questions Manager (data table) |
| `/admin/questions/[id]` | Question Detail / Edit |
| `/admin/scraper` | URL Scraper Tool |
| `/admin/syllabus` | PDF Syllabus Upload |

---

## 4. Component List

### Shared Components
- `Navbar` — top navigation with role-aware links
- `Footer` — minimal footer
- `LoadingSpinner` — centered spinner
- `EmptyState` — illustrated empty state with CTA
- `ErrorToast` — ShadCN toast wrapper

### Student Components
- `QuizCard` — single question with options
- `QuizTimer` — countdown timer per question
- `TopicBadge` — colored badge (Weak / Moderate / Strong)
- `WeaknessBar` — horizontal bar showing weakness score
- `ReadinessGauge` — circular gauge for overall readiness
- `RevisionItem` — single topic revision card with due date
- `ProgressChart` — recharts line/bar chart for performance
- `NLPInsightCard` — Gemini-generated text card

### Admin Components
- `AdminSidebar` — fixed left sidebar with navigation links + badge counts
- `AdminGuard` — redirect non-admins to `/dashboard`
- `DataTable` — reusable sortable/filterable/paginated table (ShadCN)
- `SubtopicChipEditor` — chip multi-select for subtopic tags
- `QuestionFormModal` — full question create/edit form in modal
- `ScrapeJobCard` — job card with URL, status badge, question count
- `ScrapedQuestionReview` — side-by-side raw + structured + accept/reject
- `SyllabusTreeViewer` — collapsible tree of subject → topic → subtopics
- `PDFDropzone` — drag-and-drop PDF upload with Axios progress

---

## 5. FastAPI Route List

```
/api/auth/register          POST   Register student
/api/auth/login             POST   JWT login
/api/auth/me                GET    Get current user

/api/quiz/diagnostic        GET    Fetch diagnostic quiz questions
/api/quiz/submit            POST   Submit quiz answers
/api/quiz/adaptive          GET    Get ML-recommended quiz

/api/analysis/weakness      GET    ML weakness scores per topic
/api/analysis/dashboard     GET    Full dashboard summary

/api/revision/plan          GET    Today's revision plan
/api/revision/mark-done     POST   Mark revision topic done

/api/content/subjects               GET    All subjects
/api/content/subjects/{id}/topics   GET    Topics for a subject

/api/ai/explain             POST   NLP + Gemini weakness explanation

# Admin — Content
/api/admin/content/subjects                     GET/POST
/api/admin/content/subjects/{id}                PUT/DELETE
/api/admin/content/subjects/{id}/topics         GET/POST
/api/admin/content/topics/{id}                  PUT/DELETE

# Admin — Questions
/api/admin/questions                POST/GET (paginated + filtered)
/api/admin/questions/{id}           GET/PUT/DELETE
/api/admin/questions/{id}/verify    POST
/api/admin/questions/bulk-verify    POST

# Admin — Scraper
/api/admin/scraper/start            POST   Submit URL to scrape
/api/admin/scraper/jobs             GET    List scrape jobs
/api/admin/scraper/jobs/{id}        GET    Job status + questions
/api/admin/scraper/jobs/{id}/import POST   Import verified questions
/api/admin/scraper/jobs/{id}        DELETE

# Admin — Syllabus
/api/admin/syllabus/upload          POST   Upload PDF
/api/admin/syllabus/uploads         GET    List uploads
/api/admin/syllabus/uploads/{id}    GET    Get extracted tree
/api/admin/syllabus/uploads/{id}/import POST Import to DB
/api/admin/syllabus/uploads/{id}    DELETE
```

---

## 6. Database Schema Overview

| Model | Purpose |
|---|---|
| `User` | Student or Admin, JWT auth, role field |
| `Subject` | Top-level GATE CSE subject (e.g., OS, DBMS) |
| `Topic` | Sub-unit of a subject with subtopics JSON |
| `Question` | PYQ / practice / scraped question with NLP tags |
| `QuizAttempt` | A single quiz session with answers + scores |
| `TopicMastery` | Per-user per-topic ML weakness score + mastery |
| `RevisionSchedule` | SM-2 scheduled revision dates per topic |
| `ScrapeJob` | Admin scraping job: URL, status, extracted questions |
| `SyllabusUpload` | Admin PDF upload: path, status, extracted JSON tree |

---

## 7. ML Pipeline Overview

```
User takes quiz
    │
    ▼
QuizAttempt stored in DB
    │
    ▼
Feature Engineering (weakness_service.py)
    │  accuracy, response_time_zscore, mistake_count,
    │  recent_slope, difficulty_sensitivity
    ▼
WeaknessDetector (ML model / formula)
    │  → weakness_score: 0–100 per topic
    ▼
TopicMastery updated in DB
    │
    ├──► AdaptiveRecommender
    │        → selects top weak topics
    │        → ranks questions (difficulty + NLP similarity filter)
    │        → returns recommended quiz
    │
    └──► SpacedRevisionScheduler
             → calculates next revision date per topic
             → updates RevisionSchedule
                    │
                    ▼
             NLP Pipeline (on question insert)
                → spaCy keyword extraction
                → sentence-transformer embedding
                → stored in Question.nlp_tags
```

---

## 8. Data Flow Explanation

### Student Path
```
Browser (Next.js)
  → POST /api/auth/login → JWT token stored
  → GET /api/quiz/diagnostic → render quiz
  → POST /api/quiz/submit → answers sent
  → Backend: calculates scores → WeaknessDetector → TopicMastery updated
  → GET /api/analysis/dashboard → Zustand state → UI renders
  → GET /api/revision/plan → render revision schedule
  → POST /api/ai/explain → Gemini generates insight → render NLPInsightCard
```

### Admin Content Management Path
```
Admin Browser
  → POST /api/auth/login (role=admin in JWT)
  → middleware.ts checks role → allows /admin/* routes
  → POST /api/admin/scraper/start { url }
  → Backend: httpx fetches HTML → BS4 parses → Gemini classifies → ScrapeJob saved
  → GET /api/admin/scraper/jobs/{id} (polled every 3s)
  → Admin reviews extracted questions → POST bulk-verify
  → Questions inserted with is_verified=true
  → POST /api/admin/syllabus/upload (PDF)
  → pdfplumber extracts text → Gemini returns JSON tree
  → Admin reviews tree → POST import → Subject/Topic records created
```

---

## 9. User Flow Explanation

### Student Flow
1. Lands on `/` → clicks "Get Started"
2. Registers at `/register` → JWT issued
3. Onboarding at `/onboarding` → sets study time + level
4. Takes diagnostic quiz at `/quiz/diagnostic`
5. Sees results + weakness analysis at `/quiz/result/[id]`
6. Redirected to `/dashboard` → sees readiness score + weak topics
7. Every day: takes adaptive quiz at `/quiz/adaptive`
8. Checks revision plan at `/revision`
9. Sees NLP insight card on dashboard ("You should revise X")

### Admin Flow
1. Logs in with admin credentials
2. Sees admin dashboard at `/admin` with system stats
3. Uploads GATE CSE syllabus PDF at `/admin/syllabus`
4. Reviews extracted subject/topic tree → imports to DB
5. Goes to `/admin/scraper` → pastes GFG/exam URL
6. Reviews extracted questions → accepts/rejects → imports to DB
7. Manages questions at `/admin/questions` — edits, verifies, deletes
8. Manages subjects/topics at `/admin/subjects`

---

## 10. PYQ Image Support Addendum

- PYQ questions may contain one or more images and must be treated as multimodal content.
- Extend Question architecture to include `question_image_urls: string[]` (empty array default).
- Admin components should include multi-image input/preview support in question forms and scrape review views.
- Student quiz/result components should render all question images before options.
- Scraper and Gemini classification outputs must include extracted image URLs in the structured question object.
