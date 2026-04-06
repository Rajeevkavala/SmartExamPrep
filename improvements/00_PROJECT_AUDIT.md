# SmartExamPrep Project Audit

## Executive Summary

SmartExamPrep is not a greenfield shell. It already implements a real adaptive exam-prep loop:

1. student auth and onboarding
2. diagnostic and adaptive quiz delivery
3. quiz submission with topic-level mastery updates
4. spaced revision scheduling
5. dashboard analytics and AI explanation
6. admin content management for subjects, topics, questions, scraping, and syllabus ingestion

The repo is best understood as a monolithic learning platform with three tightly connected layers:

- `frontend/`: Next.js 14 App Router client-heavy UI
- `backend/`: FastAPI + SQLAlchemy + Alembic API service
- `backend/ml/` and top-level `ml/`: runtime ML heuristics plus offline training/export scripts

The right strategy is not to rebuild it. The right strategy is to preserve the current quiz-analysis-revision spine, then layer onboarding depth, roadmap generation, daily planning, richer dashboard metrics, PYQ browsing, and chatbot guidance on top of that spine.

## What The Current Project Already Does

### Student-side capabilities already implemented

- Email/password registration and login via JWT.
- Basic onboarding that stores `daily_study_minutes` and `experience_level`.
- Diagnostic quiz generation from verified questions.
- Adaptive quiz generation from weakness history and recent-attempt filtering.
- Quiz submission pipeline that persists attempts and updates topic mastery.
- Topic weakness analysis with readiness-before/readiness-after snapshots.
- Result page reload support through `quiz_attempts.result_snapshot`.
- Revision plan generation from `revision_schedules`.
- Dashboard showing readiness, weak topics, strong topics, subject progress, and recent scores.
- AI-backed weak-topic explanation on the dashboard.
- Student feedback submission and feedback history.

### Admin-side capabilities already implemented

- Admin auth gating in both frontend and backend.
- Subject CRUD.
- Topic CRUD with subtopics, NLP tags, and difficulty weight.
- Question CRUD with validation, verification, image URLs, source type, and year.
- Scraper job start/list/detail/import flow.
- Syllabus PDF upload/list/detail/import flow.
- Admin dashboard with content and ingestion counters.

### ML / AI capabilities already implemented

- Runtime weakness scoring using either:
  - a weighted formula, or
  - a trained exported model at `backend/ml/models/weakness_model.pkl`
- Adaptive recommendation with:
  - weakness prioritization
  - recency filtering
  - embedding-based duplicate avoidance
  - question-count sizing from `daily_study_minutes`
- Spaced revision scheduling with a modified SM-2 style algorithm.
- NLP keyword extraction with spaCy and domain-term fallback.
- Text embeddings with sentence-transformers and hashed fallback.
- AI prompt flows for:
  - weak-topic explanation
  - scraper classification
  - syllabus parsing

## Architecture Snapshot

| Layer | Current Stack | Current Role |
| --- | --- | --- |
| Frontend | Next.js 14, TypeScript, Tailwind v4, ShadCN, Zustand, Axios | Student and admin UI, client-side auth persistence, data fetching |
| Backend | FastAPI, SQLAlchemy 2, PostgreSQL, Alembic | Auth, quiz APIs, analytics, revision, admin ingestion and CRUD |
| Runtime ML | `backend/ml/*` | Weakness detection, recommendation, spaced revision, NLP, embeddings |
| Offline ML | `ml/*` | Synthetic data generation, model training, evaluation, export |
| AI Service | AI via `backend/services/ai_service.py` | Explanations and parsing support |

## Major Modules Already Implemented

### Frontend

- Landing and auth:
  - `frontend/app/page.tsx`
  - `frontend/app/(auth)/login/page.tsx`
- Student experience:
  - `frontend/app/(student)/onboarding/page.tsx`
  - `frontend/app/(student)/dashboard/page.tsx`
  - `frontend/app/(student)/quiz/diagnostic/page.tsx`
  - `frontend/app/(student)/quiz/adaptive/page.tsx`
  - `frontend/app/(student)/quiz/result/[attemptId]/page.tsx`
  - `frontend/app/(student)/revision/page.tsx`
  - `frontend/app/(student)/feedback/page.tsx`
