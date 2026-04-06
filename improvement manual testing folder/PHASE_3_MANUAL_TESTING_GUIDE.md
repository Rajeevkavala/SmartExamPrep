# Phase 3 Manual Testing Guide

## Scope

Validate the Daily Study Planner end to end:

- roadmap-backed planner generation
- task completion lifecycle
- carry-forward behavior
- planner to quiz integration
- planner to revision integration
- activity logging flowing into the dashboard

## Prerequisites

1. Backend dependencies are installed in the repo venv.
2. Frontend dependencies are installed in `frontend/node_modules`.
3. The database is reachable.
4. Seed baseline content:

```powershell
cd backend
..\.venv\Scripts\python.exe seed.py
```

If your shell does not like that relative path, run the equivalent absolute venv path instead.

Expected result:

- admin user is created
- subjects, topics, and sample questions are inserted
- the script completes cleanly on Windows terminals

## Automated Checks

Run these before manual QA:

```powershell
cd D:\New folder (2)\SmartExamPrep
$env:PYTHONPATH = 'D:\New folder (2)\SmartExamPrep\backend'
.\.venv\Scripts\python.exe -m pytest backend/tests -q
cd frontend
npm run test:e2e -- tests/e2e/chunk17-roadmap.spec.ts tests/e2e/chunk18-planner.spec.ts
```

## Manual Flow

### 1. Student setup

1. Start backend and frontend.
2. Register a new student.
3. Complete onboarding with:
   - future exam target date
   - daily study minutes
   - experience level
   - at least one subject confidence
   - at least one known topic
4. Open `/roadmap` and generate a roadmap.

Expected:

- roadmap generation succeeds
- `/planner` is reachable

### 2. Planner generation

1. Open `/planner`.
2. Confirm today’s plan auto-loads.
3. Confirm the page shows:
   - planner hero
   - roadmap-backed study work
   - adaptive practice or fallback study work

Expected:

- only one plan exists for today
- task counts and minute totals render correctly

### 3. Task completion

1. Mark one non-quiz planner task complete.
2. Refresh `/planner`.
3. Open `/dashboard`.

Expected:

- completed task stays completed after refresh
- planner summary updates
- dashboard minutes and activity counts increase

### 4. Planner to quiz integration

1. From a planner practice task, click `Start Practice`.
2. Finish the adaptive quiz.
3. Land on the result page.
4. Use `Back to Planner`.

Expected:

- quiz submission succeeds
- result page shows planner context
- the linked planner practice task becomes completed
- dashboard `questions solved today` increases

### 5. Planner to revision integration

1. Make sure at least one revision schedule is due.
2. Regenerate today’s planner if needed.
3. Open the linked revision task from `/planner`.
4. Mark it done from `/revision`.

Expected:

- the linked planner revision task becomes completed
- the revision item disappears from the due list
- dashboard still loads and reflects activity safely

### 6. Carry-forward behavior

1. Leave one planner task unfinished.
2. Use the planner carry-forward action.
3. Use it again without changing the source plan.

Expected:

- unfinished work is brought forward once
- the same source task is not duplicated by repeated carry-forward actions
- carry-forward titles are not repeatedly prefixed

### 7. Idempotency checks

1. Mark the same revision item done twice.
2. Refresh planner and dashboard.

Expected:

- no duplicate planner task is created
- no duplicate revision activity inflation is visible
- the repeated action stays safe

## Edge Cases

Validate these before sign-off:

1. Planner still loads for a user with no quiz history.
2. Force-regenerating today’s plan does not create duplicate same-day plans.
3. A user cannot update another user’s planner task.
4. Empty or partial planner states render safely.
5. Dashboard remains usable even when `nlp_insight` is absent.

## Sign-Off Criteria

Phase 3 is ready when all of these are true:

- planner generation works from real roadmap and learner data
- task completion is durable
- linked practice and revision flows work
- carry-forward is bounded and non-duplicating
- activity logging updates downstream metrics safely
