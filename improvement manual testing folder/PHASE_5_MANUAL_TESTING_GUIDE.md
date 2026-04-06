# Phase 5 Manual Testing Guide

## Scope

Validate SmartExamPrep Phase 5 end to end with explicit Phase 4 integration checks.

Features covered:
- PYQ browser filters and listing
- PYQ practice launch from filtered inventory
- quiz submission reuse for `pyq_practice`
- PYQ-aware result rendering
- dashboard and planner linkage sanity (Phase 4 + Phase 5 integration)
- key edge-case handling for invalid filter inputs

## Preconditions

1. Backend is running at `http://127.0.0.1:8000`.
2. Frontend is running at `http://127.0.0.1:3000`.
3. Migrations are applied.
4. At least one student user exists and can log in.
5. At least one verified PYQ question exists in the question bank.

## Recommended Data Setup

1. Seed baseline data:

```powershell
cd backend
..\.venv\Scripts\python.exe seed.py
```

2. Verify there are verified PYQ rows in admin questions:
- `source_type = PYQ`
- `is_verified = true`
- year, subject, and topic metadata populated

## Automated Checks

Run these before manual QA:

### Backend

```powershell
cd backend
$env:PYTHONPATH = "d:\New folder (2)\SmartExamPrep\backend"
..\.venv\Scripts\python.exe -m pytest tests/test_dashboard_metrics.py tests/test_pyq_router.py -q
```

Expected:
- all tests pass
- includes UUID filter validation coverage for PYQ endpoints

### Frontend E2E

```powershell
cd frontend
npm run test:e2e -- tests/e2e/chunk11-student-pages.spec.ts tests/e2e/chunk12-quiz-revision.spec.ts tests/e2e/chunk14-admin-questions.spec.ts tests/e2e/chunk18-planner.spec.ts tests/e2e/chunk19-pyq.spec.ts
```

Expected:
- all selected specs pass
- PYQ browser + practice flow succeeds end to end

## Manual Flow

### 1. Student access and navigation

1. Log in as a student.
2. Open `/dashboard`.
3. Verify there is a visible path to `/pyq` (direct URL or quick action).
4. Navigate to `/pyq`.

Expected:
- page loads with `PYQ Browser` heading
- filters and question list sections are visible

### 2. Filter loading and baseline browse

1. On `/pyq`, wait for initial load.
2. Verify filter options appear:
- subject
- topic
- difficulty
- year from / year to
3. Verify question table shows only PYQ inventory rows.

Expected:
- no crash during load
- total count is displayed
- verified PYQ questions appear in list

### 3. Filter application

1. Select a specific subject.
2. Select a specific topic under that subject.
3. Select difficulty.
4. Select a year range.
5. Click `Apply Filters`.

Expected:
- list refreshes
- count updates
- rows match selected filters

### 4. Empty-state behavior

1. Apply a narrow filter combination expected to return zero rows.

Expected:
- clear empty-state message appears
- start-practice call-to-action is disabled or not actionable for zero inventory

### 5. Start PYQ practice from filtered set

1. Apply a filter set with at least one matching PYQ.
2. Click `Start PYQ Practice`.

Expected:
- transitions into practice session UI
- session context chips (subject/topic/difficulty/year) are shown when available
- progress indicator reflects question index

### 6. Submit PYQ practice

1. Answer all questions.
2. Click `Submit PYQ Practice`.

Expected:
- submission succeeds via quiz pipeline
- user is redirected to `/quiz/result/{attemptId}`
- result page label reflects PYQ context (for example: `PYQ Practice Result`)
- page offers navigation back to PYQ browser

### 7. Phase 4 integration sanity checks

1. Return to `/dashboard` after completing PYQ practice.
2. Verify dashboard still renders correctly:
- readiness and topic sections
- quick actions
- no rendering errors after PYQ attempt

3. If planner tasks are present, open `/planner` and confirm page still functions.

Expected:
- no regression in dashboard/planner route behavior
- quiz-derived data continues to appear without breaking page load

## Edge Case Checklist

### A. Invalid UUID filter values (API level)

Run with a valid student token.

```bash
curl -X GET "http://127.0.0.1:8000/api/pyq/questions?subject_id=not-a-uuid" -H "Authorization: Bearer <token>"
curl -X GET "http://127.0.0.1:8000/api/pyq/questions?topic_id=invalid-topic" -H "Authorization: Bearer <token>"
```

Expected:
- HTTP 400
- message includes invalid `subject_id` or `topic_id`

### B. Invalid UUID filter values on practice launch

```bash
curl -X POST "http://127.0.0.1:8000/api/pyq/practice" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"subject_id\":\"bad-subject\",\"question_limit\":2}"
curl -X POST "http://127.0.0.1:8000/api/pyq/practice" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"topic_id\":\"bad-topic\",\"question_limit\":2}"
```

Expected:
- HTTP 400
- clear validation message for invalid UUID

### C. Reversed year range

```bash
curl -X GET "http://127.0.0.1:8000/api/pyq/questions?year_from=2024&year_to=2020" -H "Authorization: Bearer <token>"
```

Expected:
- HTTP 400
- message indicates `year_from` cannot be greater than `year_to`

### D. No matching verified PYQ in practice launch

1. Apply very strict filters so no PYQ question matches.
2. Start practice through API or UI.

Expected:
- API returns 404 with clear message
- UI shows actionable feedback (adjust filters and retry)

## Regression Checks

1. Diagnostic quiz flow still works.
2. Adaptive quiz flow still works.
3. Revision page still works.
4. Admin question management still supports PYQ metadata maintenance.
5. Dashboard and planner routes remain stable.

## Sign-Off Criteria

Phase 5 is validated when all are true:
- student can browse verified PYQs with filters
- filtered PYQ practice launches successfully
- practice submission reuses standard quiz scoring pipeline
- result page supports PYQ context
- invalid filter IDs are rejected safely with HTTP 400
- no observable regression in dashboard/planner/quiz baseline flows
