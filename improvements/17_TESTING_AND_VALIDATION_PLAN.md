# 17 Testing And Validation Plan

## Testing Strategy Overview

The safest validation approach for this repo is layered:

1. migration and model validation first
2. backend service and router tests next
3. frontend route and interaction tests after that
4. AI/fallback validation for AI-dependent features
5. manual end-to-end smoke tests before merging each phase

This matches the current project shape:

- FastAPI backend with explicit routers/services
- Next.js frontend with Playwright already present
- AI already isolated behind a service layer
- core learning state already stored in relational tables

## Existing Validation Assets To Reuse

### Backend

- `backend/test_api_flow.py`
- `backend/run_ai_validation.py`
- `backend/tests/test_syllabus_contract.py`

### Frontend

- `frontend/tests/e2e/chunk11-student-pages.spec.ts`
- `frontend/tests/e2e/chunk12-quiz-revision.spec.ts`
- `frontend/tests/e2e/chunk13-admin-panel.spec.ts`
- `frontend/tests/e2e/chunk14-admin-questions.spec.ts`
- `frontend/tests/e2e/chunk15-admin-scraper.spec.ts`
- `frontend/tests/e2e/chunk16-admin-syllabus.spec.ts`

## Validation Scope By Phase

| Phase | Backend Focus | Frontend Focus | AI/ML Focus |
| --- | --- | --- | --- |
| Phase 1 | profile persistence, auth contract stability | onboarding flow, auth store refresh, protected route access | no new model work; verify future roadmap inputs are persisted |
| Phase 2 | roadmap generation correctness and persistence | roadmap rendering, regeneration, navigation | verify rule-based sequencing against weakness/profile inputs |
| Phase 3 | planner generation, carry-forward, activity logging | planner interactions, task completion, revision links | verify recommender and revision signals are reused correctly |
| Phase 4 | dashboard aggregation correctness and performance | dashboard KPI rendering and responsive layout | verify any AI hint remains optional and grounded |
| Phase 5 | PYQ browse filters and practice submission | browser filters, practice launch, result page context | no new model work; validate content quality assumptions |
| Phase 6 | chat session security, grounding, fallback behavior | chat UI state, session history, error handling | verify AI grounding, fallback replies, and latency behavior |

## Backend Validation Plan

### 1. Migration Validation

For every migration:

- run upgrade on a clean database
- run upgrade on a database with demo seed data
- inspect new constraints and indexes
- verify no existing tables lose data

Special checks:

- duplicate scan before unique constraint on `revision_schedules(user_id, topic_id)`
- only one active daily plan per `(user_id, plan_date)`
- roadmap generation does not create duplicate active rows

### 2. Service-Level Tests

Add focused tests around deterministic logic:

- `test_profile_onboarding.py`
- `test_roadmap_service.py`
- `test_planner_service.py`
- `test_dashboard_metrics.py`

Service-test priorities:

- roadmap sequencing should be deterministic for fixed input
- planner carry-forward should be bounded
- activity logging should not double count
- dashboard streak and totals should be consistent

### 3. Router-Level Tests

Add integration-style tests for:

- enriched `GET /api/auth/me`
- `PUT /api/auth/me`
- roadmap generation and retrieval
- planner generation and task updates
- PYQ browse and practice launch
- chat session/message flow

Recommended files:

- `backend/tests/test_roadmap_router.py`
- `backend/tests/test_planner_router.py`
- `backend/tests/test_pyq_router.py`
- `backend/tests/test_study_chat_router.py`

### 4. Smoke Script Coverage

Extend `backend/test_api_flow.py` to cover:

- profile update with onboarding 2.0 payload
- roadmap generation
- planner generation
- dashboard fetch after planner activity
- PYQ filter browse
- optional chat message submission with AI mocked or fallback-enabled

## Frontend Validation Plan

### 1. Keep Current E2E Coverage Green

Before starting each phase, the current Playwright suite should remain green for:

- login
- onboarding
- dashboard
- diagnostic quiz
- adaptive quiz
- revision
- admin pages

### 2. Add Feature-Specific Playwright Coverage

Recommended additions:

- `frontend/tests/e2e/chunk17-roadmap.spec.ts`
- `frontend/tests/e2e/chunk18-planner.spec.ts`
- `frontend/tests/e2e/chunk19-pyq.spec.ts`
- `frontend/tests/e2e/chunk20-chat.spec.ts`

### 3. Frontend Validation Focus Areas