- Admin experience:
  - `frontend/app/admin/page.tsx`
  - `frontend/app/admin/subjects/page.tsx`
  - `frontend/app/admin/questions/page.tsx`
  - `frontend/app/admin/questions/[id]/page.tsx`
  - `frontend/app/admin/scraper/page.tsx`
  - `frontend/app/admin/syllabus/page.tsx`
- Shared state:
  - `frontend/store/authStore.ts`
  - `frontend/store/dashboardStore.ts`
  - `frontend/store/quizStore.ts`
- API layer and route protection:
  - `frontend/lib/api.ts`
  - `frontend/middleware.ts`

### Backend

- Entry/config/database:
  - `backend/main.py`
  - `backend/config.py`
  - `backend/database.py`
  - `backend/dependencies.py`
- Core routers:
  - `backend/routers/auth.py`
  - `backend/routers/quiz.py`
  - `backend/routers/analysis.py`
  - `backend/routers/revision.py`
  - `backend/routers/content.py`
  - `backend/routers/ai.py`
  - `backend/routers/feedback.py`
- Admin routers:
  - `backend/routers/admin_content.py`
  - `backend/routers/admin_questions.py`
  - `backend/routers/scraper.py`
  - `backend/routers/syllabus.py`
- Services:
  - `backend/services/auth_service.py`
  - `backend/services/quiz_service.py`
  - `backend/services/weakness_service.py`
  - `backend/services/recommendation_service.py`
  - `backend/services/dashboard_service.py`
  - `backend/services/metrics_service.py`
  - `backend/services/ai_service.py`
  - `backend/services/scraper_service.py`
  - `backend/services/syllabus_service.py`
- Schema and data layer:
  - `backend/models/models.py`
  - `backend/schemas/*.py`
  - `backend/alembic/versions/*`

### ML / AI

- Runtime modules:
  - `backend/ml/weakness_detector.py`
  - `backend/ml/adaptive_recommender.py`
  - `backend/ml/spaced_revision.py`
  - `backend/ml/nlp_pipeline.py`
- Offline training/export:
  - `ml/generate_synthetic_data.py`
  - `ml/train_weakness_model.py`
  - `ml/model_evaluation.py`
  - `ml/export_model.py`

## Technical Strengths

### 1. The learning loop is already coherent

The most important strength is that quiz, weakness, dashboard, and revision are not isolated demos. `backend/services/quiz_service.py` submits answers, persists a `QuizAttempt`, updates `TopicMastery`, reschedules `RevisionSchedule`, and stores result snapshots. That gives the platform a usable adaptive backbone.

### 2. The data model already encodes exam-prep semantics

`subjects`, `topics`, `questions`, `topic_masteries`, and `revision_schedules` form a strong base for roadmap and planner work. The requested new features should attach to these entities, not replace them.

### 3. The admin ingestion path is already useful

The platform is not limited to hardcoded seed data. It has:

- manual content CRUD
- URL scraping plus AI classification
- syllabus PDF parsing plus import

That means future roadmap/planner logic can assume a growing syllabus/question inventory instead of a static seed forever.

### 4. The ML layer has real integration points

The runtime ML modules are already called from production paths:

- weakness detector inside mastery updates
- recommender inside adaptive quiz generation
- scheduler inside revision updates
- embeddings inside duplicate avoidance

This is important because roadmap and planner logic can consume the same signals.

### 5. The repo already has some regression coverage

There is meaningful coverage in:

- Playwright student/admin UI tests
- a syllabus contract test
- an AI validation harness

This is enough to support phased upgrades without flying blind.

## Technical Weaknesses

### 1. Auth state is duplicated and brittle

There are currently two auth-cookie concepts:

- backend sets `access_token`
- frontend middleware expects `token`

The frontend also persists JWTs in both localStorage and a JavaScript-readable cookie. This works, but it is fragile and easy to break when profile/onboarding flows expand.

### 2. Startup schema creation fights migration discipline

`backend/main.py` calls `Base.metadata.create_all(bind=engine)` during app lifespan, even though Alembic migrations already exist. That is convenient in local development, but risky once multiple feature migrations are added for roadmap, planner, chat, and analytics.

