# Phase 1 Prompt: Smart Onboarding 2.0 Audit

## Required Context

Read these first, in order:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. `improvements/04_DATABASE_AND_MODEL_CHANGES.md`
5. `improvements/05_BACKEND_UPGRADE_PLAN.md`
6. `improvements/06_FRONTEND_UPGRADE_PLAN.md`
7. `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
8. `improvements/09_PHASE_1_DETAILED_EXECUTION.md`
9. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether Smart Onboarding 2.0 is already fully implemented in the current SmartExamPrep codebase before suggesting any Phase 1 changes.

## Depends On

- Existing auth flow
- Existing `users` table and current profile fields
- Existing `PUT /api/auth/me` profile update flow
- Existing subject and topic content APIs
- Existing frontend onboarding page and auth store

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/auth_schemas.py`
- `backend/routers/auth.py`
- `backend/services/auth_service.py`
- `backend/services/profile_service.py`
- `backend/routers/content.py`
- `backend/main.py`
- `frontend/store/authStore.ts`
- `frontend/lib/validations.ts`
- `frontend/lib/api.ts`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/components/student/`
- `frontend/middleware.ts`
- `backend/test_api_flow.py`
- `frontend/tests/e2e/chunk11-student-pages.spec.ts`

## Required Output

Produce:

- a feature-by-feature audit for Phase 1
- one status per Phase 1 feature
- evidence across DB, backend, frontend, and tests
- only the minimal safe changes needed to finish Phase 1

## Prompt

```md
Audit SmartExamPrep Phase 1: Smart Onboarding 2.0.

You must act as a code auditor first and implementer second.

First:
- read `improvements/prompts/00_MASTER_CONTEXT.md`
- read `improvements/prompts/SHARED_RULES.md`
- read `improvements/prompts/FILE_CONTEXT_MAP.md`
- read `improvements/09_PHASE_1_DETAILED_EXECUTION.md`
- use `improvements/04_DATABASE_AND_MODEL_CHANGES.md`, `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md` to understand intended behavior

Then inspect the real code for Phase 1 across:
- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/auth_schemas.py`
- `backend/routers/auth.py`
- `backend/services/auth_service.py`
- `backend/services/profile_service.py`
- `backend/routers/content.py`
- `backend/main.py`
- `frontend/store/authStore.ts`
- `frontend/lib/validations.ts`
- `frontend/lib/api.ts`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/components/student/`
- `frontend/middleware.ts`
- relevant tests

Audit these Phase 1 features individually:
- exam target date
- daily study minutes reuse
- experience level reuse
- subject-wise confidence capture
- known topics capture
- onboarding version tracking
- onboarding completion tracking

For each feature, classify it as:
- `✅ Fully Implemented`
- `🟡 Partially Implemented`
- `🔴 Missing`
- `⚠️ Implemented but Broken`
- `🔵 Exists but Not Integrated End-to-End`

Treat Phase 1 as fully complete only if all applicable layers exist and are connected:
- DB or model support
- migration support
- backend write and read logic
- router and schema support
- frontend form UI
- frontend save and reload behavior
- auth store refresh
- real subject and topic data integration
- route protection still works
- testing or validation evidence exists

Do not propose implementation until after the audit.
Do not rewrite the current onboarding flow if it already works end to end.

Use this response format:

## Phase 1 Audit
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

## Layer Check
- DB and Models:
- Migrations:
- Backend Services and Routers:
- Frontend and Store Integration:
- Middleware and Auth Impact:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 1 Reminder

Phase 1 should extend the existing onboarding and profile flow, not create a parallel system. If only the UI exists, or only the backend exists, do not mark it complete.
