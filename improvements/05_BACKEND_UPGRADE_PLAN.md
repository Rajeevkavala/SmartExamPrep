# Backend Upgrade Plan

## Keep The Current Backend Architecture

The backend should remain:

- a single FastAPI service
- SQLAlchemy ORM backed by PostgreSQL
- Alembic for schema evolution
- routers -> services -> schemas separation

Nothing in the requested feature set requires splitting the backend into microservices or replacing the ORM layer.

## Existing Backend Areas To Extend

## 1. `backend/routers/auth.py`

### Why it should change

This router already owns the user profile save/load surface through `/api/auth/me`. Smart Onboarding 2.0 belongs here.

### Planned changes

- Extend `GET /api/auth/me` response with:
  - `exam_target_date`
  - `onboarding_version`
  - `onboarding_completed_at`
  - `subject_confidences`
  - `known_topic_ids`
- Extend `PUT /api/auth/me` request payload with:
  - `exam_target_date`
  - `subject_confidences`
  - `known_topic_ids`
- Keep `daily_study_minutes` and `experience_level` in the same contract.

### Reuse opportunity

- Existing auth guard and current-user dependency remain unchanged.
- Existing profile update flow in frontend already calls this route.

## 2. `backend/routers/quiz.py`

### Why it should change

The quiz pipeline should remain the source of truth for scored practice attempts, including future PYQ practice and planner-linked quiz tasks.

### Planned changes

- Keep:
  - `GET /diagnostic`
  - `GET /adaptive`
  - `POST /submit`
  - `GET /attempts/{attempt_id}`
- Extend `POST /submit` contract so the request can optionally include `context_payload`.
- Allow `quiz_type` values beyond `diagnostic` and `adaptive`, including:
  - `pyq_practice`
  - `planner_practice`
  - `roadmap_checkpoint`

### Important rule

Do not create a second scoring pipeline for PYQ or planner work. All scored question sessions should still end in `quiz_service.process_quiz_submission()`.

## 3. `backend/routers/analysis.py`

### Why it should change

The enhanced dashboard depends on this router.

### Planned changes

- Expand `GET /api/analysis/dashboard` to include:
  - study streak
  - questions solved
  - average accuracy
  - hours studied
  - roadmap progress
  - planner summary
  - topic progress summary
- Keep `GET /api/analysis/metrics` for research/demo metrics, but extend it to share common aggregation logic with the dashboard layer.

## 4. `backend/routers/revision.py`

### Why it should change

The current API is topic-based and minimal. Planner-driven work needs clearer completion semantics.

### Planned changes

- Keep `GET /plan` for backward compatibility.
- Update completion semantics so `mark-done` can accept:
  - `schedule_id`, or
  - `daily_task_id`
- Keep topic-based fallback temporarily if needed, but plan to migrate the frontend to ID-based completion.

## 5. `backend/routers/content.py`

### Why it should change

This router is already the student-facing content lookup surface and should feed onboarding, roadmap filters, and PYQ browse filters.

### Planned changes

- Keep current endpoints.
- Optionally add lightweight enhancements:
  - topic counts per subject
  - topic mastery overlay for current user
  - subject confidence overlay for onboarding edit mode

## New Routers To Add

## 1. `backend/routers/roadmap.py`

### Purpose

Expose roadmap generation and retrieval.

### Proposed endpoints

- `POST /api/roadmap/generate`
- `GET /api/roadmap/current`
- `GET /api/roadmap/current/weeks`
- `GET /api/roadmap/current/weeks/{week_number}`
- `POST /api/roadmap/current/regenerate`

### Notes

- `generate` should be idempotent enough to archive the old roadmap and create a new active one.
- Use the current profile plus latest mastery state to drive generation.

## 2. `backend/routers/planner.py`

### Purpose

Expose daily plan creation, retrieval, and task completion.

### Proposed endpoints

- `GET /api/planner/today`
- `GET /api/planner/{plan_date}`
- `POST /api/planner/today/generate`
- `POST /api/planner/today/refresh`
- `POST /api/planner/tasks/{task_id}/complete`
- `POST /api/planner/tasks/{task_id}/skip`
- `POST /api/planner/tasks/{task_id}/carry-forward`

### Notes

- `today/generate` should create the row if missing.
- `today/refresh` should be careful not to destroy completed tasks.

## 3. `backend/routers/pyq.py`

### Purpose

Expose the question bank as a student-facing PYQ browser.

### Proposed endpoints

- `GET /api/pyq/questions`
- `GET /api/pyq/filters`
- `POST /api/pyq/practice`

### Notes

- `GET /questions` should return verified PYQ rows only.
- `POST /practice` should return a filtered question list, not score the quiz.
- quiz scoring should still go through `POST /api/quiz/submit`.

