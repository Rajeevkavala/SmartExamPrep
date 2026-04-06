# 10 Phase 2 Detailed Execution

## Phase Goal

Phase 2 adds the first durable personalized roadmap layer on top of the new onboarding profile. The current system already has the exact raw signals needed to begin: `users.daily_study_minutes`, `users.experience_level`, `topic_masteries`, `revision_schedules`, subject/topic ordering, and verified question/topic coverage. The safest implementation is to build a rule-based roadmap engine that consumes those signals and stores a generated plan in new roadmap tables.

The phase outcome should be:

- each user can generate one current roadmap
- the roadmap is derived from real profile and performance data
- the roadmap is visible in the frontend
- the algorithm is deterministic and debuggable before adding any planner or chatbot layer

## Features Included

- roadmap generation from onboarding + mastery data
- 52-week or exam-window constrained plan
- month-wise and week-wise structure
- adaptive topic sequencing based on weakness, confidence, and known-topic baselines
- roadmap persistence and regeneration

## Exact Files To Read First

1. `backend/models/models.py`
2. `backend/services/weakness_service.py`
3. `backend/services/recommendation_service.py`
4. `backend/services/dashboard_service.py`
5. `backend/routers/analysis.py`
6. `backend/routers/content.py`
7. `backend/schemas/analysis_schemas.py`
8. `backend/ml/weakness_detector.py`
9. `backend/ml/adaptive_recommender.py`
10. `frontend/app/(student)/onboarding/page.tsx`
11. `frontend/app/(student)/dashboard/page.tsx`
12. `frontend/store/authStore.ts`
13. `frontend/store/dashboardStore.ts`
14. `frontend/middleware.ts`

## Existing Files To Modify

### Backend

- `backend/models/models.py`
- `backend/main.py`
- `backend/routers/content.py`
- `backend/routers/analysis.py`

### Frontend

- `frontend/middleware.ts`
- `frontend/store/authStore.ts`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/app/(student)/dashboard/page.tsx`

### Tests

- `frontend/tests/e2e/chunk11-student-pages.spec.ts`
- `backend/test_api_flow.py`

## New Files To Create

### Backend

- `backend/alembic/versions/<timestamp>_add_roadmap_tables.py`
- `backend/routers/roadmap.py`
- `backend/services/roadmap_service.py`
- `backend/schemas/roadmap_schemas.py`
- `backend/tests/test_roadmap_service.py`
- `backend/tests/test_roadmap_router.py`

### Frontend

- `frontend/app/(student)/roadmap/page.tsx`
- `frontend/store/roadmapStore.ts`
- `frontend/components/student/RoadmapHero.tsx`
- `frontend/components/student/RoadmapMonthSection.tsx`
- `frontend/components/student/RoadmapWeekCard.tsx`
- `frontend/components/student/RoadmapTopicList.tsx`

## Exact DB Changes

### Add `study_roadmaps`

Suggested columns:

- `id`
- `user_id`
- `status` with values like `active`, `superseded`, `archived`
- `plan_horizon_weeks`
- `generation_reason`
- `generated_from_attempt_id` nullable
- `generated_at`
- `start_date`
- `end_date`
- `metadata_json`

Constraints:

- index on `user_id`
- index on `(user_id, status)`

### Add `roadmap_weeks`

Suggested columns:

- `id`
- `roadmap_id`
- `week_number`
- `month_number`
- `start_date`
- `end_date`
- `planned_minutes`
- `focus_label`
- `status`

Constraints:

- unique constraint on `(roadmap_id, week_number)`

### Add `roadmap_week_topics`

Suggested columns:

- `id`
- `roadmap_week_id`
- `topic_id`
- `subject_id`
- `sequence_order`
- `priority_score`
- `planned_minutes`
- `goal_type` such as `learn`, `practice`, `revise`
- `rationale`

Constraints:

- unique constraint on `(roadmap_week_id, topic_id)`
- index on `topic_id`

### Backward Compatibility Notes

- do not delete or mutate old roadmap rows on regeneration; mark old roadmap `superseded`
- keep roadmap storage independent from `revision_schedules`
- do not store generated daily tasks in roadmap tables yet; that belongs to Phase 3

## Exact Backend Changes

### 1. ORM updates in `backend/models/models.py`

Add:

- `StudyRoadmap`
- `RoadmapWeek`
- `RoadmapWeekTopic`

Recommended relationships:

- `User.roadmaps`
- `StudyRoadmap.weeks`
- `RoadmapWeek.topics`
- links from week-topic rows to `Subject` and `Topic`

### 2. Roadmap DTOs in `backend/schemas/roadmap_schemas.py`

Add request/response models such as:

- `GenerateRoadmapRequest`
- `RoadmapSummaryResponse`
- `RoadmapWeekResponse`
- `RoadmapTopicItem`

`GenerateRoadmapRequest` should stay small. The backend already has the needed user context, so it may only need:

- optional `force_regenerate`
- optional `start_date`
- optional `generation_reason`

### 3. Roadmap generation service in `backend/services/roadmap_service.py`

This is the core of the phase.

Inputs:

- user profile from `users`
- `user_subject_confidences`
- `user_topic_baselines`
- `topic_masteries`
- `revision_schedules`
- syllabus order from `topics.display_order`
- topic difficulty from `topics.difficulty_weight`

Core algorithm:

1. determine available weeks from `exam_target_date`, capped at 52
2. compute a topic priority score using:
   - higher weakness score means earlier placement
   - lower subject confidence means earlier placement
   - `already_known = true` pushes topic later unless mastery is weak
   - higher `difficulty_weight` may justify more planned minutes
3. distribute topics across weeks based on the user's study budget
4. ensure each week includes a realistic mix of learn, practice, and revise emphasis
5. persist one roadmap and its child rows in a single transaction

Important implementation choice:

- keep this algorithm rule-based for Phase 2
- return rationale fields so the UI and later chatbot can explain why a topic is scheduled

### 4. New router in `backend/routers/roadmap.py`

Recommended endpoints:

- `POST /api/roadmap/generate`
- `GET /api/roadmap/current`
- `GET /api/roadmap/weeks/{week_number}`
- `POST /api/roadmap/regenerate`

Behavior guidance:

- `GET /current` returns the active roadmap summary plus first visible weeks
- regeneration should supersede, not overwrite, previous roadmap rows

### 5. App registration in `backend/main.py`

Register the roadmap router and tag it clearly.

### 6. Reuse and light extension of existing routers

`backend/routers/content.py` may not need route changes, but roadmap generation should reuse it indirectly through the same subject/topic structure and not invent a duplicate syllabus contract.

`backend/routers/analysis.py` should remain unchanged in this phase unless you decide to expose a roadmap summary on dashboard early. If so, keep it additive only.

## Exact Frontend Changes

### 1. New student page at `frontend/app/(student)/roadmap/page.tsx`

The page should:

- fetch the current roadmap
- show a hero summary for exam date, weeks left, and total planned effort
- render month-wise grouping with expandable weekly details
- allow regeneration through an explicit action

### 2. Add `frontend/store/roadmapStore.ts`

Store:

- current roadmap summary
- selected week
- loading state
- regeneration state

Keep it separate from `dashboardStore`; roadmap state is durable and deserves its own cache boundary.

### 3. Extend onboarding completion flow

`frontend/app/(student)/onboarding/page.tsx` should not auto-generate the roadmap silently. Safer options:

- after save, redirect to a page that encourages diagnostic quiz first
- expose a clear `Generate roadmap` action from dashboard and from the roadmap page

Recommendation:

- keep onboarding redirect as-is or send users to dashboard
- let Phase 2 roadmap generation be user-triggered so failures are visible and recoverable

### 4. Update dashboard quick actions

`frontend/app/(student)/dashboard/page.tsx` should add a roadmap entry point:

- `View Roadmap`
- optionally `Generate Roadmap` if none exists

### 5. Middleware update in `frontend/middleware.ts`

Protect `/roadmap` for authenticated students.

## Exact ML / AI Changes

### Use existing ML outputs as inputs, not as orchestration

Use:

- `TopicMastery.weakness_score`
- current weakness-analysis behavior
- existing experience and study time fields

Do not use:

- AI for the actual roadmap structure
- real-time embedding search for sequencing

The roadmap engine should be explainable and deterministic first.

## Exact APIs To Add Or Change

### New

- `POST /api/roadmap/generate`
- `GET /api/roadmap/current`
- `GET /api/roadmap/weeks/{week_number}`
- `POST /api/roadmap/regenerate`

### Reused

- `GET /api/content/subjects`
- `GET /api/content/subjects/{subject_id}/topics`
- `GET /api/analysis/weakness`

## Exact Data Flow Changes

```text
student profile + mastery + revision data
  -> roadmap_service computes topic priorities
  -> roadmap rows are written to study_roadmaps / roadmap_weeks / roadmap_week_topics
  -> frontend roadmap page fetches active roadmap
  -> dashboard surfaces roadmap entry point and summary
