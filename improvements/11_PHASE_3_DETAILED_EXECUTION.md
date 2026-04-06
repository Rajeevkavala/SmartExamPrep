# 11 Phase 3 Detailed Execution

## Phase Goal

Phase 3 turns the stored roadmap into a daily execution layer. The current product already has two strong building blocks: `revision_schedules` for due revisions and the quiz system for practice. What it does not have is a durable "today plan" model, a task lifecycle, or a place to store study activity. This phase adds those pieces while preserving the current revision page and adaptive quiz flow.

The phase outcome should be:

- every student can see a generated daily plan
- the plan combines roadmap topics, due revisions, and practice tasks
- users can complete tasks and carry unfinished work forward
- activity data exists for dashboard metrics in Phase 4

## Features Included

- daily study planner
- today task list
- resources and practice targets
- revision carry-forward logic
- study activity logging

## Exact Files To Read First

1. `backend/models/models.py`
2. `backend/routers/revision.py`
3. `backend/services/weakness_service.py`
4. `backend/services/recommendation_service.py`
5. `backend/services/dashboard_service.py`
6. `backend/routers/quiz.py`
7. `backend/services/quiz_service.py`
8. `frontend/app/(student)/revision/page.tsx`
9. `frontend/app/(student)/dashboard/page.tsx`
10. `frontend/components/student/RevisionItem.tsx`
11. `frontend/store/dashboardStore.ts`
12. `frontend/store/quizStore.ts`

## Existing Files To Modify

### Backend

- `backend/models/models.py`
- `backend/main.py`
- `backend/routers/revision.py`
- `backend/routers/quiz.py`
- `backend/services/quiz_service.py`
- `backend/services/recommendation_service.py`

### Frontend

- `frontend/middleware.ts`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/revision/page.tsx`
- `frontend/store/dashboardStore.ts`
- `frontend/store/quizStore.ts`

### Tests

- `frontend/tests/e2e/chunk11-student-pages.spec.ts`
- `frontend/tests/e2e/chunk12-quiz-revision.spec.ts`
- `backend/test_api_flow.py`

## New Files To Create

### Backend

- `backend/alembic/versions/<timestamp>_add_daily_planner_tables.py`
- `backend/routers/planner.py`
- `backend/services/planner_service.py`
- `backend/services/study_activity_service.py`
- `backend/schemas/planner_schemas.py`
- `backend/tests/test_planner_service.py`
- `backend/tests/test_planner_router.py`

### Frontend

- `frontend/app/(student)/planner/page.tsx`
- `frontend/store/plannerStore.ts`
- `frontend/components/student/DailyPlanHero.tsx`
- `frontend/components/student/DailyTaskCard.tsx`
- `frontend/components/student/CarryForwardBanner.tsx`
- `frontend/components/student/PlannerSummary.tsx`

## Exact DB Changes

### Add `daily_study_plans`

Suggested columns:

- `id`
- `user_id`
- `plan_date`
- `roadmap_id`
- `status` such as `draft`, `active`, `completed`, `carried_forward`
- `planned_minutes`
- `completed_minutes`
- `carry_forward_from_plan_id`
- `generated_at`
- `metadata_json`

Constraints:

- unique constraint on `(user_id, plan_date)`

### Add `daily_study_tasks`

Suggested columns:

- `id`
- `plan_id`
- `task_type` such as `learn`, `practice`, `revision`, `quiz`
- `source_type` such as `roadmap`, `revision_schedule`, `manual`
- `subject_id`
- `topic_id`
- `title`
- `description`
- `resource_hint`
- `target_question_count`
- `target_minutes`
- `sequence_order`
- `status`
- `completed_at`
- `carry_forward_count`

Constraints:

- index on `(plan_id, status)`
- index on `topic_id`

### Add `study_activity_logs`

Purpose: a durable event ledger for metrics and dashboard summaries.

Suggested columns:

- `id`
- `user_id`
- `activity_type` such as `planner_task_completed`, `quiz_submitted`, `revision_done`
- `related_entity_type`
- `related_entity_id`
- `duration_minutes`
- `questions_solved`
- `accuracy_pct`
- `activity_date`
- `payload_json`
- `created_at`

Indexes:

- `(user_id, activity_date)`
- `(user_id, activity_type)`

### Optional In This Phase

Add `quiz_attempts.context_payload` if you want to track whether an attempt came from planner, roadmap, revision, or PYQ flows. This helps later analytics, but it can be postponed if it increases migration risk.

## Exact Backend Changes

### 1. ORM updates in `backend/models/models.py`

Add:

- `DailyStudyPlan`
- `DailyStudyTask`
- `StudyActivityLog`

Add relationships from `User` and optionally from `StudyRoadmap`.

### 2. Planner DTOs in `backend/schemas/planner_schemas.py`

Create models such as:

- `DailyTaskItem`
- `DailyPlanResponse`
- `GenerateTodayPlanRequest`
- `UpdateTaskStatusRequest`
- `CarryForwardResponse`

### 3. Planner generation service in `backend/services/planner_service.py`

Inputs:

- active roadmap week
- due revision items from current revision logic
- weak topics from mastery data
- user daily time budget

Planner algorithm:

1. find or generate today's plan
2. allocate time budget across:
   - due revisions first
   - current roadmap week topics second
   - a recommended quiz/practice task last
3. convert those priorities into task rows
4. carry forward incomplete tasks from prior plans, but cap duplicates
5. return one coherent plan for the day

Important choice:

- the planner should not generate custom question sets itself
- it should point to existing revision and quiz flows wherever possible

### 4. Activity logging service in `backend/services/study_activity_service.py`

Use this shared service to record:

- completed planner tasks
- revision mark-done actions
- quiz submissions

This avoids metric logic being spread across unrelated routers.

### 5. New router in `backend/routers/planner.py`

Recommended endpoints:

- `GET /api/planner/today`
- `POST /api/planner/generate-today`
- `PATCH /api/planner/tasks/{task_id}`
- `POST /api/planner/carry-forward`

Behavior notes:

- `GET /today` should auto-return the existing plan if already generated
- explicit generation is useful for retries and testing

### 6. Extend `backend/routers/revision.py`

Current behavior marks completion by `topic_id`. For planner compatibility:

- keep current route for backward compatibility
- consider adding schedule-aware completion later
- log a `revision_done` activity when mark-done succeeds

### 7. Extend `backend/services/quiz_service.py`

After successful submission:

- create a `StudyActivityLog` entry
- optionally preserve planner context if provided

Do not disturb existing `result_snapshot` generation.

### 8. App registration in `backend/main.py`

Register the planner router.

## Exact Frontend Changes

### 1. New page at `frontend/app/(student)/planner/page.tsx`

The page should:

- load today's plan
- show task ordering and time budget
- let users mark tasks complete
- show carry-forward items distinctly
- link into existing revision, adaptive quiz, or roadmap pages

### 2. Add `frontend/store/plannerStore.ts`

Store:

- today's plan
- task update state
- refresh state
- carry-forward banner state

### 3. Reuse revision flow from `frontend/app/(student)/revision/page.tsx`

Do not replace the revision page. Instead:

- planner tasks of type `revision` should link there or call the same completion endpoint
- the revision page can later surface a shortcut back to planner

### 4. Extend `frontend/app/(student)/dashboard/page.tsx`

Add a `Today's plan` quick action and a small summary card if planner data is available.