For the upgraded pages, validate:

- loading states
- empty states
- error states
- state refresh after writes
- mobile and desktop rendering

### 4. Store Integrity Checks

Client-side state bugs are likely because the app uses Zustand heavily.

Verify after writes:

- `authStore` updates from profile save
- `dashboardStore` hydrates new dashboard fields safely
- `roadmapStore`, `plannerStore`, and `chatStore` reset and refresh correctly

## ML / AI Validation Plan

### Roadmap And Planner Logic

These should stay mostly rule-based, so validate them like deterministic business logic:

- same input profile should generate stable roadmap ordering
- adding strong mastery should delay a topic in the roadmap
- adding weak mastery should pull a topic earlier
- due revisions should enter the planner before lower-priority learn tasks

### Existing ML Runtime Reuse

Validate that current ML components still behave sensibly:

- `WeaknessDetector` still updates mastery-derived weakness correctly
- `AdaptiveRecommender` still returns useful question sets after planner integration
- `SpacedRevisionScheduler` still updates due dates correctly after revision completion

### AI Validation

Extend `backend/run_ai_validation.py` to cover:

- dashboard hint fallback behavior
- chat reply fallback behavior
- prompt grounding presence
- latency or timeout handling

### Chatbot Grounding Validation

For chat specifically, inspect whether answers:

- mention actual weak topics from the DB
- reference the real roadmap week or today's plan when applicable
- avoid claiming nonexistent features or subjects

## Regression Testing Plan

Run this baseline regression suite before merging every phase:

- register and login
- `GET /api/auth/me`
- onboarding page load/save
- dashboard load
- diagnostic quiz load/submit
- adaptive quiz load/submit
- result reload by direct URL
- revision plan load and mark-done
- admin subject CRUD
- admin question CRUD
- scraper start/list/import
- syllabus upload/list/import

## Phase-By-Phase Merge Checklist

### Phase 1 Before Merge

- migration applies cleanly
- old profile payload still works
- onboarding 2.0 saves and reloads
- dashboard and quiz entry still work for updated users

### Phase 2 Before Merge

- active roadmap generation works
- regeneration supersedes prior roadmap
- roadmap page loads for a user with and without prior quiz history

### Phase 3 Before Merge

- only one daily plan exists per day
- carry-forward does not duplicate endlessly
- task completion and activity logs are consistent
- revision and quiz still behave correctly

### Phase 4 Before Merge

- dashboard KPI values match backend data
- dashboard loads quickly enough with planner/roadmap data present
- no null/partial data crashes occur

### Phase 5 Before Merge

- only verified PYQ content appears
- practice launch respects filters
- result page handles PYQ attempt type

### Phase 6 Before Merge

- chat sessions are user-isolated
- responses are grounded and safe under AI failure
- dashboard and `/api/ai/explain` still work when chat is enabled

## Manual QA Checklist

- Create a brand-new student, complete onboarding, and verify saved profile by refreshing.
- Generate a roadmap for a student with no quiz history and confirm it still looks sensible.
- Take a diagnostic quiz, regenerate the roadmap, and confirm sequencing changes are explainable.
- Generate today's plan and confirm revisions appear ahead of lower-priority tasks.
- Complete planner tasks, then refresh dashboard and confirm metrics update.
- Browse PYQs, filter by year/subject/topic, and launch a practice session.
- Reload a result page directly by URL for diagnostic, adaptive, and PYQ attempts.
- Open the chat page and ask for weak-topic help, roadmap help, and today's plan help.
- Disable or break AI locally and verify dashboard/chat degrade gracefully.
- Log out and confirm protected routes are no longer accessible.

## Data Validation Checklist

- no duplicate `user_subject_confidences` rows per user/subject
- no duplicate `user_topic_baselines` rows per user/topic
- no duplicate active daily plans for one user/date
- no duplicate active roadmaps for one user
- chat messages belong only to their session and user
- PYQ filters reflect only verified `source_type = PYQ` content

## Observability And Debugging Aids

Even without a full observability stack, add enough visibility to debug rollout issues:

- log roadmap generation inputs and output counts
- log planner generation inputs and generated task counts
- log chat prompt classification and fallback usage
- log AI timeout/failure events without exposing raw errors to users

## Exit Criteria

The upgrade program is ready for stable use when:

- every phase has passing migration, backend, and frontend validation
- core regression flows remain green throughout
- new AI surfaces fail safely under AI unavailability
- metrics shown to users are traceable back to stored data

