# PHASE 1 â€” PRODUCT ARCHITECTURE

> **Goal:** Define the complete blueprint of SmartExamPrep â€” folder structure, feature breakdown, page list, component list, API route list, DB schema overview, ML pipeline, and user flows.

---

## 1. Monorepo Folder Structure

```
SmartExamPrep/
â”œâ”€â”€ frontend/                          # Next.js 14 App Router
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ (auth)/
â”‚   â”‚   â”‚   â”œâ”€â”€ login/page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ register/page.tsx
â”‚   â”‚   â”œâ”€â”€ (student)/
â”‚   â”‚   â”‚   â”œâ”€â”€ onboarding/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ dashboard/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ quiz/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ diagnostic/page.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ adaptive/page.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ result/[attemptId]/page.tsx
â”‚   â”‚   â”‚   â””â”€â”€ revision/page.tsx
â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”œâ”€â”€ layout.tsx             # AdminGuard + AdminSidebar wrapper
â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx               # Admin Dashboard
â”‚   â”‚   â”‚   â”œâ”€â”€ subjects/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx           # Subjects Manager
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [id]/topics/page.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ questions/
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ page.tsx           # Questions Manager (data table)
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ [id]/page.tsx      # Question Detail / Edit
â”‚   â”‚   â”‚   â”œâ”€â”€ scraper/page.tsx       # URL Scraper Tool
â”‚   â”‚   â”‚   â””â”€â”€ syllabus/page.tsx      # PDF Syllabus Upload
â”‚   â”‚   â”œâ”€â”€ layout.tsx                 # Root layout
â”‚   â”‚   â””â”€â”€ page.tsx                   # Landing Page
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ shared/                    # Shared across student + admin
â”‚   â”‚   â”‚   â”œâ”€â”€ Navbar.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ Footer.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ LoadingSpinner.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ EmptyState.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ErrorToast.tsx
â”‚   â”‚   â”œâ”€â”€ student/
â”‚   â”‚   â”‚   â”œâ”€â”€ QuizCard.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ TopicBadge.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ WeaknessBar.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReadinessGauge.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ RevisionItem.tsx
â”‚   â”‚   â”‚   â””â”€â”€ ProgressChart.tsx
â”‚   â”‚   â””â”€â”€ admin/
â”‚   â”‚       â”œâ”€â”€ AdminSidebar.tsx
â”‚   â”‚       â”œâ”€â”€ AdminGuard.tsx
â”‚   â”‚       â”œâ”€â”€ DataTable.tsx
â”‚   â”‚       â”œâ”€â”€ SubtopicChipEditor.tsx
â”‚   â”‚       â”œâ”€â”€ QuestionFormModal.tsx
â”‚   â”‚       â”œâ”€â”€ ScrapeJobCard.tsx
â”‚   â”‚       â”œâ”€â”€ ScrapedQuestionReview.tsx
â”‚   â”‚       â”œâ”€â”€ SyllabusTreeViewer.tsx
â”‚   â”‚       â””â”€â”€ PDFDropzone.tsx
â”‚   â”œâ”€â”€ lib/
â”‚   â”‚   â”œâ”€â”€ api.ts                     # Axios student API client
â”‚   â”‚   â”œâ”€â”€ adminApi.ts                # Axios admin API client
â”‚   â”‚   â””â”€â”€ utils.ts
â”‚   â”œâ”€â”€ store/
â”‚   â”‚   â”œâ”€â”€ authStore.ts               # Zustand: user, role, token
â”‚   â”‚   â””â”€â”€ dashboardStore.ts          # Zustand: dashboard state
â”‚   â”œâ”€â”€ middleware.ts                  # Role-based route protection
â”‚   â”œâ”€â”€ tailwind.config.ts
â”‚   â””â”€â”€ tsconfig.json
â”‚
â”œâ”€â”€ backend/                           # FastAPI (Python)
â”‚   â”œâ”€â”€ main.py                        # App entry, lifespan, CORS, routers
â”‚   â”œâ”€â”€ config.py                      # Settings (env vars, DB URL, JWT secret)
â”‚   â”œâ”€â”€ database.py                    # SQLAlchemy engine + session
â”‚   â”œâ”€â”€ dependencies.py                # get_db, get_current_user, require_admin
â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â””â”€â”€ models.py                  # All SQLAlchemy ORM models
â”‚   â”œâ”€â”€ schemas/
â”‚   â”‚   â”œâ”€â”€ auth_schemas.py
â”‚   â”‚   â”œâ”€â”€ quiz_schemas.py
â”‚   â”‚   â”œâ”€â”€ analysis_schemas.py
â”‚   â”‚   â”œâ”€â”€ revision_schemas.py
â”‚   â”‚   â”œâ”€â”€ admin_schemas.py
â”‚   â”‚   â”œâ”€â”€ scraper_schemas.py
â”‚   â”‚   â””â”€â”€ syllabus_schemas.py
â”‚   â”œâ”€â”€ routers/
â”‚   â”‚   â”œâ”€â”€ auth.py
â”‚   â”‚   â”œâ”€â”€ quiz.py
â”‚   â”‚   â”œâ”€â”€ analysis.py
â”‚   â”‚   â”œâ”€â”€ revision.py
â”‚   â”‚   â”œâ”€â”€ content.py
â”‚   â”‚   â”œâ”€â”€ ai.py
â”‚   â”‚   â”œâ”€â”€ admin_content.py
â”‚   â”‚   â”œâ”€â”€ admin_questions.py
â”‚   â”‚   â”œâ”€â”€ scraper.py
â”‚   â”‚   â””â”€â”€ syllabus.py
â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ auth_service.py
â”‚   â”‚   â”œâ”€â”€ quiz_service.py
â”‚   â”‚   â”œâ”€â”€ weakness_service.py
â”‚   â”‚   â”œâ”€â”€ recommendation_service.py
â”‚   â”‚   â”œâ”€â”€ revision_service.py
â”‚   â”‚   â”œâ”€â”€ ai_service.py
â”‚   â”‚   â”œâ”€â”€ scraper_service.py
â”‚   â”‚   â””â”€â”€ syllabus_service.py
â”‚   â”œâ”€â”€ ml/
â”‚   â”‚   â”œâ”€â”€ weakness_detector.py       # WeaknessDetector class
â”‚   â”‚   â”œâ”€â”€ adaptive_recommender.py    # AdaptiveRecommender class
â”‚   â”‚   â”œâ”€â”€ spaced_revision.py         # SpacedRevisionScheduler class
â”‚   â”‚   â”œâ”€â”€ nlp_pipeline.py            # NLP tagging + embeddings
â”‚   â”‚   â””â”€â”€ models/
â”‚   â”‚       â””â”€â”€ weakness_model.pkl     # Trained model (joblib)
â”‚   â”œâ”€â”€ uploads/
â”‚   â”‚   â””â”€â”€ syllabi/                   # Uploaded PDF storage
â”‚   â”œâ”€â”€ alembic/                       # DB migrations
â”‚   â”‚   â”œâ”€â”€ versions/
â”‚   â”‚   â””â”€â”€ env.py
â”‚   â”œâ”€â”€ alembic.ini
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â””â”€â”€ Dockerfile
â”‚
â”œâ”€â”€ ml/                                # Offline ML training pipeline
â”‚   â”œâ”€â”€ train_weakness_model.py
â”‚   â”œâ”€â”€ feature_engineering.py
â”‚   â”œâ”€â”€ model_evaluation.py
â”‚   â”œâ”€â”€ generate_synthetic_data.py
â”‚   â”œâ”€â”€ export_model.py
â”‚   â””â”€â”€ models/
â”‚       â””â”€â”€ weakness_model.pkl
â”‚
â”œâ”€â”€ docker-compose.yml                 # PostgreSQL + backend + frontend
â”œâ”€â”€ .env.example
â””â”€â”€ README.md
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
| NLP Insights | AI-generated plain English feedback |

### Admin Features
| Feature | Description |
|---|---|
| Admin Dashboard | Stats: questions, subjects, scrape jobs, unverified count |
| Subjects Manager | Full CRUD for subjects |
| Topics Manager | Full CRUD for topics + subtopics chip editor |
| Questions Manager | Full CRUD for PYQs/practice questions with filters |
| Question Verification | Approve scraped questions before they go live |
| URL Scraper | Paste URL â†’ auto-extract + classify questions with AI |
| Syllabus PDF Upload | Upload PDF â†’ AI extracts subject/topic tree â†’ import to DB |

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
- `Navbar` â€” top navigation with role-aware links
- `Footer` â€” minimal footer
- `LoadingSpinner` â€” centered spinner
- `EmptyState` â€” illustrated empty state with CTA
- `ErrorToast` â€” ShadCN toast wrapper

### Student Components
- `QuizCard` â€” single question with options
- `QuizTimer` â€” countdown timer per question
- `TopicBadge` â€” colored badge (Weak / Moderate / Strong)
- `WeaknessBar` â€” horizontal bar showing weakness score
- `ReadinessGauge` â€” circular gauge for overall readiness
- `RevisionItem` â€” single topic revision card with due date
- `ProgressChart` â€” recharts line/bar chart for performance
- `NLPInsightCard` â€” AI-generated text card

### Admin Components
- `AdminSidebar` â€” fixed left sidebar with navigation links + badge counts
- `AdminGuard` â€” redirect non-admins to `/dashboard`
- `DataTable` â€” reusable sortable/filterable/paginated table (ShadCN)
- `SubtopicChipEditor` â€” chip multi-select for subtopic tags
- `QuestionFormModal` â€” full question create/edit form in modal
- `ScrapeJobCard` â€” job card with URL, status badge, question count
- `ScrapedQuestionReview` â€” side-by-side raw + structured + accept/reject
- `SyllabusTreeViewer` â€” collapsible tree of subject â†’ topic â†’ subtopics
- `PDFDropzone` â€” drag-and-drop PDF upload with Axios progress

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

/api/ai/explain             POST   NLP + AI weakness explanation

# Admin â€” Content
/api/admin/content/subjects                     GET/POST
/api/admin/content/subjects/{id}                PUT/DELETE
/api/admin/content/subjects/{id}/topics         GET/POST
/api/admin/content/topics/{id}                  PUT/DELETE

# Admin â€” Questions
/api/admin/questions                POST/GET (paginated + filtered)
/api/admin/questions/{id}           GET/PUT/DELETE
/api/admin/questions/{id}/verify    POST
/api/admin/questions/bulk-verify    POST

# Admin â€” Scraper
/api/admin/scraper/start            POST   Submit URL to scrape
/api/admin/scraper/jobs             GET    List scrape jobs
/api/admin/scraper/jobs/{id}        GET    Job status + questions
/api/admin/scraper/jobs/{id}/import POST   Import verified questions
/api/admin/scraper/jobs/{id}        DELETE

# Admin â€” Syllabus
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
    â”‚
    â–¼
QuizAttempt stored in DB
    â”‚
    â–¼
Feature Engineering (weakness_service.py)
    â”‚  accuracy, response_time_zscore, mistake_count,
    â”‚  recent_slope, difficulty_sensitivity
    â–¼
WeaknessDetector (ML model / formula)
    â”‚  â†’ weakness_score: 0â€“100 per topic
    â–¼
TopicMastery updated in DB
    â”‚
    â”œâ”€â”€â–º AdaptiveRecommender
    â”‚        â†’ selects top weak topics
    â”‚        â†’ ranks questions (difficulty + NLP similarity filter)
    â”‚        â†’ returns recommended quiz
    â”‚
    â””â”€â”€â–º SpacedRevisionScheduler
             â†’ calculates next revision date per topic
             â†’ updates RevisionSchedule
                    â”‚
                    â–¼
             NLP Pipeline (on question insert)
                â†’ spaCy keyword extraction
                â†’ sentence-transformer embedding
                â†’ stored in Question.nlp_tags
```

