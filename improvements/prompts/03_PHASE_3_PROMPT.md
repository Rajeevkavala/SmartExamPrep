# Phase 3 Prompt: Daily Planner Audit

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
9. `improvements/11_PHASE_3_DETAILED_EXECUTION.md`
10. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether the daily planner, task lifecycle, carry-forward logic, and study activity logging are already implemented end to end.

## Depends On

- Phase 2 roadmap support or an equivalent active roadmap source
- existing revision scheduling
- existing quiz submission pipeline
- existing weakness and recommendation logic

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/planner_schemas.py`
- `backend/services/planner_service.py`
- `backend/services/study_activity_service.py`
- `backend/services/quiz_service.py`
- `backend/services/recommendation_service.py`
- `backend/routers/planner.py`
- `backend/routers/revision.py`
- `backend/routers/quiz.py`
- `backend/main.py`
- `frontend/app/(student)/planner/page.tsx`
- `frontend/store/plannerStore.ts`
- `frontend/app/(student)/revision/page.tsx`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/store/dashboardStore.ts`
- `frontend/store/quizStore.ts`
- `frontend/middleware.ts`
- relevant backend and E2E tests

## Required Output

Produce:

- a planner feature audit
- one status per planner capability
- a minimal safe completion plan only for verified gaps

## Prompt

```md
Audit SmartExamPrep Phase 3: Daily Study Planner.

Audit first. Implement only after the audit is complete.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/11_PHASE_3_DETAILED_EXECUTION.md`
- supporting docs `04_DATABASE_AND_MODEL_CHANGES.md`, `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, `07_ML_AI_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`

Then inspect the actual code for:
- daily plan persistence
- daily task persistence
- study activity logging
- planner generation service
- planner router
- revision integration
- quiz integration
- planner frontend page and store
- dashboard entry points
- testing and validation coverage

Audit these Phase 3 features individually:
- daily study plan generation
- daily study task persistence
- combination of roadmap, revision, and practice tasks
- task completion and status updates
- carry-forward logic
- study activity logging
- planner page UI
- planner-to-revision and planner-to-quiz integration

Classify each feature as:
- `✅ Fully Implemented`
- `🟡 Partially Implemented`
- `🔴 Missing`
- `⚠️ Implemented but Broken`
- `🔵 Exists but Not Integrated End-to-End`

Treat Phase 3 as complete only if all applicable layers are connected:
- planner DB tables and migrations
- planner and activity services
- planner router and schemas
- integration with revision and quiz flows where intended
- planner UI and store
- frontend calls to the real planner APIs
- user can generate and act on a real daily plan
- activity data is persisted in a reusable way
- tests or validation prove the core flows

If roadmap prerequisites are missing, explain how that affects the planner verdict.
Do not mark the phase complete if the planner exists only as a page, only as tables, or only as service code.

Use this response format:

## Phase 3 Audit
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
- Roadmap Dependency:
- Revision Dependency:
- Quiz Dependency:
- Dashboard Dependency:

## Layer Check
- DB and Models:
- Migrations:
- Backend Services and Routers:
- Frontend and Store Integration:
- Analytics and Activity Logging:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 3 Reminder

The planner is not fully implemented unless a real student can generate a plan, complete tasks, and have that state feed later metrics safely.
