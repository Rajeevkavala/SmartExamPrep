# Phase 2 Manual Testing Guide

## Goal

Validate SmartExamPrep Phase 2 end to end:

- enriched onboarding is available as the roadmap prerequisite
- roadmap generation persists and renders correctly
- roadmap regeneration supersedes the active roadmap safely
- day tracking updates the active roadmap without breaking existing flows
- incomplete profiles are blocked with a clear recovery path

## Preconditions

- backend dependencies installed
- frontend dependencies installed
- a clean database or throwaway local database
- seeded subjects/topics/questions available

## Recommended Local Setup

### Backend

1. Set environment variables for a local database and JWT secret.
2. Seed the database with:
   - `python seed.py`
3. Start the API:
   - `python -m uvicorn main:app --host 127.0.0.1 --port 8000`

### Frontend

1. Ensure `NEXT_PUBLIC_API_URL=http://localhost:8000`
2. Start the app:
   - `npm run dev`

## Test Accounts

### Student

- create a new student through `/login`

### Admin

- use the seeded admin:
  - email: `admin@smartexamprep.com`
  - password: `admin@1234`

## Core Scenarios

### 1. Incomplete profile is blocked

1. Register a brand-new student.
2. Go directly to `/roadmap` without completing onboarding.
3. Click `Generate Roadmap`.

Expected:

- generation is rejected
- the page shows an inline onboarding warning
- a `Complete Onboarding` action is visible
- no roadmap rows are created for the user

### 2. Onboarding prerequisites save correctly

1. Complete onboarding with:
   - future exam target date
   - daily study minutes
   - experience level
   - at least one subject confidence
   - optional known topics
2. Submit the form.
3. Refresh `/onboarding` or inspect `/api/auth/me`.

Expected:

- profile reload shows the saved values
- `exam_target_date` is present
- `subject_confidences` is non-empty
- `onboarding_version` is `2`
- `onboarding_completed_at` is non-null

### 3. First roadmap generation

1. Open `/roadmap`.
2. Click `Generate Roadmap`.

Expected:

- request succeeds
- a single active roadmap is created
- roadmap hero shows horizon, weeks left, topics, and minutes
- month 1 renders with weekly cards
- each visible week shows topics, rationale, and day-level items

### 4. Generation without quiz history

1. Use a student who completed onboarding but has not taken any quiz.
2. Generate the roadmap.

Expected:

- roadmap still generates successfully
- sequencing is based on onboarding confidence and syllabus ordering
- no crash occurs because mastery data is missing

### 5. Regeneration after quiz history

1. Take a diagnostic quiz.
2. Submit the quiz.
3. Return to `/roadmap`.
4. Click `Regenerate Roadmap`.

Expected:

- a new active roadmap is created
- the previous active roadmap becomes `superseded`
- the visible roadmap updates
- topic order or week focus changes are explainable from weakness/mastery changes

### 6. Generate next month

1. On an existing roadmap, click `Generate Month X`.

Expected:

- the same roadmap stays active
- additional weeks are appended
- `generated_weeks` and `generated_months` increase
- existing weeks are preserved

### 7. Day tracking

1. Expand a week card.
2. Mark one day `In Progress`.
3. Mark the same day `Complete`.
4. Refresh the page.

Expected:

- day status persists
- week completion metrics update
- completed days count increases
- week status changes from `pending` to `active` or `completed` appropriately

### 8. Dashboard entry point

1. Open `/dashboard`.
2. Use the `View Roadmap` quick action.

Expected:

- navigation reaches `/roadmap`
- protected-route behavior remains correct

## Regression Checks

Run these after the roadmap scenarios:

1. Login still works for student and admin.
2. `/onboarding` still saves successfully.
3. `/dashboard` still loads.
4. Diagnostic quiz still loads and submits.
5. Revision page still loads.
6. Admin subject list still loads.

## Suggested Automated Commands

### Backend

- `python -m pytest tests/test_profile_onboarding.py tests/test_roadmap_service.py tests/test_roadmap_router.py`
- `python test_api_flow.py`

### Frontend

- `npm run test:e2e -- tests/e2e/chunk17-roadmap.spec.ts`

## Pass Criteria

Phase 2 can be considered manually validated when:

- incomplete users cannot generate roadmaps
- onboarded users can generate and view a roadmap
- regeneration supersedes the active roadmap safely
- next-month generation extends the current roadmap without duplication
- day tracking persists and updates visible progress
- dashboard, quiz, revision, and admin smoke flows still work
