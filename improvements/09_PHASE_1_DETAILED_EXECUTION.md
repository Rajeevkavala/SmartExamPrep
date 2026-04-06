# 09 Phase 1 Detailed Execution

## Phase Goal

Phase 1 establishes the profile and onboarding foundation required by every later feature. The current project already stores `users.daily_study_minutes` and `users.experience_level`, and the current onboarding screen at `frontend/app/(student)/onboarding/page.tsx` already writes those values through `PUT /api/auth/me`. The safest first step is to extend that existing flow rather than invent a parallel onboarding system.

The phase outcome should be:

- Smart Onboarding 2.0 data is stored durably.
- existing auth and protected-route behavior still works
- roadmap generation has enough structured input to start in Phase 2
- no student quiz, revision, or admin flow is broken by the richer user object

## Features Included

- target exam date
- target daily study time reuse through `users.daily_study_minutes`
- user level reuse through `users.experience_level`
- topics already known
- subject-wise confidence capture
- onboarding version and completion tracking

## Exact Files To Read First

Read these in this order before making changes:

1. `backend/models/models.py`
2. `backend/schemas/auth_schemas.py`
3. `backend/routers/auth.py`
4. `backend/services/auth_service.py`
5. `backend/routers/content.py`
6. `backend/dependencies.py`
7. `frontend/store/authStore.ts`
8. `frontend/lib/api.ts`
9. `frontend/lib/validations.ts`
10. `frontend/app/(student)/onboarding/page.tsx`
11. `frontend/middleware.ts`
12. `frontend/tests/e2e/chunk11-student-pages.spec.ts`

## Existing Files To Modify

### Backend

- `backend/models/models.py`
- `backend/schemas/auth_schemas.py`
- `backend/routers/auth.py`
- `backend/services/auth_service.py`
- `backend/main.py`

### Frontend

