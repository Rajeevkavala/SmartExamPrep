# SmartExamPrep Frontend-Backend Integration Remediation Plan

Date: 2026-04-05
Owner: Full-stack team (frontend + backend + QA)

## 1) Objective

Eliminate frontend mock/placeholder runtime data and make all user-facing features fully functional on real backend data.

This document is a code-verified remediation plan based on the current repository state.

## 2) Scope and Audit Summary

### Scope covered
- Frontend pages: 28 routes under `frontend/app/**/page.tsx`
- Backend APIs: all routers registered in `backend/main.py`
- Runtime integration only (test-only mocks are excluded)

### Verified totals
- Backend API endpoints: 61 total
  - 60 router endpoints in `backend/routers/*.py`
  - 1 system endpoint: `GET /health`
- Frontend routes: 28 pages
  - 19 student pages
  - 6 admin pages
  - 2 auth pages
  - 1 landing page

### Current integration state
- Fully integrated pages: 17
- Partially integrated pages: 4
- Not integrated (runtime static/mock): 5
- Intentional static shell pages: 2 (`/` and `/quiz`)

## 3) Backend API Surface (Verified)

Base API prefixes from `backend/main.py`:
- `/api/auth`
- `/api/quiz`
- `/api/pyq`
- `/api/analysis`
- `/api/revision`
- `/api/content`
- `/api/roadmap`
- `/api/planner`
- `/api/study-chat`
- `/api/ai`
- `/api/feedback`
- `/api/admin/content`
- `/api/admin/questions`
- `/api/admin/scraper`
- `/api/admin/syllabus`

System route:
- `GET /health`

### Router endpoint catalog

