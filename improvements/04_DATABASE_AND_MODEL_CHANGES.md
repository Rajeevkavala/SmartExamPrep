# Database And Model Changes

## Design Principle

The existing schema is strong enough to remain the core of the system. The upgrade should preserve these tables as foundational:

- `users`
- `subjects`
- `topics`
- `questions`
- `quiz_attempts`
- `topic_masteries`
- `revision_schedules`

New feature work should add planning, activity, and chat state around them.

## Current Schema Constraints To Respect

### Existing useful fields to keep reusing

- `users.daily_study_minutes`
  - Reuse for daily study capacity instead of creating a duplicate daily-target field.
- `users.experience_level`
  - Reuse for onboarding “user level”.
- `topics.display_order`
  - Reuse as syllabus sequencing hint.
- `topics.difficulty_weight`
  - Reuse as roadmap and planner prioritization weight.
- `questions.source_type` and `questions.year`
  - Reuse for PYQ browsing.
- `topic_masteries.*`
  - Reuse for actual measured learning state.
- `revision_schedules.*`
  - Reuse for revision task generation.

## Required Additions To Existing Tables

## 1. `users`

### Add fields

| Field | Type | Why |
| --- | --- | --- |
| `exam_target_date` | `Date` nullable | Needed for roadmap horizon and urgency |
| `onboarding_version` | `Integer` nullable | Lets frontend/backend distinguish old vs new onboarding completeness |
| `onboarding_completed_at` | `DateTime` nullable | Needed to know whether the roadmap can be generated confidently |

### Do not add

- another daily-hours field
- another experience-level field

Those are already represented by `daily_study_minutes` and `experience_level`.

## 2. `quiz_attempts`

### Add field

| Field | Type | Why |
| --- | --- | --- |
| `context_payload` | `JSON` nullable | Distinguish diagnostic/adaptive/PYQ/planner-linked attempts and preserve filters/task origin |

### Example payloads

```json
{
  "source": "pyq_browser",
  "filters": {
    "subject_id": "subj-1",
    "topic_id": "topic-4",
    "year_from": 2019,
    "year_to": 2024
  }
}
```

```json
{
  "source": "daily_planner",
  "daily_task_id": "task-123",
  "roadmap_week_id": "week-7"
}
```

## 3. `revision_schedules`

### Add DB constraint

| Change | Why |
| --- | --- |
| `UNIQUE(user_id, topic_id)` | Current service logic already assumes one schedule row per user/topic |

### Optional additive field

| Field | Type | Why |
| --- | --- | --- |
| `completed_at` | `DateTime` nullable | Cleaner audit trail than a boolean alone |

If keeping changes minimal, the unique constraint is the critical part.

## New Tables Required

## 1. `user_subject_confidences`

### Purpose

Stores self-reported confidence per subject from Smart Onboarding 2.0.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `subject_id` | FK `subjects.id` |
| `confidence_pct` | Float |
| `source` | String(50), default `onboarding` |
| `updated_at` | DateTime |

### Constraints

- unique `(user_id, subject_id)`

## 2. `user_topic_baselines`

### Purpose

Stores “topics already known” or baseline topic familiarity from onboarding.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `topic_id` | FK `topics.id` |
| `already_known` | Boolean |
| `source` | String(50), default `onboarding` |
| `updated_at` | DateTime |

### Constraints

- unique `(user_id, topic_id)`

## 3. `study_roadmaps`

### Purpose

Persistent, versioned roadmap container per user.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `status` | Enum/String: `draft`, `active`, `archived` |
| `horizon_weeks` | Integer, default `52` |
| `start_date` | Date |
| `exam_target_date` | Date |
| `profile_snapshot` | JSON |
| `summary` | JSON |
| `generated_from_attempt_id` | FK nullable `quiz_attempts.id` |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### Notes

- Keep `profile_snapshot` so old roadmaps remain explainable even after onboarding changes.
- Allow multiple roadmaps, but only one active roadmap per user.

## 4. `roadmap_weeks`

### Purpose

Week-level roadmap entries used by month/week views and progress tracking.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `roadmap_id` | FK `study_roadmaps.id` |
| `week_number` | Integer |
| `month_number` | Integer |
| `start_date` | Date |
| `end_date` | Date |
| `theme` | String(255) |
| `objective_type` | String(50) |
| `planned_minutes` | Integer |
| `completion_pct` | Float default `0` |
| `status` | String(50): `pending`, `active`, `completed`, `missed` |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### Constraints

- unique `(roadmap_id, week_number)`

## 5. `roadmap_week_topics`

### Purpose

Topic-level allocations inside each roadmap week.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `roadmap_week_id` | FK `roadmap_weeks.id` |
| `subject_id` | FK `subjects.id` |
| `topic_id` | FK `topics.id` |
| `sequence_rank` | Integer |
| `planned_minutes` | Integer |
| `practice_target_questions` | Integer |
| `revision_target_minutes` | Integer |
| `rationale` | JSON |

## 6. `daily_study_plans`

### Purpose

One row per user per study date.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `roadmap_id` | FK nullable `study_roadmaps.id` |
| `roadmap_week_id` | FK nullable `roadmap_weeks.id` |
| `plan_date` | Date |
| `status` | String(50): `draft`, `active`, `completed`, `carried_forward`, `skipped` |
| `total_planned_minutes` | Integer |
| `total_completed_minutes` | Integer |
| `carry_forward_from_plan_id` | FK nullable self-reference |
| `created_at` | DateTime |
| `updated_at` | DateTime |