### 3. Several flows assume singleton rows without DB enforcement

`RevisionSchedule` is queried as though each user-topic pair has only one row, but the table currently has only an index, not a uniqueness guarantee. That becomes more dangerous once planner and carry-forward logic depend on revision consistency.

### 4. Analytics are good for the current MVP but not enough for planning features

Current analytics are mostly built from:

- `quiz_attempts`
- `topic_masteries`
- `revision_schedules`

There is no first-class storage for:

- roadmap versions
- daily tasks
- study sessions / activity logs
- planner carry-forward
- chatbot history

These are the main missing primitives for the requested features.

### 5. Seed breadth is too shallow for confident adaptive behavior

The base seed contains:

- 11 subjects
- 57 topics
- 265 subtopics
- only 3 seed questions

The architecture is stronger than the default content volume. This is the biggest reason the current adaptive loop will feel thin in real use.

### 6. Some business logic is tightly coupled

Examples:

- `weakness_service.py` imports the runtime `weakness_detector` from `main`
- dashboard AI insight is assembled partly in backend and partly in frontend
- result reload safety was fixed through snapshot persistence, but older attempts may still be partial

None of these require a rewrite, but they should influence sequencing and risk management.

## What Is Already Reusable

### Reuse directly

- `users.daily_study_minutes` for target study-time planning input.
- `users.experience_level` for user-level onboarding input.
- `subjects` and `topics` as the roadmap content graph.
- `topics.display_order` and `difficulty_weight` as sequencing hints.
- `questions.source_type` and `questions.year` for PYQ browsing.
- `topic_masteries` as the main signal for weak-topic prioritization.
- `revision_schedules` as the revision source for daily planner task generation.
- `quiz_attempts.result_snapshot` for durable quiz analytics and dashboard summaries.
- `dashboard_service.py` and `metrics_service.py` as the place to aggregate new KPIs.
- `adaptive_recommender.py` for planner-driven practice selection.
- `ai_service.py` for explanation and chat foundation.

### Reuse with extension

- `/api/auth/me` should remain the profile/onboarding endpoint surface, but expand.
- `/api/content/subjects` and `/api/content/subjects/{id}/topics` should power onboarding, roadmap, and PYQ filters.
- `/api/quiz/submit` should remain the attempt processor, but support richer quiz context for PYQ and planner-linked practice.
- `frontend/store/authStore.ts` should remain the user-profile store, but expand with richer onboarding fields.
- `frontend/store/dashboardStore.ts` should remain the dashboard state container, but carry additional KPI cards and planner summaries.

## What Is Brittle Or Likely To Break

### High-risk if changed carelessly

- `backend/services/quiz_service.py`
  - Central to current product value.
  - Any refactor can break diagnostic, adaptive, result reload, mastery updates, and revision rescheduling in one shot.
- `frontend/middleware.ts` and `frontend/store/authStore.ts`
  - Current routing and auth persistence are tightly linked.
- `backend/models/models.py`
  - Multiple features already depend on the current schema and enum behavior.
- `backend/services/ai_service.py`
  - It supports multiple unrelated responsibilities already.
  - Chatbot work should extend it carefully or split responsibilities.

### Medium-risk

- `backend/services/dashboard_service.py`
  - Current shape is simple; the enhanced dashboard can overload it quickly.
- `backend/routers/revision.py`
  - Current API is topic-level and simple; planner work may expose its limitations.
- `frontend/app/(student)/dashboard/page.tsx`
  - Today it is manageable, but it will become crowded unless broken into new KPI components.

## Audit Verdict

SmartExamPrep is in a strong position for extension, not reinvention.

The repo already contains the hard part of the product:

- adaptive scoring
- attempt persistence
- revision scheduling
- admin content pipelines
- a credible question/topic schema

The requested features mostly require new planning-state models and richer orchestration around what already exists. The project does not need a platform rewrite. It needs a disciplined second layer:

- richer onboarding inputs
- roadmap persistence
- daily task orchestration
- richer activity analytics
- student-facing exploration surfaces
- grounded AI guidance

If implemented in phases, the codebase can absorb these features safely.