```

## Implementation Order Inside Phase 2

1. create roadmap migration
2. add roadmap ORM models and relationships
3. build roadmap service algorithm with unit tests
4. add roadmap schemas and router
5. register router in `backend/main.py`
6. add router integration tests
7. create roadmap store and student roadmap page
8. add dashboard link and middleware protection
9. manually verify generation with:
   - no quiz history
   - weak quiz history
   - strong quiz history

## Likely Bugs And Risks

### Multiple active roadmaps

If regeneration does not supersede previous rows, the UI may fetch an arbitrary roadmap.

### Unrealistic week allocation

If the algorithm only uses topic count and ignores study minutes, weeks will be overloaded.

### Missing mastery data

Users who skipped quizzes still need a roadmap. The service must fall back to confidence and syllabus ordering.

### Roadmap instability

If a small data change triggers a completely different sequence, users will lose trust. Keep regeneration bounded and explainable.

### Topic explosion

With 57 topics and 265 subtopics, naive expansion can create noisy weekly plans. Phase 2 should plan at topic level, not subtopic micro-task level.

## Phase 2 Testing Checklist

### Backend

- generation succeeds for fully onboarded users with no attempts
- generation succeeds for users with mastery and revision data
- `GET /api/roadmap/current` returns the active roadmap only
- regeneration supersedes the prior roadmap safely
- week numbering and month grouping are consistent

### Frontend

- roadmap page loads correctly for first generation
- regeneration shows pending state and refreshes data
- dashboard link routes to roadmap page
- empty-state behavior is clear when no roadmap exists

### Regression

- onboarding still saves correctly
- dashboard still loads even if roadmap generation has never happened
- content and analysis endpoints remain unchanged

## Definition Of Done

Phase 2 is complete when:

- a user can generate and view a durable roadmap
- roadmap sequencing uses real profile and mastery data
- regeneration is safe and traceable
- the frontend exposes the roadmap without disturbing current quiz and revision flows