### 5. Middleware update in `frontend/middleware.ts`

Protect `/planner`.

## Exact ML / AI Changes

Use existing deterministic signals:

- spaced revision due dates from `revision_schedules`
- weak topics from mastery
- adaptive practice recommendation from `recommendation_service.py`

Do not use AI to build the task list. Planner generation must stay predictable.

## Exact APIs To Add Or Change

### New

- `GET /api/planner/today`
- `POST /api/planner/generate-today`
- `PATCH /api/planner/tasks/{task_id}`
- `POST /api/planner/carry-forward`

### Changed

- `POST /api/revision/mark-done` should also write an activity log
- `POST /api/quiz/submit` may optionally record context and activity

## Exact Data Flow Changes

```text
active roadmap + due revision items + weak-topic practice need
  -> planner_service generates today's plan
  -> daily plan/tasks persisted
  -> student completes tasks
  -> task updates and revision/quiz events write activity logs
  -> dashboard metrics can later use those logs
```

## Implementation Order Inside Phase 3

1. create planner/activity migration
2. add ORM models
3. implement planner generation service
4. implement activity logging service
5. add planner schemas and router
6. instrument revision and quiz completion logging
7. add planner router tests
8. build planner store and page
9. add dashboard quick action and revision linkage
10. manually validate carry-forward behavior across multiple days

## Likely Bugs And Risks

### Duplicate daily plans

Without a unique `(user_id, plan_date)` constraint, retries can create multiple plans for one day.

### Infinite carry-forward

Unfinished tasks can grow without bound if each generation blindly clones prior items.

### Time-budget overflow

If revisions, roadmap tasks, and practice recommendations are all appended independently, the plan will exceed the user's `daily_study_minutes`.

### Activity double counting

If both planner completion and quiz submission write the same "questions solved" metric, the dashboard will overstate progress later.

### Date and timezone drift

Planner generation is date-sensitive. Be explicit about which timezone defines "today" in the backend.

## Phase 3 Testing Checklist

### Backend

- only one plan exists per user per date
- revisions are prioritized into today's plan
- carry-forward creates only the intended tasks
- task completion updates plan progress correctly
- quiz submission writes exactly one activity log entry

### Frontend

- planner page handles empty state and generated state
- task completion updates without stale UI
- carry-forward banner appears only when relevant
- revision and quiz links from tasks work correctly

### Regression

- standalone revision page still functions
- adaptive quiz and result page still function
- roadmap page is unaffected by planner generation

## Definition Of Done

Phase 3 is complete when:

- students can generate and work through a daily plan
- task completion and carry-forward are durable
- study activity logs are available for dashboard metrics
- existing revision and quiz flows remain intact

