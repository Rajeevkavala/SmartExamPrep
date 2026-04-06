# 13 Phase 5 Detailed Execution

## Phase Goal

Phase 5 exposes the project's existing `questions` content model as a real PYQ product surface. This is a good late-phase feature because the current schema already contains most of the necessary metadata: `source_type`, `year`, `subject_id`, `topic_id`, `subtopic`, `is_verified`, and `source_url`. The safest approach is to build a browse-and-practice layer on top of those fields instead of changing question storage fundamentally.

The phase outcome should be:

- students can browse previous year questions with filters
- they can launch a filtered practice session
- PYQ practice integrates with the existing quiz submission pipeline
- admin-authored and scraped PYQ inventory becomes visible as a student feature

## Features Included

- PYQ browser
- filterable list by year, subject, topic, and difficulty
- PYQ practice mode
- reuse of existing result flow where possible

## Exact Files To Read First

1. `backend/models/models.py`
2. `backend/routers/admin_questions.py`
3. `backend/schemas/admin_schemas.py`
4. `backend/routers/quiz.py`
5. `backend/services/quiz_service.py`
6. `backend/services/recommendation_service.py`
7. `frontend/app/admin/questions/page.tsx`
8. `frontend/app/(student)/quiz/diagnostic/page.tsx`
9. `frontend/app/(student)/quiz/adaptive/page.tsx`
10. `frontend/app/(student)/quiz/result/[attemptId]/page.tsx`
11. `frontend/components/admin/QuestionFormModal.tsx`
12. `frontend/store/quizStore.ts`

## Existing Files To Modify

### Backend

- `backend/models/models.py`
- `backend/main.py`
- `backend/routers/quiz.py`
- `backend/services/quiz_service.py`
- `backend/schemas/quiz_schemas.py`

### Frontend

