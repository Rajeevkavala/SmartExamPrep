# SmartExamPrep

SmartExamPrep is an AI-powered adaptive exam preparation platform for GATE CSE.
It turns student performance into a closed learning loop:

1. measure weak areas,
2. generate a roadmap and daily plan,
3. run adaptive practice,
4. track recovery with analytics and revision,
5. support students with grounded AI guidance.

## What Is Implemented (Current Build)

### Student experience

- auth flow (register/login/profile)
- onboarding 2.0 with daily study minutes, experience level, exam target date, subject confidence, and known-topic baseline capture
- diagnostic and adaptive quiz flows with persistent result snapshots
- roadmap generation/regeneration with week-wise focus, day plans, and day-level completion tracking
- daily planner with carry-forward tasks, task status updates, and activity logging
- PYQ browser with filters (subject/topic/year/difficulty) and PYQ practice submission through quiz analytics pipeline
- revision queue (spaced repetition) with mark-done support
- dashboard with readiness score, streak, roadmap progress, planner summary, quick actions, and NLP focus hint
- study chat with session history and grounded responses using roadmap/planner/weakness context
- feedback submission

### Admin experience

- admin auth and protected admin routes
- subject/topic CRUD
- question CRUD and verification workflows
- scraper ingestion workflow
- syllabus PDF upload and parsing

## AI / ML / NLP Layer

- weakness detection using accuracy, repeated mistakes, response-time behavior, trend, and difficulty sensitivity
- adaptive recommendation for weak-topic prioritization and duplicate avoidance
- spaced revision scheduling with performance-aware intervals
- NLP tagging and enrichment support
- workload-aware AI layer using Groq with retries and safe fallback behavior:
	- weak-topic explanation
	- dashboard focus hint
	- study chat responses
	- roadmap month enrichment
	- scraper structuring
	- syllabus parsing
	- upload-to-MCQ generation

## Tech Stack

- frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand
- backend: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- testing: Pytest, Playwright E2E, API smoke scripts
- ML/NLP: Python modules under `backend/ml/`

## Backend API Modules

- `/api/auth` auth + profile + onboarding data
- `/api/content` student content lookups
- `/api/quiz` diagnostic/adaptive/PYQ submission and result retrieval
- `/api/analysis` dashboard + analytics metrics
- `/api/revision` due-plan + mark done
- `/api/roadmap` roadmap generate/current/day tracking
- `/api/planner` daily plan generation, today view, task updates
- `/api/pyq` PYQ filters and browse endpoints
- `/api/study-chat` study chat sessions and grounded messaging
- `/api/ai` weak-topic explanation endpoint
- `/api/feedback` student feedback ingestion
- `/api/admin/*` admin content, questions, scraper, and syllabus tools

OpenAPI docs are available at `http://localhost:8000/docs`.
Health check is `GET /health`.

## Project Structure

- `frontend/` Next.js student + admin UI, Zustand stores, Playwright tests
- `backend/` FastAPI app, services, routers, models, migrations, tests, seed scripts
- `docs/` QA, validation, deployment, and research/portfolio documentation
- `improvements/` phased upgrade plans and implementation notes

## Local Setup

### 1. Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 15+ (or Docker)

### 2. Environment variables

Copy `.env.example` to `.env` in repo root and set values:

- `DATABASE_URL`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `BACKEND_CORS_ORIGINS`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`
- `NEXT_PUBLIC_API_URL`

### 3. Start database

```bash
docker-compose up -d postgres
```

### 4. Start backend (local Python)

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
alembic upgrade head
python seed.py
python seed_demo.py
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

Default seeded admin credentials:

- email: `admin@smartexamprep.com`
- password: `admin@1234`

`seed_demo.py` also creates demo student personas (password: `student@1234`).

### AI provider setup

- Configure `GROQ_API_KEY` for live AI features.
- `GROQ_BASE_URL` defaults to `https://api.groq.com/openai/v1`.
- If the Groq key is missing, deterministic features still work and AI endpoints degrade to fallback responses.

### 5. Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Verification

### Backend tests

```bash
cd backend
pytest tests -q
```

### API smoke flow

```bash
cd backend
python test_api_flow.py
```

### AI feature validation

```bash
cd backend
python run_ai_validation.py
```

Detailed AI architecture notes live in [docs/AI_VALIDATION.md](docs/AI_VALIDATION.md).

### Frontend build + E2E

```bash
cd frontend
npm run build
npx playwright install
npm run test:e2e
```

## Deployment Notes

- set `BACKEND_CORS_ORIGINS` to your production frontend origin(s)
- set `COOKIE_SECURE=true` behind HTTPS
- keep `COOKIE_SAMESITE` aligned with your auth/cookie strategy
- run `alembic upgrade head` before first production boot
- set `NEXT_PUBLIC_API_URL` to the deployed backend URL
- use `GET /health` for backend liveness checks

## Documentation Pack

- [Finalization Index](docs/FINALIZATION_INDEX.md)
- [QA Checklist](docs/QA_CHECKLIST.md)
- [AI Validation](docs/AI_VALIDATION.md)
- [Analytics And Metrics](docs/ANALYTICS_AND_METRICS.md)
- [Research Evaluation](docs/RESEARCH_EVALUATION.md)
- [Deployment Checklist](docs/DEPLOYMENT_CHECKLIST.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Portfolio Packaging](docs/PORTFOLIO_PACKAGING.md)
- [Research Paper Package](docs/RESEARCH_PAPER_PACKAGE.md)

## Research Positioning

SmartExamPrep is designed as a measurable adaptive learning system, not only a question bank.
The current implementation supports evaluation around:

- diagnostic baseline
- adaptive improvement
- readiness trend
- topic recovery
- revision compliance
- learner feedback signals

## Future Scope

- larger verified PYQ/practice inventory
- admin-side feedback review tooling
- richer research export/report automation
- cohort-level analytics and benchmarking
- CI automation for backend + E2E regression packs