### Constraints

- unique `(user_id, plan_date)`

## 7. `daily_study_tasks`

### Purpose

Task rows inside a daily plan.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `daily_plan_id` | FK `daily_study_plans.id` |
| `task_type` | String(50): `learn`, `practice`, `revision`, `pyq`, `adaptive_quiz`, `chat_followup` |
| `subject_id` | FK nullable `subjects.id` |
| `topic_id` | FK nullable `topics.id` |
| `title` | String(255) |
| `instructions` | Text |
| `target_questions` | Integer nullable |
| `target_minutes` | Integer nullable |
| `status` | String(50): `pending`, `in_progress`, `completed`, `carried_forward`, `skipped` |
| `sort_order` | Integer |
| `source_payload` | JSON |
| `completed_at` | DateTime nullable |
| `carried_from_task_id` | FK nullable self-reference |

## 8. `study_activity_logs`

### Purpose

A normalized source of truth for dashboard streaks, hours studied, questions solved, and planner compliance.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `activity_type` | String(50): `quiz_attempt`, `revision_done`, `planner_task_completed`, `pyq_practice`, `manual_session` |
| `subject_id` | FK nullable `subjects.id` |
| `topic_id` | FK nullable `topics.id` |
| `quiz_attempt_id` | FK nullable `quiz_attempts.id` |
| `daily_task_id` | FK nullable `daily_study_tasks.id` |
| `minutes_spent` | Integer |
| `questions_solved` | Integer default `0` |
| `accuracy_pct` | Float nullable |
| `occurred_at` | DateTime |
| `metadata` | JSON |

## 9. `study_chat_sessions`

### Purpose

Student-visible chat threads.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `user_id` | FK `users.id` |
| `title` | String(255) |
| `context_type` | String(50): `general`, `roadmap`, `planner`, `weak_topic`, `pyq` |
| `created_at` | DateTime |
| `updated_at` | DateTime |

## 10. `study_chat_messages`

### Purpose

Persist chat messages and grounding data for replay/debugging.

### Columns

| Column | Type |
| --- | --- |
| `id` | UUID PK |
| `session_id` | FK `study_chat_sessions.id` |
| `role` | String(20): `user`, `assistant`, `system` |
| `message_text` | Text |
| `grounding_snapshot` | JSON nullable |
| `created_at` | DateTime |

## Indexes To Add

| Target | Index |
| --- | --- |
| `questions` | `(is_verified, source_type, year, subject_id, topic_id)` |
| `daily_study_plans` | `(user_id, plan_date)` unique |
| `daily_study_tasks` | `(daily_plan_id, status)` |
| `study_activity_logs` | `(user_id, occurred_at)` |
| `study_activity_logs` | `(user_id, activity_type, occurred_at)` |
| `roadmap_weeks` | `(roadmap_id, week_number)` unique |

## Migration Plan

## Migration 1: Onboarding and integrity foundation

Add:

- `users.exam_target_date`
- `users.onboarding_version`
- `users.onboarding_completed_at`
- `quiz_attempts.context_payload`
- `user_subject_confidences`
- `user_topic_baselines`
- unique constraint on `revision_schedules(user_id, topic_id)`

### Backfill

- existing users get `onboarding_version = 1` or `NULL`, then promoted to `2` when they save the new onboarding form
- `onboarding_completed_at` stays null until upgraded flow is completed

## Migration 2: Roadmap persistence

Add:

- `study_roadmaps`
- `roadmap_weeks`
- `roadmap_week_topics`

## Migration 3: Planner and activity logging

Add:

- `daily_study_plans`
- `daily_study_tasks`
- `study_activity_logs`

## Migration 4: Chat persistence

Add:

- `study_chat_sessions`
- `study_chat_messages`

## Backward Compatibility Notes

### Existing student flows

- Diagnostic/adaptive quiz flows keep working if new fields are null.
- Dashboard should return empty roadmap/planner sections until new data exists.
- Old users remain valid because new fields are additive and nullable.

### Existing admin flows

- Admin subject/question/scraper/syllabus paths should be unaffected by the new planning tables.
- PYQ browser uses existing `questions` rows, so no content migration is required.

### Existing analytics

- `metrics_service.py` can keep working before `study_activity_logs` is populated.
- New dashboard metrics should default gracefully:
  - streak `0`
  - hours studied `0`
  - roadmap progress `null` or `0`
  - planner summary empty

## Schema Risks To Handle Carefully

### 1. `revision_schedules` uniqueness cleanup

Before adding a unique constraint, confirm there are no duplicate `(user_id, topic_id)` rows in existing environments.

### 2. `quiz_attempts.context_payload`

Treat as optional and additive. Do not force old attempts to backfill on deployment.

### 3. Roadmap/version semantics

Allow multiple roadmaps historically, but enforce only one active roadmap to avoid planner ambiguity.

### 4. Activity log inflation

Make `study_activity_logs` the derived analytics source going forward, but be consistent about what counts as “minutes studied”:

- quiz question time
- planner task completion time
- revision completion time

If the source-of-truth rule is inconsistent, the enhanced dashboard will become untrustworthy.