- `frontend/middleware.ts`
- `frontend/store/quizStore.ts`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/quiz/result/[attemptId]/page.tsx`
- `frontend/app/admin/questions/page.tsx`
- `frontend/components/admin/QuestionFormModal.tsx`

### Tests

- `frontend/tests/e2e/chunk12-quiz-revision.spec.ts`
- `frontend/tests/e2e/chunk14-admin-questions.spec.ts`
- `backend/test_api_flow.py`

## New Files To Create

### Backend

- `backend/routers/pyq.py`
- `backend/services/pyq_service.py`
- `backend/schemas/pyq_schemas.py`
- `backend/tests/test_pyq_router.py`

### Frontend

- `frontend/app/(student)/pyq/page.tsx`
- `frontend/components/student/PYQFilterBar.tsx`
- `frontend/components/student/PYQQuestionTable.tsx`
- `frontend/components/student/PYQPracticeLauncher.tsx`

## Exact DB Changes

### Likely No New Core Table Required

The current `questions` table already supports the first version of PYQ browsing via:

- `source_type`
- `year`
- `subject_id`
- `topic_id`
- `subtopic`
- `is_verified`

### Recommended Additive Indexes

Add indexes if they do not already exist:

- `(source_type, year)`
- `(subject_id, topic_id, source_type)`
- `(is_verified, source_type)`

### Optional Additive Field

If you want richer analytics later, add `quiz_attempts.context_payload` or `quiz_attempts.source_label` to capture that an attempt came from PYQ practice and which filters were used.

## Exact Backend Changes

### 1. PYQ schemas in `backend/schemas/pyq_schemas.py`

Create models such as:

- `PYQFilterOptionsResponse`
- `PYQBrowseItem`
- `PYQBrowseResponse`
- `StartPYQPracticeRequest`

Response fields should include:

- question metadata
- subject and topic names
- year
- source url if available
- verification status only if you want admins to see it; students likely do not need it

### 2. New browse service in `backend/services/pyq_service.py`

Responsibilities:

- build filter options from the verified `PYQ` question set
- paginate browser results
- start a filtered practice session

Filtering should support:

- year
- subject
- topic
- difficulty
- free-text keyword if needed later

### 3. New router in `backend/routers/pyq.py`

Recommended endpoints:

- `GET /api/pyq/filters`
- `GET /api/pyq/questions`
- `POST /api/pyq/practice`

Behavior notes:

- browser endpoints should only return `source_type = PYQ` and `is_verified = true`
- practice should return question payloads shaped like existing quiz pages expect

### 4. Reuse `backend/services/quiz_service.py`

Do not build a second grading pipeline.

Preferred approach:

- reuse `SubmitQuizRequest` and `process_quiz_submission(...)`
- introduce `quiz_type = "pyq_practice"` or similar
- optionally attach filter context for analytics

This preserves:

- scoring
- mastery updates
- result snapshots

### 5. Extend `backend/schemas/quiz_schemas.py`

No rigid enum currently blocks new quiz types, which is good. Add any extra fields only if the result page needs to know:

- source label
- applied filters

## Exact Frontend Changes

### 1. New page at `frontend/app/(student)/pyq/page.tsx`

The page should include:

- filter bar
- table or card list of PYQs
- launch-practice action
- empty state when the verified PYQ bank is sparse

### 2. Reuse quiz-taking UI instead of rebuilding it

Two safe options:

- create a thin `pyq` practice page that reuses the same question rendering pattern as diagnostic/adaptive
- or refactor shared question-taking UI into a reusable component used by all modes

Recommendation:

- keep the current diagnostic/adaptive pages stable
- add a thin PYQ-specific page or modal only if needed

### 3. Extend result page in `frontend/app/(student)/quiz/result/[attemptId]/page.tsx`

If `quiz_type = pyq_practice`, the page should:

- show the session label clearly
- optionally show applied filters
- otherwise reuse the same result visuals

### 4. Update dashboard quick actions

Add `Browse PYQs` after the page exists.

### 5. Admin question entry touchpoints

`frontend/app/admin/questions/page.tsx` and `frontend/components/admin/QuestionFormModal.tsx` already capture:

- `source_type`
- `year`
- `source_url`

Use this phase to tighten validation and make sure admins can reliably create usable PYQ entries.

## Exact ML / AI Changes

No new ML model is required.

Possible optional reuse:

- use `recommendation_service.py` later to recommend which PYQ filters a weak student should try

For Phase 5, keep PYQ browse logic rule-based and filter-driven.

## Exact APIs To Add Or Change

### New

- `GET /api/pyq/filters`
- `GET /api/pyq/questions`
- `POST /api/pyq/practice`

### Changed

- `POST /api/quiz/submit` should accept and preserve `quiz_type = pyq_practice`
- result fetch logic should handle that quiz type cleanly

## Exact Data Flow Changes

```text
student selects PYQ filters
  -> pyq router fetches verified questions from existing questions table
  -> student launches filtered practice session
  -> answers submitted through existing quiz submission flow
  -> mastery and result snapshot update as usual
  -> result page shows PYQ context
```

## Implementation Order Inside Phase 5

1. add optional indexes and any attempt-context migration
2. implement PYQ schemas and service
3. add PYQ router and register it in `backend/main.py`
4. extend quiz submission/result handling for `pyq_practice`
5. build student PYQ page and filter components
6. add result-page support
7. tighten admin question UX for source/year accuracy
8. run browser and practice end-to-end tests with real PYQ data

## Likely Bugs And Risks

### Content sparsity

If the verified PYQ pool is still small, the browser can feel broken. Build honest empty states instead of hiding the issue.

### Filter mismatch

Years or topics shown in the filter bar must reflect only verified PYQ content, not all questions.

### Result-page assumptions

If the result page or stores assume only `diagnostic` and `adaptive`, PYQ submissions can display incorrectly.

### Admin data quality

Badly entered `year` or `source_type` values will directly degrade the browser experience.

## Phase 5 Testing Checklist

### Backend

- filter endpoint returns only available verified PYQ dimensions
- browser endpoint paginates correctly
- practice launch respects filters
- `pyq_practice` submit path produces valid result snapshots

### Frontend

- filter changes refresh result list
- launching practice from the browser works
- result page labels the PYQ session clearly
- empty-state messaging is clear when no questions match

### Regression

- diagnostic and adaptive quiz flows still work unchanged
- admin question CRUD still works with PYQ metadata

## Definition Of Done

Phase 5 is complete when:

- students can browse verified PYQs
- filtered PYQ practice works end to end
- existing quiz submission and result infrastructure is reused rather than duplicated