## 4. `backend/routers/study_chat.py`

### Purpose

Expose grounded chatbot session/message APIs.

### Proposed endpoints

- `GET /api/ai/study-chat/sessions`
- `POST /api/ai/study-chat/sessions`
- `GET /api/ai/study-chat/sessions/{session_id}`
- `POST /api/ai/study-chat/sessions/{session_id}/messages`

### Notes

- Keep this router under the AI prefix to match the current mental model.
- Store grounding metadata with each assistant message.

## Service Layer Changes

## Existing services to extend

### `backend/services/quiz_service.py`

- Accept and persist `context_payload`.
- Insert activity-log records for completed quiz attempts.
- Support planner/PYQ metadata without changing scoring math.

### `backend/services/dashboard_service.py`

- Expand from a small snapshot service into an operational summary service.
- Pull from:
  - `topic_masteries`
  - `quiz_attempts`
  - `study_activity_logs`
  - `study_roadmaps`
  - `daily_study_plans`

### `backend/services/metrics_service.py`

- Share aggregation helpers with dashboard service.
- Keep the research/export orientation, but do not duplicate calculation logic.

### `backend/services/recommendation_service.py`

- Reuse adaptive candidate selection for planner-generated practice tasks.
- Optionally expose a helper that returns â€œrecommended question IDsâ€ without formatting the whole quiz response.

### `backend/services/weakness_service.py`

- Remain the source of topic weakness computation.
- Add helper outputs that are easier for roadmap sequencing and dashboard topic-progress summaries.

### `backend/services/ai_service.py`

- Keep the AI client initialization and fallback pattern.
- Add new functions for:
  - roadmap explanation
  - planner explanation
  - chat completion against a prepared context pack
- Do not let AI decide primary schedule structure. Use it to explain and tutor.

## New services to add

### `backend/services/roadmap_service.py`

Responsibilities:

- gather profile + mastery + syllabus context
- compute a 52-week plan
- persist roadmap rows
- regenerate/replace active roadmap

### `backend/services/planner_service.py`

Responsibilities:

- build todayâ€™s plan from:
  - active roadmap week
  - due revision schedules
  - weak topics
  - carry-forward tasks
- persist daily tasks
- update task completion state

### `backend/services/study_activity_service.py`

Responsibilities:

- write normalized activity records
- expose helper functions for:
  - streak
  - minutes studied
  - questions solved
  - daily compliance

### `backend/services/study_chat_service.py`

Responsibilities:

- build chat grounding packets from:
  - user profile
  - roadmap
  - planner
  - mastery
  - revision
  - optionally filtered question snippets
- persist chat sessions/messages
- call AI and store assistant outputs

## Schema DTO Changes

## Extend existing schema files

### `backend/schemas/auth_schemas.py`

Add:

- richer `UserResponse`
- richer `UpdateProfileRequest`
- nested onboarding DTOs for:
  - subject confidence items
  - known topic selections

### `backend/schemas/analysis_schemas.py`

Add:

- dashboard KPI cards
- roadmap progress DTO
- planner summary DTO
- topic progress DTO

### `backend/schemas/quiz_schemas.py`

Add:

- optional `context_payload` on quiz submission
- response fields for richer post-PYQ/planner flows if needed

## Add new schema files

- `backend/schemas/roadmap_schemas.py`
- `backend/schemas/planner_schemas.py`
- `backend/schemas/pyq_schemas.py`
- `backend/schemas/study_chat_schemas.py`

## API Contract Changes

## Existing routes whose response shape changes

| Route | Change |
| --- | --- |
| `GET /api/auth/me` | Returns richer onboarding/profile payload |
| `PUT /api/auth/me` | Accepts richer onboarding/profile payload |
| `POST /api/quiz/submit` | Accepts optional `context_payload` |
| `GET /api/analysis/dashboard` | Returns planner/roadmap/activity summary |
| `POST /api/revision/mark-done` | Should move toward ID-based completion semantics |

## Backend areas that should remain unchanged

- Password hashing/JWT creation mechanics in `auth_service.py`
- Existing admin subject/question CRUD routes
- Existing scraper and syllabus routes as ingestion features
- Core `TopicMastery` logic as the measured-learning layer

## Rollout Safety Notes

### Safe additions

- Additive routes
- Additive response fields
- Additive nullable DB columns
- Additive tables

### Changes that need extra care

- `revision_schedules` uniqueness and completion semantics
- quiz submit contract changes
- dashboard response shape changes consumed by Zustand

## Backend implementation rule of thumb

The backend already has a working learning engine. New work should make it more context-aware, not more fragmented.