#### Auth (`backend/routers/auth.py`)
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`

#### Quiz (`backend/routers/quiz.py`)
- `GET /api/quiz/diagnostic`
- `POST /api/quiz/submit`
- `GET /api/quiz/adaptive`
- `GET /api/quiz/attempts/{attempt_id}`

#### Analysis (`backend/routers/analysis.py`)
- `GET /api/analysis/weakness`
- `GET /api/analysis/dashboard`
- `GET /api/analysis/metrics`

#### Content (`backend/routers/content.py`)
- `GET /api/content/subjects`
- `GET /api/content/subjects/{subject_id}/topics`

#### PYQ (`backend/routers/pyq.py`)
- `GET /api/pyq/filters`
- `GET /api/pyq/questions`
- `POST /api/pyq/practice`

#### Revision (`backend/routers/revision.py`)
- `GET /api/revision/plan`
- `POST /api/revision/mark-done`

#### Roadmap (`backend/routers/roadmap.py`)
- `POST /api/roadmap/generate`
- `GET /api/roadmap/current`
- `GET /api/roadmap/weeks/{week_number}`
- `POST /api/roadmap/regenerate`
- `PATCH /api/roadmap/weeks/{week_number}/days/{day_number}`

#### Planner (`backend/routers/planner.py`)
- `GET /api/planner/today`
- `POST /api/planner/generate-today`
- `PATCH /api/planner/tasks/{task_id}`
- `POST /api/planner/carry-forward`

#### Study Chat (`backend/routers/study_chat.py`)
- `GET /api/study-chat/sessions`
- `POST /api/study-chat/sessions`
- `GET /api/study-chat/sessions/{session_id}`
- `POST /api/study-chat/sessions/{session_id}/messages`

#### AI (`backend/routers/ai.py`)
- `POST /api/ai/explain`

#### Feedback (`backend/routers/feedback.py`)
- `POST /api/feedback/`
- `GET /api/feedback/me`
- `GET /api/feedback/admin/recent`

#### Admin Content (`backend/routers/admin_content.py`)
- `GET /api/admin/content/subjects`
- `POST /api/admin/content/subjects`
- `PUT /api/admin/content/subjects/{subject_id}`
- `DELETE /api/admin/content/subjects/{subject_id}`
- `GET /api/admin/content/subjects/{subject_id}/topics`
- `POST /api/admin/content/subjects/{subject_id}/topics`
- `PUT /api/admin/content/topics/{topic_id}`
- `DELETE /api/admin/content/topics/{topic_id}`

#### Admin Questions (`backend/routers/admin_questions.py`)
- `GET /api/admin/questions/`
- `POST /api/admin/questions/`
- `GET /api/admin/questions/{question_id}`
- `PUT /api/admin/questions/{question_id}`
- `DELETE /api/admin/questions/{question_id}`
- `POST /api/admin/questions/{question_id}/verify`
- `POST /api/admin/questions/bulk-verify`

#### Admin Scraper (`backend/routers/scraper.py`)
- `POST /api/admin/scraper/start`
- `GET /api/admin/scraper/jobs`
- `GET /api/admin/scraper/jobs/{job_id}`
- `POST /api/admin/scraper/jobs/{job_id}/import`
- `DELETE /api/admin/scraper/jobs/{job_id}`

#### Admin Syllabus (`backend/routers/syllabus.py`)
- `POST /api/admin/syllabus/upload`
- `GET /api/admin/syllabus/uploads`
- `GET /api/admin/syllabus/uploads/{upload_id}`
- `POST /api/admin/syllabus/uploads/{upload_id}/import`
- `DELETE /api/admin/syllabus/uploads/{upload_id}`

## 4) Full Frontend Page Integration Matrix

Legend:
- Full: data and actions are backend connected
- Partial: backend is used but critical UI blocks still static/placeholder
- None: no runtime backend integration
- Intentional static: page is navigation/marketing shell and does not require backend

| Route | Page file | Backend integration | Status | Notes |
|---|---|---|---|---|
| `/` | `frontend/app/page.tsx` | None | Intentional static | Marketing landing page |
| `/login` | `frontend/app/(auth)/login/page.tsx` | `/auth/login`, `/auth/me`, `/auth/register` | Full | Auth works, but cookie strategy mismatch exists globally |
| `/signup` | `frontend/app/(auth)/signup/page.tsx` | `/auth/register` | Full | Registration connected |
| `/dashboard` | `frontend/app/(student)/dashboard/page.tsx` | `/analysis/dashboard` | Partial | Core data is live; several KPI labels are static text |
| `/onboarding` | `frontend/app/(student)/onboarding/page.tsx` | `/content/subjects`, `/content/subjects/{id}/topics`, `/auth/me` | Full | End-to-end onboarding payload is connected |
| `/profile` | `frontend/app/(student)/profile/page.tsx` | None | None | Hardcoded defaults, no save API |
| `/settings` | `frontend/app/(student)/settings/page.tsx` | `/auth/me` | Partial | Only daily minutes persist; other toggles are local only |
| `/quiz` | `frontend/app/(student)/quiz/page.tsx` | None | Intentional static | Navigation shell to quiz modes |
| `/quiz/diagnostic` | `frontend/app/(student)/quiz/diagnostic/page.tsx` | `/quiz/diagnostic`, `/analysis/weakness`, `/quiz/submit` | Full | Connected |
| `/quiz/adaptive` | `frontend/app/(student)/quiz/adaptive/page.tsx` | `/quiz/adaptive`, `/analysis/weakness`, `/quiz/submit` | Partial | Mock session query config is not consumed by backend generator |
| `/quiz/result/[attemptId]` | `frontend/app/(student)/quiz/result/[attemptId]/page.tsx` | `/quiz/attempts/{attempt_id}` | Full | Connected |
| `/pyq` | `frontend/app/(student)/pyq/page.tsx` | `/pyq/filters`, `/pyq/questions`, `/pyq/practice`, `/quiz/submit` | Full | Connected |
| `/planner` | `frontend/app/(student)/planner/page.tsx` | `/planner/today`, `/planner/generate-today`, `/planner/tasks/{id}`, `/planner/carry-forward` | Full | Connected |
| `/roadmap` | `frontend/app/(student)/roadmap/page.tsx` | `/roadmap/current`, `/roadmap/generate`, `/roadmap/weeks/{w}/days/{d}` | Full | Connected |
| `/revision` | `frontend/app/(student)/revision/page.tsx` | `/revision/plan`, `/revision/mark-done` | Full | Connected |
| `/chat` | `frontend/app/(student)/chat/page.tsx` | `/study-chat/sessions`, `/study-chat/sessions/{id}`, `/study-chat/sessions/{id}/messages` | Full | Connected |
| `/feedback` | `frontend/app/(student)/feedback/page.tsx` | `/feedback/me`, `/feedback` | Full | Connected; normalize trailing slash call |
| `/progress` | `frontend/app/(student)/progress/page.tsx` | `/analysis/metrics`, `/analysis/dashboard` | Partial | Multiple analytic blocks still static/pseudo-generated |
| `/mock-tests` | `frontend/app/(student)/mock-tests/page.tsx` | None | None | UI-only; forwards to adaptive with query params |
| `/exams` | `frontend/app/(student)/exams/page.tsx` | None | None | Full page built on static arrays |
| `/predict` | `frontend/app/(student)/predict/page.tsx` | None | None | Full page built on static arrays |
| `/upload` | `frontend/app/(student)/upload/page.tsx` | None | None | Full page built on static history |
| `/admin` | `frontend/app/admin/page.tsx` | `/admin/questions`, `/admin/content/subjects`, `/admin/scraper/jobs`, `/admin/syllabus/uploads` | Full | Connected |
| `/admin/questions` | `frontend/app/admin/questions/page.tsx` | `/admin/questions`, `/admin/questions/bulk-verify`, `/admin/questions/{id}/verify`, `/admin/questions/{id}` | Full | Connected |
| `/admin/questions/[id]` | `frontend/app/admin/questions/[id]/page.tsx` | `/admin/questions/{id}`, `/admin/content/subjects`, `/admin/content/subjects/{id}/topics` | Full | Connected |
| `/admin/subjects` | `frontend/app/admin/subjects/page.tsx` | `/admin/content/*` subjects/topics CRUD | Full | Connected |
| `/admin/scraper` | `frontend/app/admin/scraper/page.tsx` | `/admin/scraper/start`, `/admin/scraper/jobs`, `/admin/scraper/jobs/{id}/import` | Full | Connected, but poller has no max timeout |
| `/admin/syllabus` | `frontend/app/admin/syllabus/page.tsx` | `/admin/syllabus/upload`, `/admin/syllabus/uploads`, `/admin/syllabus/uploads/{id}/import` | Full | Connected |

## 5) High-Impact Integration Gaps (with code evidence)

## Gap A: Profile page is not integrated and uses hardcoded values
- Evidence:
  - `frontend/app/(student)/profile/page.tsx:10`
  - `frontend/app/(student)/profile/page.tsx:11`
  - `frontend/app/(student)/profile/page.tsx:13`
  - `frontend/app/(student)/profile/page.tsx:109`
- Impact:
  - User edits are not persisted.
  - Visible personal values are placeholder values.
- Backend contract blocker:
  - `User` model does not contain phone/language/timezone columns.
  - `backend/models/models.py:61`
  - `backend/schemas/auth_schemas.py` only supports onboarding profile fields.

## Gap B: Student upload page is entirely static and has no compatible student API
- Evidence:
  - `frontend/app/(student)/upload/page.tsx:16`
  - `frontend/app/(student)/upload/page.tsx:39`
- Impact:
  - Feature is non-functional for students.
- Backend mismatch:
  - Existing upload endpoints are admin-only (`require_admin`).
  - `backend/routers/syllabus.py:36`
  - `backend/routers/syllabus.py:82`
  - `backend/routers/syllabus.py:105`

## Gap C: Exams page uses static exam catalog
- Evidence:
  - `frontend/app/(student)/exams/page.tsx:5`
  - `frontend/app/(student)/exams/page.tsx:14`
- Impact:
  - No real exam metadata, counts, or enrollment state.
  - Cannot evolve with backend data.

## Gap D: Predictor page uses static prediction datasets
- Evidence:
  - `frontend/app/(student)/predict/page.tsx:5`
  - `frontend/app/(student)/predict/page.tsx:32`
  - `frontend/app/(student)/predict/page.tsx:104`
- Impact:
  - Prediction feature is non-functional and misleading.

## Gap E: Mock test configuration is mostly ignored by backend
- Evidence frontend:
  - `frontend/app/(student)/mock-tests/page.tsx:25`
  - `frontend/app/(student)/quiz/adaptive/page.tsx:100`
  - `frontend/app/(student)/quiz/adaptive/page.tsx:188`
- Evidence backend:
  - `backend/routers/quiz.py:52`
  - `backend/routers/quiz.py:56`
  - `backend/services/recommendation_service.py:46`
- What happens now:
  - Frontend sends mock metadata in `context_payload`, but adaptive question generation does not consume exam/mock/year filters.
  - Only `questionCount` is applied client-side by slicing returned results.

## Gap F: Auth cookie key strategy is inconsistent (token vs access_token)
- Evidence frontend:
  - `frontend/store/authStore.ts:55`
  - `frontend/lib/authToken.ts:2`
  - `frontend/lib/api.ts:13`
- Evidence backend:
  - `backend/routers/auth.py:93`
  - `backend/dependencies.py:40`
- Impact:
  - Frontend stores/clears `token`, backend cookie auth reads `access_token`.
  - Logout/session invalidation can become inconsistent between frontend and backend cookie state.

## Gap G: Progress and dashboard still contain static analytics text/values
- Evidence progress:
  - `frontend/app/(student)/progress/page.tsx:128`
  - `frontend/app/(student)/progress/page.tsx:156`
  - `frontend/app/(student)/progress/page.tsx:276`
- Evidence dashboard:
  - `frontend/app/(student)/dashboard/page.tsx:130`
  - `frontend/app/(student)/dashboard/page.tsx:141`
  - `frontend/app/(student)/dashboard/page.tsx:152`
- Impact:
  - Mixed live + placeholder analytics reduces trust.

## Gap H: Admin scrape polling has no global timeout guard
- Evidence:
  - `frontend/hooks/useScrapeJobPoller.ts:39`
  - `frontend/hooks/useScrapeJobPoller.ts:133`
- Impact:
  - Potential endless polling on stalled jobs.

## Gap I: Feedback POST path should be normalized to avoid redirect dependence
- Evidence backend route:
  - `backend/routers/feedback.py:27`
  - `backend/routers/feedback.py:28`
- Evidence frontend call:
  - `frontend/app/(student)/feedback/page.tsx:124`
- Impact:
  - Relying on slash redirection for POST can add unnecessary redirect/preflight behavior.

## 6) Detailed Remediation Plan (No Mock Data Target)

## Phase 0: Contract freeze and observability (1 day)
- Freeze current API contracts in a versioned markdown snapshot.
- Add request correlation IDs in frontend axios and backend request logs.
- Add one integration smoke script for auth + dashboard + quiz submit.

Deliverables:
- `docs/API_CONTRACT_BASELINE.md`
- log correlation in `frontend/lib/api.ts` and backend middleware
- CI smoke command for core flow

## Phase 1: Auth/session consistency hardening (1-2 days)
- Decide one session strategy and apply consistently.
  - Option A (recommended now): bearer token in `Authorization` from frontend store/localStorage only.
  - Option B (higher security): httpOnly cookie only (`access_token`) and remove JS-readable token cookie.
- Align cookie names if cookie is kept at all.
- Ensure logout clears the same token mechanism used by backend auth dependency.

Files to update:
- `frontend/store/authStore.ts`
- `frontend/lib/authToken.ts`
- `frontend/lib/api.ts`
- `frontend/middleware.ts`
- `backend/routers/auth.py` (if strategy changes)
- `backend/dependencies.py` (if strategy changes)

Acceptance criteria:
- No mixed cookie names (`token` vs `access_token`) in active auth flow.
- After logout, all protected APIs return 401.
- Frontend route guards and backend auth behavior are consistent.

## Phase 2: Make currently static student features real (4-6 days)

### 2.1 Profile page
Backend changes:
- Extend user schema for profile fields:
  - `phone` (nullable)
  - `language` (nullable)
  - `timezone` (nullable)
- Add migration and include fields in `UserResponse` and `UpdateProfileRequest`.

Frontend changes:
- Replace hardcoded defaults with user data from `authStore`.
- On save, call `PUT /api/auth/me` and update store with response.
- Remove static joined/last-active placeholders or replace with real fields.

### 2.2 Upload page
Backend changes:
- Add student-safe upload domain (do not reuse admin syllabus endpoint directly).
- Recommended new endpoints:
  - `POST /api/uploads` (student)
  - `GET /api/uploads` (student own uploads)
  - `GET /api/uploads/{upload_id}`
  - `DELETE /api/uploads/{upload_id}`
- Enforce file size/quota by plan tier server-side.

Frontend changes:
- Replace `initialHistory` with backend list call.
- Wire file picker to multipart upload endpoint.
- Poll per-upload status until terminal state.

### 2.3 Exams page
Backend changes:
- Add exam catalog endpoint:
  - `GET /api/exams`
- Response should include:
  - `exam_id`, `title`, `category`, `topic_count`, `pyq_count`, `enrolled_count`

Frontend changes:
- Replace `examCategories` and `examTracks` static arrays with API data.
- Keep category filter and sorting entirely data-driven.

### 2.4 Predictor page
Backend changes:
- Add prediction endpoints:
  - `GET /api/ai/predictions?exam_id=...`
  - `POST /api/ai/predictions/refresh`
- Return prediction rows + repeat topics + metadata timestamp.

Frontend changes:
- Replace static `predictions` and `repeatTopics` with API response.
- Wire `Update Predictions` and `Copy to Roadmap` buttons to real APIs.

### 2.5 Mock tests page
Backend changes:
- Introduce explicit server-side mock session contract:
  - `POST /api/quiz/mock-session` with exam/type/time/count/year filters
  - returns generated question set id or attempt id
- Or extend `GET /api/quiz/adaptive` to accept validated query params and apply them server-side.
- Add history endpoint:
  - `GET /api/quiz/attempts?source=mock_test`

Frontend changes:
- Use server-validated session creation instead of pure query-string routing.
- Wire `View History` to attempt history endpoint.

Acceptance criteria for Phase 2:
- No runtime hardcoded arrays remain in profile/upload/exams/predict/mock-tests.
- Every CTA/action performs a backend request and persists state.

## Phase 3: Remove remaining placeholder analytics from integrated pages (2-3 days)

### Dashboard
- Replace static labels with backend metrics:
  - `+2 from last week`
  - `Goal: 50`
  - `+5% from yesterday`
  - `Pro Trial Active` (if subscription model exists, fetch from backend)

### Progress
- Replace pseudo heatmap generation with real activity histogram.
- Replace static AI insight sentence with backend-provided insight.
- Replace static `dailyGoalMinutes = 120` with user/plan value.

Backend additions likely needed:
- Extend `GET /api/analysis/metrics` to include:
  - `longest_streak_days`
  - `daily_goal_minutes`
  - `activity_heatmap`
  - `ai_insight`

## Phase 4: Reliability and DX hardening (1-2 days)
- Add max poll duration and timeout behavior in `useScrapeJobPoller`.
- Normalize feedback submit path to `/feedback/`.
- Add typed API contracts shared between frontend and backend (OpenAPI-generated TS types preferred).

## Phase 5: Test gates before release (2 days)

### Backend tests
- Auth lifecycle tests: register -> login -> me -> update -> logout semantics
- New feature endpoint tests: uploads, exams, predictions, mock session
- Contract tests for all modified response shapes

### Frontend tests
- Real API Playwright flows (no runtime mocks for production paths):
  - profile save persistence
  - upload end-to-end
  - exams catalog load
  - predictor refresh + copy action
  - mock session creation + history
  - dashboard/progress show backend-driven values

### Exit gates
- No static runtime feature arrays in student product pages.
- 0 blocking integration defects in smoke + e2e suite.
- All modified pages function with empty, partial, and fully populated backend data.

## 7) File-Level Change Map

### Backend (planned)
- `backend/models/models.py` (profile fields, optional exam/upload entities)
- `backend/schemas/auth_schemas.py` (profile contract extension)
- `backend/services/profile_service.py` (persist new profile fields)
- `backend/routers/auth.py` (profile update/read)
- New routers/services for exams/predictions/student uploads/mock-session APIs
- `backend/routers/quiz.py` and `backend/services/recommendation_service.py` (server-side mock config support)
- `backend/routers/analysis.py` and metrics service (dashboard/progress dynamic fields)

### Frontend (planned)
- `frontend/app/(student)/profile/page.tsx`
- `frontend/app/(student)/upload/page.tsx`
- `frontend/app/(student)/exams/page.tsx`
- `frontend/app/(student)/predict/page.tsx`
- `frontend/app/(student)/mock-tests/page.tsx`
- `frontend/app/(student)/quiz/adaptive/page.tsx`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/progress/page.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/authToken.ts`
- `frontend/store/authStore.ts`
- `frontend/hooks/useScrapeJobPoller.ts`
- `frontend/app/(student)/feedback/page.tsx` (path normalization)

## 8) Definition of Done (No Mock Data)

A feature/page is considered done only when all are true:
- Uses backend data for initial render state.
- User actions persist via backend APIs.
- Reload reproduces server state (no local-only illusion).
- Empty-state and error-state are handled from real API responses.
- No hardcoded demo arrays for business data in runtime code.

## 9) Recommended Execution Order

1. Auth/session consistency (prevents hidden state bugs).
2. Profile integration + backend profile schema extension.
3. Mock-tests backend contract + adaptive generation consumption.
4. Exams and predictor APIs + frontend wiring.
5. Student upload domain + full upload lifecycle UI.
6. Dashboard/progress placeholder removal.
7. Polling/feedback path cleanup and full regression test pass.

## 10) Immediate Next Sprint Task List

- [ ] Unify auth cookie/token strategy (`token` vs `access_token`).
- [ ] Implement profile persistence end-to-end.
- [ ] Introduce server-side mock session contract and history endpoint.
- [ ] Build exams catalog endpoint and wire exams page.
- [ ] Build predictor endpoints and wire predictor page.
- [ ] Build student upload endpoints and wire upload page.
- [ ] Replace dashboard/progress static KPI text with backend fields.
- [ ] Add timeout to scraper poller.
- [ ] Normalize feedback POST path to `/feedback/`.
- [ ] Add e2e tests for all newly integrated student pages.
