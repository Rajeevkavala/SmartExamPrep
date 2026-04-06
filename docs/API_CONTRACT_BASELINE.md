# SmartExamPrep API Contract Baseline

Date: 2026-04-05
Status: Implemented baseline for the frontend-backend remediation scope

## Auth Strategy

- Frontend bearer token storage key: `access_token`
- Frontend cookie key for middleware/route guards: `access_token`
- Backend cookie key: `access_token`
- Protected API calls use `Authorization: Bearer <token>`
- Logout contract: `POST /api/auth/logout` clears the `access_token` cookie

## Student Runtime Contracts

### Auth

- `POST /api/auth/register`
  - Returns the created user profile shape.
- `POST /api/auth/login`
  - Returns `{ access_token, role }`
  - Sets the `access_token` cookie.
- `POST /api/auth/logout`
  - Returns `{ logged_out: true }`
  - Clears the `access_token` cookie.
- `GET /api/auth/me`
  - Returns the full enriched profile.
- `PUT /api/auth/me`
  - Accepts onboarding and settings fields.
  - Persisted fields now include:
    - `full_name`
    - `phone`
    - `language`
    - `timezone`
    - `daily_study_minutes`
    - `experience_level`
    - `exam_target_date`
    - `email_notifications_enabled`
    - `push_notifications_enabled`
    - `study_reminders_enabled`
    - `subject_confidences`
    - `known_topic_ids`

### Exams

- `GET /api/exams/`
  - Returns exam catalog rows with:
    - `exam_id`
    - `code`
    - `title`
    - `category`
    - `description`
    - `topic_count`
    - `pyq_count`
    - `enrolled_count`

### Predictor

- `GET /api/ai/predictions?exam_id=<id>`
  - Returns:
    - `exam_id`
    - `exam_title`
    - `generated_at`
    - `insight`
    - `rows`
    - `repeat_topics`
    - `metadata`
- `POST /api/ai/predictions/refresh`
  - Request: `{ exam_id }`
  - Returns a fresh prediction snapshot.
- `POST /api/ai/predictions/{exam_id}/copy-to-roadmap`
  - Request:
    - `topic_ids?: string[]`
    - `force_regenerate?: boolean`
  - Returns:
    - `copied_topic_ids`
    - `roadmap_id`
    - `generation_reason`

### Mock Tests and Quiz History

- `POST /api/quiz/mock-session`
  - Request:
    - `exam_id`
    - `mock_type`
    - `session_mode`
    - `time_limit_seconds`
    - `question_count`
    - `year_filter?`
  - Returns:
    - `session_id`
    - `exam_id`
    - `exam_title`
    - `mock_type`
    - `session_mode`
    - `time_limit_seconds`
    - `question_count`
    - `year_filter`
    - `questions`
    - `context_payload`
    - `created_at`
- `GET /api/quiz/mock-session/{session_id}`
  - Returns the persisted server-side mock session payload.
- `GET /api/quiz/attempts`
  - Query:
    - `source?`
    - `limit?`
  - Returns:
    - `attempts`
    - `total`
- `POST /api/quiz/submit`
  - Persists quiz attempts.
  - Marks linked mock sessions completed when `context_payload.mock_session_id` is present.

### Student Uploads

- `POST /api/uploads/?exam_id=<id>`
  - Multipart upload for student PDFs.
  - Returns the queued upload summary.
- `GET /api/uploads/`
  - Returns the current student's upload history.
- `GET /api/uploads/{upload_id}`
  - Returns upload details including generated MCQs.
- `DELETE /api/uploads/{upload_id}`
  - Deletes the upload and stored file.

Student upload processing behavior:

- Text-based question-bank PDFs are parsed into MCQs with rule-based extraction.
- If rule-based extraction is insufficient, AI MCQ generation is used when configured.
- Terminal statuses:
  - `done`
  - `failed`

## Analytics Contract Additions

### Dashboard

`GET /api/analysis/dashboard` now includes:

- `study_streak_delta_vs_last_week`
- `questions_goal_today`
- `accuracy_delta_vs_yesterday`
- `status_badge_label`

### Metrics

`GET /api/analysis/metrics` now includes:

- `longest_streak_days`
- `daily_goal_minutes`
- `activity_heatmap`
- `ai_insight`

## Request Correlation

- Frontend axios requests attach `X-Request-Id`
- Backend responses echo `X-Request-Id`
- Unhandled backend errors include `request_id`

## Smoke Verification Commands

Run from the repository root unless noted otherwise.

### Backend integration smoke

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests/test_student_runtime_features.py -q
```

### Backend regression subset

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest tests/test_profile_onboarding.py tests/test_dashboard_metrics.py tests/test_pyq_router.py tests/test_revision_router.py tests/test_roadmap_router.py tests/test_planner_router.py tests/test_study_chat_router.py tests/test_admin_content_router.py tests/test_student_runtime_features.py -q
```

### Frontend production build

```powershell
cd frontend
npm run build
```

### Frontend browser smoke

```powershell
cd frontend
npx playwright test tests/e2e/frontend-foundation.spec.ts tests/e2e/chunk13-admin-panel.spec.ts --project=chromium
```