- `frontend/store/authStore.ts`
- `frontend/lib/validations.ts`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/middleware.ts`

### Tests

- `frontend/tests/e2e/chunk11-student-pages.spec.ts`
- `backend/test_api_flow.py`

## New Files To Create

### Backend

- `backend/alembic/versions/<timestamp>_add_onboarding_profile_tables.py`
- `backend/services/profile_service.py`
- `backend/tests/test_profile_onboarding.py`

### Frontend

- `frontend/components/student/OnboardingExamTargets.tsx`
- `frontend/components/student/OnboardingSubjectConfidence.tsx`
- `frontend/components/student/OnboardingKnownTopics.tsx`

## Exact DB Changes

### Extend `users`

Add the following nullable columns first so existing users continue to work:

- `exam_target_date`
- `onboarding_version`
- `onboarding_completed_at`

Notes:

- keep `daily_study_minutes`; do not add a duplicate daily-hours field
- keep `experience_level`; it already represents user level
- default existing rows to `NULL` and let application logic treat them as incomplete onboarding

### Add `user_subject_confidences`

Purpose: store subject-level self-assessment without polluting `users`.

Suggested columns:

- `id`
- `user_id`
- `subject_id`
- `confidence_pct`
- `source` with values like `onboarding`, `manual_update`
- `created_at`
- `updated_at`

Constraints:

- unique constraint on `(user_id, subject_id)`
- foreign keys to `users.id` and `subjects.id`

### Add `user_topic_baselines`

Purpose: store topics the learner claims to already know before roadmap generation.

Suggested columns:

- `id`
- `user_id`
- `topic_id`
- `already_known`
- `source`
- `created_at`
- `updated_at`

Constraints:

- unique constraint on `(user_id, topic_id)`
- foreign keys to `users.id` and `topics.id`

### Migration Safety Checks

- backfill `onboarding_version = 1` only if you want to distinguish legacy users from untouched rows
- otherwise leave nulls and derive onboarding completeness in service logic
- if Phase 1 also touches `revision_schedules`, only add the `(user_id, topic_id)` uniqueness constraint after a duplicate scan

## Exact Backend Changes

### 1. ORM updates in `backend/models/models.py`

Add:

- new `User` columns listed above
- `UserSubjectConfidence` model
- `UserTopicBaseline` model
- relationships from `User` to both tables
- reverse relationships from `Subject` and `Topic` if you want easier joined loads

Do not change:

- auth token logic
- existing quiz/mastery/revision tables
- question or topic enums

### 2. Schema expansion in `backend/schemas/auth_schemas.py`

Add response/request DTOs instead of dumping raw arrays into `UserResponse`.

Recommended additions:

- `SubjectConfidenceItem`
- `KnownTopicItem` or `known_topic_ids: list[str]`
- expanded `UpdateProfileRequest`
- expanded `UserResponse`

`UpdateProfileRequest` should accept:

- `daily_study_minutes`
- `experience_level`
- `exam_target_date`
- `subject_confidences`
- `known_topic_ids`

Validation rules:

- exam date must be in the future
- confidence values must be integers between 0 and 100
- topic IDs must be valid UUID strings
- empty submissions should still be accepted for existing users editing only one field

### 3. Profile write service in `backend/services/profile_service.py`

Create a focused service instead of bloating `auth.py`.

Responsibilities:

- update the core `User` fields
- upsert subject confidence rows
- replace or upsert known-topic baseline rows
- set `onboarding_version = 2`
- set `onboarding_completed_at` when the payload is sufficiently complete
- return a fully hydrated user profile for the response

Implementation note:

- treat subject confidences as replace-all for the submitted set
- treat known topics as replace-all as well, because the onboarding UI is stateful and easier to reason about that way

### 4. Router changes in `backend/routers/auth.py`

Keep the current route surface:

- `GET /api/auth/me`
- `PUT /api/auth/me`

Change behavior:

- `GET /me` should return nested onboarding fields
- `PUT /me` should call `profile_service.update_profile(...)`
- preserve existing response status codes and auth requirements

### 5. App wiring in `backend/main.py`

No new router is needed in this phase, but if `profile_service.py` requires import-time model registration, ensure startup still succeeds cleanly.

### 6. Validation and referential checks

When saving profile data:

- verify every `subject_id` exists
- verify every `topic_id` exists
- optionally verify that selected topics belong to the syllabus tree expected by the UI
- reject duplicate subject IDs in one request
- reject duplicate topic IDs in one request

### 7. Keep `backend/services/auth_service.py` narrow

Only expand it if you need shared user serialization helpers. Do not move onboarding write logic into `auth_service.py` if that makes auth and onboarding harder to reason about.

## Exact Frontend Changes

### 1. Extend auth typing in `frontend/store/authStore.ts`

The current `AuthUser` only includes a few fields and `[key: string]: unknown`.

Replace the weakly typed shape with explicit optional fields:

- `experience_level`
- `exam_target_date`
- `onboarding_version`
- `onboarding_completed_at`
- `subject_confidences`
- `known_topic_ids`

This keeps future roadmap/planner UI strongly typed.

### 2. Add onboarding validation in `frontend/lib/validations.ts`

Create:

- `subjectConfidenceSchema`
- `onboardingProfileSchema`

Rules:

- exam target date must be future-dated
- daily study minutes should continue matching backend bounds
- subject confidence list cannot be empty on a first-run onboarding submission
- known topics can be empty

### 3. Refactor `frontend/app/(student)/onboarding/page.tsx`

Replace the single minimal form with a multi-step flow that still submits one payload to `PUT /api/auth/me`.

Suggested steps:

- Step 1: exam target date, daily study target, experience level
- Step 2: subject confidence matrix
- Step 3: known topics selection
- Step 4: review and submit

Behavior requirements:

- load subjects once from `GET /api/content/subjects`
- load topics lazily per subject from `GET /api/content/subjects/{subject_id}/topics`
- prefill existing values from `useAuthStore().user`
- after successful save, update auth store using returned user payload

### 4. New reusable student components

Create small components rather than keeping the page monolithic:

- `OnboardingExamTargets.tsx`
- `OnboardingSubjectConfidence.tsx`
- `OnboardingKnownTopics.tsx`

Each component should stay stateless or lightly stateful and accept controlled props from the page.

### 5. Middleware review in `frontend/middleware.ts`

This file currently reads the frontend-managed `token` cookie, while the backend also sets `access_token`.

For Phase 1:

- do not attempt a full auth rewrite
- verify onboarding route protection still works with the richer flow
- if you touch route redirects, keep backward-compatible checks

### 6. API client impact

`frontend/lib/api.ts` should not need structural changes for onboarding fields, but verify:

- `PUT /auth/me` accepts the larger payload
- `401` handling does not clear state during a slow onboarding submission

## Exact ML / AI Changes

No new ML model work is required in Phase 1.

Required only:

- make sure new profile fields are readable by future roadmap logic
- do not entangle AI with onboarding persistence

## Exact APIs To Add Or Change

### Changed

- `GET /api/auth/me`
- `PUT /api/auth/me`

### Reused Unchanged

- `GET /api/content/subjects`
- `GET /api/content/subjects/{subject_id}/topics`

### No New Routes In This Phase

That keeps the rollout small and avoids premature API sprawl.

## Exact Data Flow Changes

```text
student logs in
  -> frontend auth store loads current user
  -> onboarding page fetches subjects
  -> onboarding page fetches per-subject topics on demand
  -> student submits richer profile to PUT /api/auth/me
  -> backend profile service updates users + subject confidences + topic baselines
  -> GET/PUT auth response returns enriched user payload
  -> auth store replaces cached user
  -> later phases can generate roadmap/planner from the saved profile
