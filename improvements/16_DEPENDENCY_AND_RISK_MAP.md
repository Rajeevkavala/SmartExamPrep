# 16 Dependency And Risk Map

## Feature Dependency Map

| Feature | Depends On | Why The Dependency Is Real |
| --- | --- | --- |
| Smart Onboarding 2.0 | existing auth flow, `users` table, content subject/topic APIs | The new profile is captured through `PUT /api/auth/me` and uses real syllabus data for subject/topic selection. |
| Personalized Roadmap Generator | Smart Onboarding 2.0, `topic_masteries`, syllabus ordering | Roadmap sequencing needs target date, study budget, confidence, known topics, and current weakness data. |
| Daily Study Planner | Roadmap, revision schedules, adaptive recommendation logic | Daily tasks should be drawn from the active roadmap, due revisions, and weak-topic practice. |
| Enhanced Dashboard | Planner, roadmap, activity logs, existing dashboard metrics | The dashboard can only show streak, hours, roadmap progress, and today's plan after those layers exist. |
| PYQ Browser | existing `questions` schema, admin question quality, quiz submission pipeline | PYQ browsing relies on `source_type`, `year`, and verified question inventory; practice mode should reuse quiz submission. |
| AI Study Chatbot | AI integration, onboarding profile, roadmap, planner, weakness analysis | The chatbot becomes useful only when it can ground answers in real user profile and study-state data. |

## Implementation Order Dependency Map

### Mandatory order

1. Phase 1: Smart Onboarding 2.0
2. Phase 2: Roadmap Generator
3. Phase 3: Daily Planner
4. Phase 4: Enhanced Dashboard
5. Phase 5: PYQ Browser
6. Phase 6: AI Study Chatbot

### Why this order is safest

- Roadmap quality is poor without richer onboarding.
- Planner quality is poor without a stored roadmap.
- Enhanced dashboard is much stronger after roadmap and planner exist.
- PYQ is relatively isolated and can land after the planning core is stable.
- Chatbot should come last so it can rely on real roadmap/planner/dashboard context instead of hallucinating around missing features.

## Technical Dependency Map By Layer

### Database layer

- `users` onboarding fields are a prerequisite for roadmap generation.
- roadmap tables are a prerequisite for planner generation.
- planner/activity tables are a prerequisite for dashboard execution metrics.
- chat session/message tables are independent of PYQ, but depend on the same user/auth model.

### Backend service layer

- `profile_service` feeds `roadmap_service`
- `roadmap_service` feeds `planner_service`
- `planner_service` and `quiz_service` feed `study_activity_service`
- `study_activity_service` feeds `dashboard_service`
- `dashboard_service`, `roadmap_service`, and `planner_service` feed `study_chat_service`

### Frontend layer

- `authStore` enrichment is needed before onboarding and roadmap UX feel coherent
- `roadmapStore` is independent from `dashboardStore`, but dashboard will consume roadmap summary later
- `plannerStore` drives planner UI and dashboard's "today" summary
- `chatStore` should be isolated to avoid coupling conversation state to dashboard state

## What Can Break What

| Change Area | What It Can Break | Why |
| --- | --- | --- |
| `backend/models/models.py` changes | all API routes, startup, migrations, admin CRUD, seed scripts | This is the single ORM spine of the backend. |
| `backend/routers/auth.py` and auth schema changes | onboarding, login-adjacent profile reads, middleware assumptions | Frontend stores the returned user object directly. |
| `frontend/store/authStore.ts` changes | protected routes, onboarding prefill, dashboard personalization | The store is the main client-side identity source. |
| `backend/services/quiz_service.py` changes | diagnostic quiz, adaptive quiz, result page, mastery updates, planner/PYQ analytics | It is the central scoring and snapshot path. |
| `backend/routers/revision.py` changes | revision page, planner task completion logic | Current revision completion is topic-based and somewhat coarse. |
| `backend/services/dashboard_service.py` changes | dashboard page, research interpretation of readiness, store hydration | The dashboard page depends on a specific response shape. |
| `frontend/app/(student)/dashboard/page.tsx` changes | the most visible student surface, quick navigation, perceived product quality | A heavy rewrite here can easily produce partial-load issues. |
| `backend/services/ai_service.py` changes | weak-topic explanation, future chatbot, possible scraper/syllabus parsing stability | This service is shared AI infrastructure. |
| `frontend/middleware.ts` changes | route access for every authenticated student and admin page | Current auth behavior already has token-cookie complexity. |

## Risk Map By Phase

