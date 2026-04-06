# 12 Phase 4 Detailed Execution

## Phase Goal

Phase 4 upgrades the student dashboard from a readiness snapshot into a real operating console. The current dashboard already has a strong foundation: readiness score, weakest topics, strongest topics, subject progress, and an optional AI explanation fetched separately from `/api/ai/explain`. After Phases 2 and 3, the system will also have roadmaps, daily plans, and study activity logs. This phase unifies those data sources into one richer dashboard contract and refreshes the UI around it.

The phase outcome should be:

- the dashboard shows execution metrics, not just weakness metrics
- students can see streak, solved questions, hours studied, roadmap progress, and topic progress in one place
- dashboard quick actions reflect the new roadmap/planner capabilities
- backend analytics remain backward-compatible and efficient

## Features Included

- enhanced dashboard cards
- study streak
- questions solved
- hours studied
- roadmap progress
- topic progress summary
- better quick actions

## Exact Files To Read First

1. `backend/routers/analysis.py`
2. `backend/services/dashboard_service.py`
3. `backend/services/metrics_service.py`
4. `backend/schemas/analysis_schemas.py`
5. `backend/services/weakness_service.py`
6. `backend/services/ai_service.py`
7. `frontend/app/(student)/dashboard/page.tsx`
8. `frontend/store/dashboardStore.ts`
9. `frontend/components/student/ReadinessGauge.tsx`
10. `frontend/components/student/WeaknessBar.tsx`
11. `frontend/components/student/NLPInsightCard.tsx`
12. `frontend/app/(student)/planner/page.tsx`
13. `frontend/app/(student)/roadmap/page.tsx`

## Existing Files To Modify

### Backend

- `backend/routers/analysis.py`
- `backend/services/dashboard_service.py`
- `backend/services/metrics_service.py`
- `backend/schemas/analysis_schemas.py`
- `backend/services/ai_service.py`

### Frontend

- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/store/dashboardStore.ts`
- `frontend/components/student/ReadinessGauge.tsx`
- `frontend/components/student/NLPInsightCard.tsx`

### Tests

- `frontend/tests/e2e/chunk11-student-pages.spec.ts`
- `backend/test_api_flow.py`

## New Files To Create

### Backend

- `backend/tests/test_dashboard_metrics.py`

### Frontend

- `frontend/components/student/DashboardKpiCard.tsx`
- `frontend/components/student/DashboardQuickActions.tsx`
- `frontend/components/student/RoadmapProgressCard.tsx`
- `frontend/components/student/TopicProgressTable.tsx`
- `frontend/components/student/StudyStreakCard.tsx`

## Exact DB Changes

No mandatory new table is required if Phase 3 introduced `study_activity_logs` and planner tables successfully.

Optional additive changes only:

- add indexes on `study_activity_logs(user_id, activity_date)` if not already present
- add indexes on `daily_study_tasks(status, plan_id)` if dashboard queries are slow

## Exact Backend Changes

### 1. Expand `DashboardResponse` in `backend/schemas/analysis_schemas.py`

Add fields such as:

- `study_streak_days`
- `questions_solved_total`
- `hours_studied_total`
- `roadmap_progress_pct`
- `roadmap_current_week`
- `today_plan_status`
- `topic_progress`
- `quick_actions`

Keep existing fields:

- `readiness_score`
- `weakest_topics`
- `strongest_topics`
- `subjects_progress`
- `recent_scores`
- `todays_quiz_ready`
- `nlp_insight`

### 2. Extend `backend/services/dashboard_service.py`

This service should become the single dashboard aggregator.

Add calculations for:

- streak from consecutive `study_activity_logs.activity_date`
- solved-question total from quiz logs or `quiz_attempts`
- studied hours from task completion durations and quiz submissions
- roadmap progress from completed roadmap week topics or completed planner tasks linked to roadmap topics
- topic progress rollup combining mastery and plan completion

Implementation guidance:

- keep current readiness logic intact
- build additive helper functions rather than rewriting the service from scratch

### 3. Extend `backend/services/metrics_service.py`

The current metrics service already exposes research-friendly totals and trends.

Additive options:

- support roadmap-related metrics
- support filters for recent window versus all-time
- expose planner completion metrics if useful

Do not remove current fields; Playwright and research docs already depend on them conceptually.

### 4. Reduce frontend-side dashboard orchestration

Today `frontend/app/(student)/dashboard/page.tsx` calls `/analysis/dashboard` and then separately calls `/ai/explain`.

Recommended Phase 4 change:

- move optional explanation assembly behind the dashboard response, or
- add a dashboard-specific helper in backend that calls AI safely and returns `nlp_insight`

Reason:

- one dashboard request is easier to cache, debug, and test
- current split fetch creates partial-state risk

If you keep the split fetch for safety, keep it explicitly temporary.

### 5. AI changes in `backend/services/ai_service.py`

Only add a lightweight helper if needed, such as:

- `generate_dashboard_focus_hint(...)`

Requirements:

- failure must fall back cleanly to `None`
- no dashboard load should fail because AI is unavailable

## Exact Frontend Changes

### 1. Expand `frontend/store/dashboardStore.ts`

Add state for:

- streak
- solved question count
- studied hours
- roadmap progress
- today plan summary
- quick actions
- topic progress summary

### 2. Refactor `frontend/app/(student)/dashboard/page.tsx`

Retain the current structure where possible, but add:

- top KPI row
- today's plan/roadmap progress strip
- refreshed quick-action section
- richer topic progress area

Important:

- keep `ReadinessGauge`, `WeaknessBar`, and `NLPInsightCard` reusable
- do not fold every block into one giant page component

### 3. New student components

Create focused pieces:

- `DashboardKpiCard.tsx`
- `StudyStreakCard.tsx`
- `RoadmapProgressCard.tsx`
- `TopicProgressTable.tsx`
- `DashboardQuickActions.tsx`

### 4. Cross-linking

Dashboard quick actions should now point to:

- `/planner`
- `/roadmap`
- `/quiz/adaptive`
- `/pyq` once Phase 5 lands
- `/feedback`

For this phase, keep unavailable links hidden until their page exists.

## Exact ML / AI Changes

### Use ML signals for progress ranking, not for metric ownership

Use existing mastery values to decide:

- which topics are improving
- which weak areas need attention

Do not make the dashboard dependent on a new ML pipeline.

### AI usage

- optional single-paragraph focus hint only
- no freeform AI summarization of the entire dashboard payload
- keep a clear fallback path

## Exact APIs To Add Or Change

### Changed

- `GET /api/analysis/dashboard`
- optionally `GET /api/analysis/metrics`

### No New Top-Level Router Required

This phase should extend the existing analytics surface, not fragment it.

## Exact Data Flow Changes

```text
quiz attempts + revision completion + planner tasks + study activity logs + roadmap state
  -> dashboard_service aggregates execution + readiness data
  -> single dashboard payload returned
  -> dashboard store hydrates richer student console
  -> optional AI focus hint appears without separate page orchestration
```

## Implementation Order Inside Phase 4

1. expand dashboard schema
2. extend dashboard aggregation service
3. extend metrics service only where needed
4. decide whether `nlp_insight` stays split or moves server-side
5. update dashboard store shape
6. add new UI components
7. refactor dashboard page composition
8. update dashboard Playwright coverage

## Likely Bugs And Risks

### Slow dashboard queries

The dashboard will now span attempts, revisions, planner data, activity logs, and roadmaps. Without careful query design, the page can become expensive.

### Metric drift

If questions solved or hours studied are calculated from mixed sources inconsistently, numbers will conflict between dashboard and metrics endpoint.

### Null-heavy responses

Legacy users may have readiness data but no roadmap or planner data. The UI must handle partial availability gracefully.

### UI overload

The current dashboard is compact. Adding too many blocks without hierarchy will hurt usability more than it helps.

## Phase 4 Testing Checklist

### Backend

- dashboard returns valid payloads for:
  - legacy users
  - roadmap-only users
  - planner-active users
  - heavy quiz users
- totals and streaks remain stable across repeated fetches
- AI outage does not break dashboard API

### Frontend

- KPI cards render correctly with zero values
- quick actions adapt to available features
- topic progress sections do not break on empty arrays
- responsive layout works on desktop and mobile widths

### Regression

- existing dashboard readiness and weakness sections still render
- metrics endpoint still supports current research/reporting expectations

## Definition Of Done

Phase 4 is complete when:

- the dashboard reflects execution progress as well as readiness
- roadmap and planner status are visible from the dashboard
- aggregated metrics are stable and explainable
- the page remains responsive and failure-tolerant

