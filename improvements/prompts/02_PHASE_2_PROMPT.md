# Phase 2 Prompt: Roadmap Generator Audit

## Required Context

Read these first, in order:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. `improvements/04_DATABASE_AND_MODEL_CHANGES.md`
5. `improvements/05_BACKEND_UPGRADE_PLAN.md`
6. `improvements/06_FRONTEND_UPGRADE_PLAN.md`
7. `improvements/07_ML_AI_UPGRADE_PLAN.md`
8. `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
9. `improvements/10_PHASE_2_DETAILED_EXECUTION.md`
10. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether Phase 2 roadmap generation is already implemented end to end, or whether it only exists in isolated DB, backend, or frontend fragments.

## Depends On

- Phase 1 onboarding inputs or an equivalent persisted learner profile
- existing `topic_masteries`
- syllabus ordering via subjects and topics
- current weakness and recommendation logic
- current content and dashboard data sources

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/roadmap_schemas.py`
- `backend/services/roadmap_service.py`
- `backend/services/weakness_service.py`
- `backend/services/recommendation_service.py`
- `backend/services/dashboard_service.py`
- `backend/routers/roadmap.py`
- `backend/routers/analysis.py`
- `backend/routers/content.py`
- `backend/main.py`
- `backend/ml/weakness_detector.py`
- `backend/ml/adaptive_recommender.py`
- `frontend/app/(student)/roadmap/page.tsx`
- `frontend/store/roadmapStore.ts`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/middleware.ts`
- relevant backend and E2E tests

## Required Output

Produce:

- a roadmap feature audit
- a per-feature status matrix for roadmap generation, persistence, regeneration, and UI
- a minimal safe completion plan only for missing or broken pieces

## Prompt

```md
Audit SmartExamPrep Phase 2: Personalized Roadmap Generator.

You must verify implementation before suggesting any code changes.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/10_PHASE_2_DETAILED_EXECUTION.md`
- supporting docs `04_DATABASE_AND_MODEL_CHANGES.md`, `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, `07_ML_AI_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`

Then inspect the real code across:
- roadmap tables or model additions
- roadmap schemas
- roadmap router and service
- weakness and recommendation services
- analysis and content routers
- roadmap frontend page and store
- onboarding and dashboard entry points
- middleware and tests

Audit these Phase 2 features individually:
- roadmap persistence tables
- active roadmap generation
- 52-week or exam-window constrained planning
- month and week structure
- topic sequencing using real profile and mastery data
- roadmap regeneration or supersede behavior
- student roadmap page
- frontend/backend integration

Classify each feature as:
- `✅ Fully Implemented`
- `🟡 Partially Implemented`
- `🔴 Missing`
- `⚠️ Implemented but Broken`
- `🔵 Exists but Not Integrated End-to-End`

Do not mark Phase 2 complete unless all applicable layers are present:
- DB and migration support for roadmaps
- roadmap service logic
- router and schema support
- use of real onboarding, mastery, or weakness inputs
- frontend roadmap UI
- frontend call to real roadmap API
- reachable route and navigation path
- deterministic and explainable behavior
- testing or strong validation evidence

If Phase 1 prerequisites are absent, explain how that limits the verdict.
Do not invent roadmap code if it is already implemented.

Use this response format:

## Phase 2 Audit
- Phase Status:
- Features Audited:
- Overall End-to-End Verdict:

## Feature Matrix
- Feature:
- Status:
- Evidence Found:
- Missing Pieces:
- Broken Links:
- Verdict:

## Dependency Check
- Phase 1 Inputs:
- Mastery and Weakness Inputs:
- Content Graph Availability:
- Frontend Entry Points:

## Layer Check
- DB and Models:
- Migrations:
- Backend Services and Routers:
- ML or AI Support:
- Frontend and Store Integration:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 2 Reminder

Roadmap generation is not complete if a page exists without persistence, or if tables exist without a real student-facing flow.