| Phase | Main Risks | Risk Level | Why |
| --- | --- | --- | --- |
| Phase 1 | schema drift in auth payload, onboarding save issues, auth-store staleness | Medium | Existing student flow is already working and must stay intact. |
| Phase 2 | unstable roadmap generation, duplicate active roadmaps, unrealistic week load | Medium | New persistence and scheduling logic are introduced, but no current user flow must be replaced yet. |
| Phase 3 | duplicate daily plans, carry-forward explosion, double-counted activity metrics | High | Planner logic touches revision, quiz, and future dashboard inputs. |
| Phase 4 | slow aggregate queries, UI overload, inconsistent metrics across endpoints | Medium | Mostly additive, but the dashboard is highly visible. |
| Phase 5 | sparse PYQ inventory, quiz-type regressions, bad admin metadata | Medium | Reuses stable quiz pipeline, but content quality risk is real. |
| Phase 6 | hallucinated chat guidance, oversized context, AI failure/latency | High | Conversational AI has higher trust and correctness risk than deterministic features. |

## Risky Migrations

### 1. `revision_schedules(user_id, topic_id)` uniqueness

Risk:

- the current code behaves as if one schedule exists per user/topic, but the model only has a non-unique index

Impact:

- planner and revision completion semantics can be ambiguous if duplicates already exist

Mitigation:

- scan for duplicates before adding a unique constraint
- merge or delete duplicates in a data-fix step before constraint creation

### 2. Planner uniqueness per day

Risk:

- retries can create multiple plans for one date if uniqueness is not enforced

Mitigation:

- add a unique `(user_id, plan_date)` constraint immediately in the migration

### 3. Active roadmap uniqueness

Risk:

- multiple active roadmaps create unpredictable planner and UI behavior

Mitigation:

- enforce application-level supersede behavior
- optionally add a partial unique index later if the DB supports it cleanly

### 4. Chat table growth

Risk:

- chat messages can grow quickly and affect performance if not indexed by session and time

Mitigation:

- add indexes from day one
- avoid storing huge prompt blobs repeatedly

## Risky Frontend Changes

### Onboarding rewrite

Why risky:

- current onboarding is simple and already tied to auth state
- a step-flow can introduce partial save bugs and stale local state

Mitigation:

- keep one final save action
- hydrate from the server response, not local assumptions

### Dashboard expansion

Why risky:

- current dashboard already performs a two-step fetch and handles async state manually
- more cards and dependencies can create load-order issues

Mitigation:

- keep the page component orchestration thin
- move richer aggregation into the backend
- use dedicated UI blocks

### Middleware route expansion

Why risky:

- current auth uses a frontend `token` cookie while backend also sets `access_token`

Mitigation:

- do not rewrite auth in the middle of feature delivery
- add route coverage carefully and regression-test login + protected routes every phase

## Risky Backend Changes

### Adding planner logging into quiz submission

Why risky:

- quiz submission is the most important learning event in the system

Mitigation:

- add logging after result creation, not before
- make activity log failure non-fatal if needed

### Moving dashboard insight generation server-side

Why risky:

- current dashboard tolerates failed `/ai/explain` calls because the page can render without them

Mitigation:

- keep AI hint optional inside the dashboard payload
- never fail the dashboard endpoint if AI is down

### Chat grounding service

Why risky:

- it will pull from many data sources and can become slow or inconsistent

Mitigation:

- keep the grounding snapshot small and explicit
- cap history length and context size

## Rollout Safety Notes

### Prefer additive changes over replacements

- extend `GET /api/auth/me`; do not introduce a second profile API immediately
- add roadmap/planner/PYQ/chat routers; do not overload existing unrelated routers
- extend dashboard contract additively before removing any current field

### Avoid hidden background magic

- roadmap generation should be explicit
- planner generation should be inspectable and reproducible
- chat replies should reference visible study state where possible

### Keep old routes and flows alive during rollout

- onboarding continues to save through `PUT /api/auth/me`
- diagnostic/adaptive quiz flows continue to use the same submission endpoint
- revision page remains available even after planner launch

### Use phase-level smoke gates

Before merging each phase, re-test:

- login and protected-route entry
- diagnostic and adaptive quiz load/submit
- result reload by URL
- revision page load and mark-done
- dashboard load
- relevant new phase routes

## Recommended Feature Flags Or Soft Gates

Even in a solo-dev project, soft gating helps isolate issues:

- hide dashboard quick actions until the target page exists
- show roadmap/planner empty states instead of auto-generating in the background
- keep chatbot hidden unless roadmap/planner grounding data exists or a fallback path is confirmed

## Highest-Value Mitigations

If time is limited, prioritize these safeguards:

1. protect `quiz_service.py` with tests before touching planner/PYQ integration
2. add migration-time duplicate checks for `revision_schedules`
3. keep roadmap and planner rule-based first
4. keep AI optional everywhere
5. refresh client stores from API responses after every write

