# File Context Map

## Required Context

Read alongside:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/01_EXISTING_SYSTEM_MAP.md`
- `improvements/15_FILE_BY_FILE_CHANGELOG.md`
- `improvements/16_DEPENDENCY_AND_RISK_MAP.md`

## Audit Goal

Map the planning documents to the real SmartExamPrep code areas so audits and implementations check the right files first.

## Depends On

- The current repo layout under `backend/`, `frontend/`, `ml/`, and `improvements/`
- The current router and model structure already present in the codebase

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/`
- `backend/services/`
- `backend/routers/`
- `backend/ml/`
- `ml/`
- `frontend/app/`
- `frontend/components/`
- `frontend/store/`
- `frontend/lib/`
- `frontend/tests/e2e/`

## Required Output

When this map is used during an audit, the AI should identify:

- which docs define the intent
- which code areas prove implementation
- which integration points must be checked
- which failure points are most likely

## Improvement Docs To Code Areas

| Improvement Doc | Primary Code Areas | Secondary Checks | Main Audit Focus |
| --- | --- | --- | --- |
| `00_PROJECT_AUDIT.md` | whole repo | `README.md`, `docs/` | current baseline and already-working features |
| `01_EXISTING_SYSTEM_MAP.md` | `backend/main.py`, `backend/models/`, `backend/routers/`, `frontend/app/`, `frontend/store/` | `frontend/components/`, `backend/services/` | present architecture and flow map |
| `02_GAP_ANALYSIS.md` | cross-layer | all current feature files | confirm whether a claimed gap still exists |
| `03_PHASED_UPGRADE_ROADMAP.md` | cross-layer | `16_DEPENDENCY_AND_RISK_MAP.md` | sequence and phase dependencies |
| `04_DATABASE_AND_MODEL_CHANGES.md` | `backend/models/models.py`, `backend/alembic/versions/`, `backend/schemas/` | seed scripts, DB constraints | schema support and migration integrity |
| `05_BACKEND_UPGRADE_PLAN.md` | `backend/services/`, `backend/routers/`, `backend/schemas/`, `backend/main.py` | `backend/dependencies.py` | service logic, router coverage, API contracts |
| `06_FRONTEND_UPGRADE_PLAN.md` | `frontend/app/`, `frontend/components/`, `frontend/store/`, `frontend/lib/` | `frontend/middleware.ts` | page availability and frontend integration |
| `07_ML_AI_UPGRADE_PLAN.md` | `backend/ml/`, `backend/services/ai_service.py`, `ml/` | `backend/services/recommendation_service.py` | rule-based logic, AI hooks, fallback paths |
| `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md` | cross-layer | all related files for the named feature | full end-to-end feature presence |
| `09_PHASE_1_DETAILED_EXECUTION.md` | auth, onboarding, profile files | content APIs, middleware, tests | Smart Onboarding 2.0 |
| `10_PHASE_2_DETAILED_EXECUTION.md` | roadmap DB, router, service, page, store files | weakness and dashboard services | roadmap generation |
| `11_PHASE_3_DETAILED_EXECUTION.md` | planner DB, router, service, revision and quiz integrations | dashboard store and planner page | daily planner and activity logging |
| `12_PHASE_4_DETAILED_EXECUTION.md` | dashboard schemas, services, page, store | AI helper, planner and roadmap summaries | enhanced dashboard |
| `13_PHASE_5_DETAILED_EXECUTION.md` | PYQ router, service, schemas, page, result flow | admin question tooling, quiz service | PYQ browser and practice |
| `14_PHASE_6_DETAILED_EXECUTION.md` | chat DB, router, service, chat page, AI logic | dashboard, planner, roadmap, NLP | grounded study chatbot |
| `15_FILE_BY_FILE_CHANGELOG.md` | file inventory across repo | new and existing files | what changed and what still needs attention |
| `16_DEPENDENCY_AND_RISK_MAP.md` | cross-layer | migrations, auth, dashboard, quiz service | ordering and regression risk |
| `17_TESTING_AND_VALIDATION_PLAN.md` | `backend/tests/`, `frontend/tests/e2e/`, validation scripts | `backend/test_api_flow.py`, `backend/run_ai_validation.py` | proof of completeness |
| `18_FUTURE_SCOPE.md` | optional future work only | none | do not confuse future scope with required implementation |

## Feature Ownership By Layer