```

## Implementation Order Inside Phase 1

1. create Alembic migration
2. update ORM models
3. implement `profile_service.py`
4. extend auth schemas
5. wire auth router to the new profile service
6. add backend tests for read/write profile behavior
7. extend `AuthUser` typing and onboarding validation
8. add onboarding step components
9. refactor onboarding page to multi-step save
10. update Playwright student flow tests
11. run manual register/login/onboarding smoke test

## Likely Bugs And Risks

### Auth-state staleness

If the store is not refreshed after save, the UI will show old onboarding values even though the DB is correct.

### Subject-topic selection drift

The onboarding page may load topics lazily. If a user changes subject confidence choices mid-flow, selected topic IDs can become disconnected from loaded subject sections.

### Large known-topic payloads

The request can become large if many topics are selected. Keep payloads as arrays of IDs only.

### Future-date validation mismatch

Client and server must both reject past dates to avoid inconsistent behavior.

### Cookie confusion

Because the current app uses a frontend `token` cookie and backend `access_token` cookie, onboarding redirect issues can be misdiagnosed as profile-save issues.

## Phase 1 Testing Checklist

### Backend

- `PUT /api/auth/me` still works for existing legacy payloads
- full onboarding payload creates subject confidence rows
- full onboarding payload creates known-topic baseline rows
- repeated saves update rows instead of duplicating them
- invalid subject IDs are rejected
- invalid topic IDs are rejected
- `GET /api/auth/me` returns the enriched shape

### Frontend

- onboarding preloads existing values
- subject confidence sliders or inputs keep state across steps
- topic selections persist when navigating backward and forward
- save button is disabled during submission
- success path updates auth store and redirect target

### Regression

- login and register still work
- middleware still permits `/onboarding` for authenticated students
- dashboard still renders with the larger user payload
- diagnostic quiz route still works after onboarding completion

## Definition Of Done

Phase 1 is complete when:

- the database stores all Smart Onboarding 2.0 inputs
- `GET /api/auth/me` and `PUT /api/auth/me` expose those fields safely
- the frontend onboarding UI captures and edits those fields
- the auth store reflects saved data immediately after submit
- no auth, dashboard, revision, or quiz flow regresses

