# Phase 1 Manual Testing Guide

## Scope
This guide validates Smart Onboarding 2.0 end to end for Phase 1.

Features covered:
- exam target date
- daily study minutes reuse
- experience level reuse
- subject-wise confidence capture
- known topics capture
- onboarding version tracking
- onboarding completion tracking

## Preconditions
1. Backend server is running at `http://127.0.0.1:8000`.
2. Frontend is running at `http://127.0.0.1:3000`.
3. DB migrations are applied.
4. At least one subject and topic exist.

## Test Data
Use a fresh student account when possible.

Example values:
- exam target date: 6 months in the future
- daily study minutes: 95
- experience level: intermediate
- subject confidence: 70 for one subject, 55 for another
- known topics: select at least one

## Happy Path Manual Flow
1. Open `/login` and register or sign in as a student.
2. Verify redirect goes to `/onboarding` for incomplete profile.
3. Step 1: enter exam date, daily minutes, and experience level.
4. Step 2: set confidence values for available subjects.
5. Step 3: expand a subject and select at least one known topic.
6. Step 4: review and submit.
7. Verify redirect to `/quiz/diagnostic`.
8. Refresh browser and open `/dashboard`.
9. Confirm user is no longer forced back to onboarding.

Expected results:
- save succeeds with no errors
- profile reflects enriched onboarding fields
- onboarding loop is exited after completion

## API Verification (Post-Save)
After successful onboarding, call `GET /api/auth/me` with auth token.

Expected response fields:
- `exam_target_date` populated
- `daily_study_minutes` populated
- `experience_level` populated
- `subject_confidences` non-empty
- `known_topic_ids` present (may be empty if user skipped)
- `onboarding_version` equals `2`
- `onboarding_completed_at` set

## Edge Case Checklist
1. Past exam date:
- Enter a past date in onboarding.
- Expected: validation error shown, cannot continue.

2. Invalid topic id payload (API):
- Send unknown `known_topic_ids` to `PUT /api/auth/me`.
- Expected: `400` with invalid topic id message.

3. Invalid subject id payload (API):
- Send unknown `subject_id` in `subject_confidences`.
- Expected: `400` with invalid subject id message.

4. Duplicate known topic ids (API):
- Send same topic id twice.
- Expected: `400` duplicate topic id error.

5. Duplicate subject ids (API):
- Send same subject id twice in confidence list.
- Expected: `400` duplicate subject id error.

6. Legacy payload compatibility:
- Send only `daily_study_minutes` and `experience_level`.
- Expected: update succeeds, but onboarding remains incomplete.

7. Empty subject confidences with other fields:
- Send exam date, minutes, level, and empty confidence list.
- Expected: update succeeds, but `onboarding_version` not forced to `2`.

## Route Guard Checks
1. Incomplete profile + token -> `/dashboard` should redirect to `/onboarding`.
2. Completed profile + token -> `/onboarding` should redirect to `/dashboard`.
3. Missing token -> student routes should redirect to `/login`.

## Regression Checks
1. Diagnostic quiz page still loads after onboarding completion.
2. Auth state survives refresh after save.
3. Admin login and admin routes still function.

## Useful Commands
Backend onboarding tests:
- `cd backend`
- `..\.venv\Scripts\python.exe -m unittest tests.test_profile_onboarding -v`

Frontend Phase 1 E2E spec:
- `cd frontend`
- `npm run test:e2e -- tests/e2e/chunk11-student-pages.spec.ts`

Backend API smoke:
- start server: `cd backend && ..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000`
- run flow: `..\.venv\Scripts\python.exe backend/test_api_flow.py`
