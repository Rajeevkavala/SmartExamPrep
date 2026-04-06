# Phase 5 Prompt: PYQ Browser Audit

## Required Context

Read these first, in order:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. `improvements/04_DATABASE_AND_MODEL_CHANGES.md`
5. `improvements/05_BACKEND_UPGRADE_PLAN.md`
6. `improvements/06_FRONTEND_UPGRADE_PLAN.md`
7. `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
8. `improvements/13_PHASE_5_DETAILED_EXECUTION.md`
9. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether the PYQ browser and PYQ practice flow are already implemented end to end using the real question bank and quiz pipeline.

## Depends On

- existing `questions` schema
- verified question inventory
- admin question management quality
- existing quiz submission and result pipeline

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/pyq_schemas.py`
- `backend/schemas/quiz_schemas.py`
- `backend/services/pyq_service.py`
- `backend/services/quiz_service.py`
- `backend/routers/pyq.py`
- `backend/routers/quiz.py`
- `backend/routers/admin_questions.py`
- `backend/main.py`
- `frontend/app/(student)/pyq/page.tsx`
- `frontend/components/student/PYQFilterBar.tsx`
- `frontend/components/student/PYQQuestionTable.tsx`
- `frontend/components/student/PYQPracticeLauncher.tsx`
- `frontend/app/(student)/quiz/result/[attemptId]/page.tsx`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/store/quizStore.ts`
- `frontend/app/admin/questions/page.tsx`
- `frontend/components/admin/QuestionFormModal.tsx`
- `frontend/middleware.ts`
- relevant backend and E2E tests

## Required Output

Produce:

- a PYQ feature audit
- one status per PYQ capability
- only the minimal safe changes needed to finish the flow

## Prompt

```md
Audit SmartExamPrep Phase 5: PYQ Browser and Practice Mode.

Audit the existing code before suggesting any implementation work.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/13_PHASE_5_DETAILED_EXECUTION.md`
- supporting docs `04_DATABASE_AND_MODEL_CHANGES.md`, `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`

Then inspect the real code for:
- question schema support for PYQs
- optional migration or index support
- PYQ schemas, service, and router
- quiz-service reuse for PYQ submissions
- result-page support for PYQ attempts
- PYQ frontend page and components
- dashboard or navigation entry points
- admin question entry support
- tests and validation

Audit these Phase 5 features individually:
- PYQ filterable browse API
- PYQ frontend browser
- filtering by year, subject, topic, and difficulty if intended
- launch of PYQ practice from filtered results
- reuse of the real quiz submission pipeline
- result-page handling of PYQ attempts
- visibility of only verified PYQ content to students
- admin support for maintaining usable PYQ metadata

Classify each feature as:
- `✅ Fully Implemented`
- `🟡 Partially Implemented`
- `🔴 Missing`
- `⚠️ Implemented but Broken`
- `🔵 Exists but Not Integrated End-to-End`

Treat Phase 5 as complete only if:
- question data supports the feature
- backend browse and practice APIs exist
- frontend browser and launcher exist
- submissions use the real quiz-result pipeline
- result pages handle PYQ context correctly
- the student can actually use the PYQ feature end to end
- tests or strong validation evidence exist

Do not mark Phase 5 complete if only admin metadata exists, or if only a browse UI exists without practice integration.

Use this response format:

## Phase 5 Audit
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
- Question Data Support:
- Quiz Pipeline Reuse:
- Result Flow Compatibility:
- Admin Content Quality Dependency:

## Layer Check
- DB and Models:
- Backend Services and Routers:
- Schemas and Contracts:
- Frontend and Navigation:
- Admin Touchpoints:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 5 Reminder

PYQ is not fully implemented if students cannot browse, launch, submit, and review PYQ practice using the real production flow.
