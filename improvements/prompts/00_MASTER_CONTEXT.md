# SmartExamPrep Master Context

## Required Context

Read these first when using any audit or implementation prompt:

- `improvements/00_PROJECT_AUDIT.md`
- `improvements/01_EXISTING_SYSTEM_MAP.md`
- `improvements/03_PHASED_UPGRADE_ROADMAP.md`
- `improvements/04_DATABASE_AND_MODEL_CHANGES.md`
- `improvements/05_BACKEND_UPGRADE_PLAN.md`
- `improvements/06_FRONTEND_UPGRADE_PLAN.md`
- `improvements/07_ML_AI_UPGRADE_PLAN.md`
- `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
- `backend/models/models.py`
- `backend/main.py`
- `frontend/lib/api.ts`

## Audit Goal

Provide the shared architecture and "definition of done" reference for feature-completion audits in SmartExamPrep.

## Depends On

- The current repository structure under `backend/`, `frontend/`, `ml/`, `docs/`, and `improvements/`
- The current FastAPI router registration in `backend/main.py`
- The current SQLAlchemy model layer in `backend/models/models.py`
- The current frontend API contract pattern in `frontend/lib/api.ts`

## Expected Code Areas

- `backend/models/`
- `backend/alembic/`
- `backend/schemas/`
- `backend/services/`
- `backend/routers/`
- `backend/ml/`
- `ml/`
- `frontend/app/`
- `frontend/components/`
- `frontend/store/`
- `frontend/lib/`
- `frontend/tests/e2e/`

## Required Output

Any audit that uses this file should produce:

- a feature status verdict
- layer-by-layer evidence
- end-to-end completeness reasoning
- only the minimal safe next steps for missing or broken parts

## Product Summary

SmartExamPrep is an adaptive exam preparation platform for GATE CSE. The existing product already includes student auth, onboarding, diagnostic and adaptive quizzes, result analysis, revision scheduling, dashboard analytics, AI-backed explanations, feedback capture, and admin tooling for subjects, questions, scraping, and syllabus import.

The project is not a greenfield shell. It already contains working product flows that must be preserved while auditing or extending features.

## Current Architecture

### Frontend

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- ShadCN UI
- Zustand stores for auth, dashboard, and quiz state
- Axios API clients in `frontend/lib/api.ts`
- Route protection in `frontend/middleware.ts`

### Backend

- FastAPI app in `backend/main.py`
- SQLAlchemy ORM models in `backend/models/models.py`
- PostgreSQL with Alembic migrations
- Router-driven API structure under `backend/routers/`
- Business logic under `backend/services/`
- Pydantic contracts under `backend/schemas/`

### Runtime ML and AI

- Runtime ML logic under `backend/ml/`
- Offline training and evaluation scripts under top-level `ml/`
- AI integration via `backend/services/ai_service.py`

### Admin Surface

- Admin pages under `frontend/app/admin/`
- Admin UI components under `frontend/components/admin/`
- Admin APIs under:
  - `backend/routers/admin_content.py`
  - `backend/routers/admin_questions.py`
  - `backend/routers/scraper.py`
  - `backend/routers/syllabus.py`

## Current Core Entities

### Existing persisted entities

- `User`
- `Subject`
- `Topic`
- `Question`
- `QuizAttempt`
- `TopicMastery`
- `RevisionSchedule`
- `ScrapeJob`
- `SyllabusUpload`
- `UserFeedback`

### Planned phase entities from the improvements pack

- `UserSubjectConfidence`
- `UserTopicBaseline`
- `StudyRoadmap`
- `RoadmapWeek`
- `RoadmapWeekTopic`
- `DailyStudyPlan`
- `DailyStudyTask`
- `StudyActivityLog`
- `StudyChatSession`
- `StudyChatMessage`

## Major Feature Domains

### Student learning loop

- auth and profile
- onboarding
- diagnostic quiz
- adaptive quiz
- result analysis
- weakness tracking
- revision planning
- dashboard
- feedback

### Admin operations

- subject and topic CRUD
- question CRUD and verification
- scrape jobs and imports
- syllabus upload and import

### Planned upgrade domains

- Smart Onboarding 2.0
- roadmap generation
- daily planner
- enhanced dashboard
- PYQ browser
- AI study chatbot

## API Structure Assumptions

The current backend exposes routers under `/api/*` and `/api/admin/*`. The current registered routes include:

- `/api/auth`
- `/api/quiz`
- `/api/analysis`
- `/api/revision`
- `/api/content`
- `/api/ai`
- `/api/feedback`
- `/api/admin/content`
- `/api/admin/questions`
- `/api/admin/scraper`
- `/api/admin/syllabus`

Future planned additive routers, if implemented, are expected to live at:

- `/api/roadmap`
- `/api/planner`
- `/api/pyq`
- `/api/study-chat`

Assume API work is incomplete unless router registration, endpoint contracts, service logic, and frontend usage are all visible in code.

## Feature Implementation Layers

Use these layers when auditing whether a feature is complete.

### 1. Database layer

- ORM model fields and relationships
- Alembic migrations
- indexes and constraints
- seed or backfill implications

### 2. Backend layer

- service logic
- router handlers
- dependency usage
- error handling
- data loading and persistence

### 3. API contract layer

- request and response schemas
- route registration
- stable response shapes
- frontend/backend agreement

### 4. Frontend layer

- routes and pages
- components
- stores
- API client usage
- loading, empty, and error states

### 5. ML or AI layer

- runtime ML hooks under `backend/ml/`
- AI or other AI integration
- prompt helpers and fallback behavior
- grounding or recommendation logic where applicable

### 6. Admin layer

- admin CRUD or verification support when the feature depends on content quality, moderation, or operational visibility

### 7. Validation layer

- backend tests
- frontend E2E tests
- manual end-to-end flow viability

## What "Fully Implemented" Means In SmartExamPrep

A feature is not fully implemented unless all applicable layers are connected and usable end to end.

Treat a feature as fully implemented only when the following are true, if the feature needs them:

- DB or model support exists
- migration support exists when persistence changed
- backend service logic exists
- router or API endpoint exists
- schema or contract is correct
- frontend UI exists
- frontend is connected to the real backend contract
- the feature is integrated into a real user flow
- ML or AI hooks exist when the feature depends on them
- admin support exists when the feature depends on admin-managed content or review
- the feature is testable
- the feature is not obviously broken

If one of these layers is missing, broken, or disconnected, the feature is not "Fully Implemented".

## Status Classification Standard

Use only these status labels during audits:

- `âœ… Fully Implemented`
- `ðŸŸ¡ Partially Implemented`
- `ðŸ”´ Missing`
- `âš ï¸ Implemented but Broken`
- `ðŸ”µ Exists but Not Integrated End-to-End`

## Evidence Standard

Never mark a feature complete from docs alone.

Evidence should come from real code such as:

- model classes and relationships
- migrations
- service functions
- router endpoints
- schema models
- frontend pages and components
- API calls in frontend code
- store wiring
- route registration
- tests or validation scripts

Planning documents are intent, not implementation proof.

## Audit Principle

SmartExamPrep audits must follow this sequence:

1. Read the relevant improvement docs.
2. Inspect the actual code.
3. Classify status.
4. Explain the evidence.
5. Only then propose the minimal safe changes.

Do not rebuild a feature just because it appears in the roadmap. If the code already delivers the intended behavior end to end, report it as implemented and move on.