---

## 8. Data Flow Explanation

### Student Path
```
Browser (Next.js)
  â†’ POST /api/auth/login â†’ JWT token stored
  â†’ GET /api/quiz/diagnostic â†’ render quiz
  â†’ POST /api/quiz/submit â†’ answers sent
  â†’ Backend: calculates scores â†’ WeaknessDetector â†’ TopicMastery updated
  â†’ GET /api/analysis/dashboard â†’ Zustand state â†’ UI renders
  â†’ GET /api/revision/plan â†’ render revision schedule
  â†’ POST /api/ai/explain â†’ AI generates insight â†’ render NLPInsightCard
```

### Admin Content Management Path
```
Admin Browser
  â†’ POST /api/auth/login (role=admin in JWT)
  â†’ middleware.ts checks role â†’ allows /admin/* routes
  â†’ POST /api/admin/scraper/start { url }
  â†’ Backend: httpx fetches HTML â†’ BS4 parses â†’ AI classifies â†’ ScrapeJob saved
  â†’ GET /api/admin/scraper/jobs/{id} (polled every 3s)
  â†’ Admin reviews extracted questions â†’ POST bulk-verify
  â†’ Questions inserted with is_verified=true
  â†’ POST /api/admin/syllabus/upload (PDF)
  â†’ pdfplumber extracts text â†’ AI returns JSON tree
  â†’ Admin reviews tree â†’ POST import â†’ Subject/Topic records created
```

