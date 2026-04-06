# Phase 4 Prompt: Enhanced Dashboard Audit

## Required Context

Read these first, in order:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. `improvements/05_BACKEND_UPGRADE_PLAN.md`
5. `improvements/06_FRONTEND_UPGRADE_PLAN.md`
6. `improvements/07_ML_AI_UPGRADE_PLAN.md`
7. `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
8. `improvements/12_PHASE_4_DETAILED_EXECUTION.md`
9. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether the enhanced dashboard is fully implemented as an operating console, not just as disconnected KPI widgets.

## Depends On

- existing dashboard baseline
- planner and activity data from Phase 3 or an equivalent source
- roadmap progress data from Phase 2 or an equivalent source
- weakness and readiness data from the current product

## Expected Code Areas

- `backend/routers/analysis.py`
- `backend/services/dashboard_service.py`
- `backend/services/metrics_service.py`
- `backend/services/ai_service.py`
- `backend/schemas/analysis_schemas.py`
- `backend/services/weakness_service.py`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/store/dashboardStore.ts`
- `frontend/components/student/ReadinessGauge.tsx`
- `frontend/components/student/WeaknessBar.tsx`
- `frontend/components/student/NLPInsightCard.tsx`
- `frontend/components/student/DashboardKpiCard.tsx`
- `frontend/components/student/DashboardQuickActions.tsx`
- `frontend/components/student/RoadmapProgressCard.tsx`
- `frontend/components/student/TopicProgressTable.tsx`
- `frontend/components/student/StudyStreakCard.tsx`
- `frontend/app/(student)/planner/page.tsx`
- `frontend/app/(student)/roadmap/page.tsx`
- relevant backend and E2E tests

## Required Output

Produce:

- a dashboard enhancement audit
- one status per KPI or dashboard capability
- minimal safe changes only for verified gaps

## Prompt

```md
Audit SmartExamPrep Phase 4: Enhanced Dashboard.

Audit first. Do not propose implementation work until after the status is classified.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/12_PHASE_4_DETAILED_EXECUTION.md`
- supporting docs `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, `07_ML_AI_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`

Then inspect the real implementation for:
- dashboard response schema
- dashboard aggregation service
- metrics service support
- optional AI hint handling
- frontend dashboard page
- dashboard store
- dashboard components
- planner and roadmap quick links
- testing and validation

Audit these Phase 4 features individually:
- study streak
- questions solved
- hours studied
- roadmap progress
- topic progress summary
- today's plan summary
- quick actions
- optional AI dashboard insight

Classify each feature as:
- `âœ… Fully Implemented`
- `ðŸŸ¡ Partially Implemented`
- `ðŸ”´ Missing`
- `âš ï¸ Implemented but Broken`
- `ðŸ”µ Exists but Not Integrated End-to-End`

Treat Phase 4 as complete only if:
- the backend exposes the richer dashboard contract
- the contract is backed by real roadmap or planner data where required
- the frontend renders the data correctly
- quick actions lead to real working routes
- AI remains optional and non-fatal
- the dashboard remains usable for a real student
- tests or strong validation evidence exist

If roadmap or planner prerequisites are absent, explain why the dashboard cannot be marked fully complete.
Do not count static UI cards or placeholder metrics as implemented.

Use this response format:

## Phase 4 Audit
- Phase Status:
- Features Audited:
- Overall End-to-End Verdict:

## Feature Matrix
- Feature:
- Status:
- Evidence Found:
- Missing Pieces:
- Broken Links:
- Verdict:

## Dependency Check
- Existing Dashboard Baseline:
- Roadmap Data Dependency:
- Planner and Activity Dependency:
- AI Hint Dependency:

## Layer Check
- Backend Aggregation:
- Schemas and Contracts:
- Frontend Rendering and Store Wiring:
- Quick Actions and Navigation:
- AI or AI Fallback:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 4 Reminder

The dashboard is not fully implemented if the numbers look present but are not backed by real stored state or reachable user flows.