| Layer | Main Ownership Areas | What To Check |
| --- | --- | --- |
| DB and models | `backend/models/models.py`, `backend/alembic/versions/` | tables, fields, constraints, indexes, relationships |
| Schemas and contracts | `backend/schemas/` | request and response DTOs, contract compatibility |
| Backend services | `backend/services/` | real business logic, orchestration, persistence updates |
| Routers | `backend/routers/`, `backend/main.py` | endpoint existence, route registration, auth dependencies |
| Frontend routes | `frontend/app/` | reachable pages, page states, user entry points |
| Frontend UI | `frontend/components/` | interaction components and display completeness |
| Frontend state and API calls | `frontend/store/`, `frontend/lib/` | contract usage, store refresh, action wiring |
| ML and AI | `backend/ml/`, `ml/`, `backend/services/ai_service.py` | deterministic logic, AI hooks, fallbacks |
| Admin | `frontend/app/admin/`, `frontend/components/admin/`, admin routers | authoring, verification, operational support |
| Testing | `backend/tests/`, `frontend/tests/e2e/`, validation scripts | automated coverage and smoke confidence |

## Dependency Relationships

### Existing product backbone

- `auth` supports all student and admin access
- `content` supports onboarding, quizzes, roadmap inputs, and admin-managed syllabus structure
- `quiz_service` feeds mastery, revision, result pages, dashboard, and future planner or PYQ analytics
- `weakness_service` and `recommendation_service` feed adaptive learning behavior
- `dashboard_service` consumes current learning state
- `ai_service` powers weak-topic explanation and later chat-related AI tasks

### Planned phase dependencies

- Phase 1 feeds Phase 2 through richer onboarding state
- Phase 2 feeds Phase 3 through active roadmap data
- Phase 3 feeds Phase 4 through daily plans and activity logs
- Phase 5 reuses existing question and quiz infrastructure
- Phase 6 depends on roadmap, planner, weakness, and optional PYQ context for grounding

## Likely Integration Points

These are the places where isolated implementation often needs to connect to become complete:

- `backend/main.py` router registration
- `backend/schemas/*` matching router responses
- `frontend/lib/api.ts` or `frontend/lib/adminApi.ts` calling the new endpoint
- `frontend/store/*` refreshing after writes
- `frontend/middleware.ts` allowing access to a new student or admin route
- `frontend/app/(student)/*` or `frontend/app/admin/*` exposing the feature to users
- `backend/services/quiz_service.py` when quiz-derived behavior is reused
- `backend/services/dashboard_service.py` when metrics or summaries must reflect new state
- `backend/services/ai_service.py` when AI assistance depends on a new prompt or helper

## Likely Failure Points

| Failure Point | Why It Happens |
| --- | --- |
| Migration exists but ORM or schemas were not updated | persistence layer changed without contract updates |
| Service exists but router is missing or unregistered | backend logic is isolated and unreachable |
| Router exists but frontend never calls it | no end-to-end integration |
| UI exists with hardcoded or mock data | feature looks present but is not real |
| Frontend and backend schemas drift | runtime errors or silent data loss |
| Store does not refresh after save | feature appears broken after writes |
| Middleware does not allow the new route | page exists but users cannot access it |
| Admin data entry is missing for a content-driven feature | student feature has no usable inventory |
| AI helper exists with no fallback | feature breaks when AI fails |
| Tests do not cover the new flow | false confidence and regressions |

## Phase-Specific Quick Map

| Phase | Main Feature | Fastest Files To Inspect |
| --- | --- | --- |
| Phase 1 | Smart Onboarding 2.0 | `backend/models/models.py`, `backend/schemas/auth_schemas.py`, `backend/routers/auth.py`, `frontend/store/authStore.ts`, `frontend/app/(student)/onboarding/page.tsx` |
| Phase 2 | Roadmap Generator | `backend/services/roadmap_service.py`, `backend/routers/roadmap.py`, `backend/schemas/roadmap_schemas.py`, `frontend/app/(student)/roadmap/page.tsx`, `frontend/store/roadmapStore.ts` |
| Phase 3 | Daily Planner | `backend/services/planner_service.py`, `backend/services/study_activity_service.py`, `backend/routers/planner.py`, `frontend/app/(student)/planner/page.tsx`, `frontend/store/plannerStore.ts` |
| Phase 4 | Enhanced Dashboard | `backend/services/dashboard_service.py`, `backend/services/metrics_service.py`, `backend/schemas/analysis_schemas.py`, `frontend/app/(student)/dashboard/page.tsx`, `frontend/store/dashboardStore.ts` |
| Phase 5 | PYQ Browser | `backend/services/pyq_service.py`, `backend/routers/pyq.py`, `backend/schemas/pyq_schemas.py`, `frontend/app/(student)/pyq/page.tsx`, `frontend/app/(student)/quiz/result/[attemptId]/page.tsx` |
| Phase 6 | AI Study Chatbot | `backend/services/study_chat_service.py`, `backend/routers/study_chat.py`, `backend/schemas/study_chat_schemas.py`, `frontend/app/(student)/chat/page.tsx`, `frontend/store/chatStore.ts` |

## Audit Usage Rule

Use this map to choose where to look first, but never stop after checking a single layer. The point of this file is to prevent shallow audits, not to replace them.