---

## 9. User Flow Explanation

### Student Flow
1. Lands on `/` â†’ clicks "Get Started"
2. Registers at `/register` â†’ JWT issued
3. Onboarding at `/onboarding` â†’ sets study time + level
4. Takes diagnostic quiz at `/quiz/diagnostic`
5. Sees results + weakness analysis at `/quiz/result/[id]`
6. Redirected to `/dashboard` â†’ sees readiness score + weak topics
7. Every day: takes adaptive quiz at `/quiz/adaptive`
8. Checks revision plan at `/revision`
9. Sees NLP insight card on dashboard ("You should revise X")

### Admin Flow
1. Logs in with admin credentials
2. Sees admin dashboard at `/admin` with system stats
3. Uploads GATE CSE syllabus PDF at `/admin/syllabus`
4. Reviews extracted subject/topic tree â†’ imports to DB
5. Goes to `/admin/scraper` â†’ pastes GFG/exam URL
6. Reviews extracted questions â†’ accepts/rejects â†’ imports to DB
7. Manages questions at `/admin/questions` â€” edits, verifies, deletes
8. Manages subjects/topics at `/admin/subjects`

---

## 10. PYQ Image Support Addendum

- PYQ questions may contain one or more images and must be treated as multimodal content.
- Extend Question architecture to include `question_image_urls: string[]` (empty array default).
- Admin components should include multi-image input/preview support in question forms and scrape review views.
- Student quiz/result components should render all question images before options.
- Scraper and AI classification outputs must include extracted image URLs in the structured question object.

