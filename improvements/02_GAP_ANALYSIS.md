# Gap Analysis

## Baseline

The current product is strongest in adaptive quiz delivery and post-quiz analytics. The requested upgrade set adds a planning layer on top of that adaptive engine:

- richer learner profiling
- long-horizon planning
- short-horizon task orchestration
- broader practice discovery
- conversational guidance

The important conclusion is that most requested features are not blocked by missing question/content infrastructure. They are blocked by missing planning-state infrastructure.

## Feature 1: Smart Onboarding 2.0

### Desired

- target exam date
- target study hours
- user level
- topics already known
- subject-wise confidence

### What already exists

- `users.daily_study_minutes`
- `users.experience_level`
- `/api/auth/me` update route
- frontend onboarding page with a basic save flow
- content APIs to fetch subjects/topics

### What is partially there

- User level already exists as `experience_level`, but only with a simple dropdown.
- Study-time target already exists operationally as `daily_study_minutes`.
- The auth store and onboarding page already know how to refresh the local user profile after save.

### What is missing

- No exam-date field.
- No storage for self-reported subject confidence.
- No storage for â€œtopics already knownâ€.
- No onboarding versioning/completion timestamp.
- No multi-step onboarding UX.

### What should be extended instead of rebuilt

- Reuse `users.daily_study_minutes`; do not add a redundant â€œdaily hours targetâ€ field unless product semantics truly differ.
- Reuse `users.experience_level`.
- Extend `/api/auth/me` instead of inventing a disconnected onboarding API.
- Reuse `GET /api/content/subjects` and `GET /api/content/subjects/{subject_id}/topics` to populate the UI.

### Upgrade conclusion

This feature is an additive profile extension, not a new subsystem. It should be Phase 1.

## Feature 2: Personalized Roadmap Generator

### Desired

- 52-week roadmap
- month-wise roadmap
- week-wise plan
- adaptive topic sequencing

### What already exists

- Complete syllabus graph in `subjects` and `topics`
- `topics.display_order`
- `topics.difficulty_weight`
- `topic_masteries`
- `revision_schedules`
- onboarding inputs for daily capacity and experience level

### What is partially there

- The system already knows:
  - what the student is weak at
  - what topics exist
  - how difficult topics are
  - how much time the student wants to study daily
- This is enough to generate a rule-based roadmap.

### What is missing

- No roadmap tables.
- No roadmap service.
- No roadmap endpoints.
- No roadmap UI.
- No persistent generated plan versions.
- No adaptation layer to regenerate when mastery changes.

### What should be extended instead of rebuilt

- Reuse `topic_masteries` as the primary â€œwhere is the student weak now?â€ signal.
- Reuse `topics.display_order` + `difficulty_weight` for initial sequencing.
- Reuse AI only for summary/explanation, not for the schedule itself.

### Upgrade conclusion

Roadmap generation should be built as a deterministic planning service backed by new persistence tables. This is Phase 2.

## Feature 3: Daily Study Planner

### Desired

- todayâ€™s task
- daily topics
- resources
- practice targets
- revision tasks
- carry-forward logic

### What already exists

- `revision_schedules` gives a due-revision stream.
- `adaptive_recommender.py` can select high-value practice questions.
- dashboard already has quick actions for quiz/revision.

### What is partially there

- The revision page is effectively a very small planner for due revision only.
- `daily_study_minutes` can act as task-capacity input.
- Quiz question selection logic already exists and can be reused to generate daily practice recommendations.

### What is missing

- No daily plan table.
- No per-task completion state.
- No carry-forward model.
- No study activity logging for non-quiz work.
- No â€œtodayâ€ aggregation API.
- No resource/link abstraction in the database.

### What should be extended instead of rebuilt

- Extend `revision_schedules` into a broader planner rather than replacing it.
- Reuse adaptive recommendation logic for â€œpractice targetâ€ tasks.
- Reuse topic mastery and roadmap-week allocations to assemble daily tasks.

### Upgrade conclusion

The daily planner is the bridge between roadmap and dashboard. It should follow roadmap persistence and land in Phase 3.

## Feature 4: Enhanced Dashboard

### Desired

- study streak
- questions solved
- accuracy
- hours studied
- roadmap progress
- topic progress
- quick actions

### What already exists

- readiness score
- weak/strong topics
- subject progress
- recent quiz scores
- today quiz readiness flag
- analytics endpoint with total quizzes, total questions solved, average accuracy, readiness trend, revision completion, topic recovery

### What is partially there

- `metrics_service.py` already computes:
  - `total_questions_solved`
  - `average_accuracy_pct`
  - readiness trend
  - revision completion rate
- dashboard page already supports a multi-card layout and quick-action section.

### What is missing

- No study streak calculation.
- No hours-studied tracking source of truth.
- No roadmap progress because no roadmap exists yet.
- No daily-planner summary because planner does not exist yet.
- No explicit topic-progress module beyond weakness bars.

### What should be extended instead of rebuilt

- Extend `dashboard_service.py` and `metrics_service.py`.
- Extend `frontend/store/dashboardStore.ts`.
- Reuse existing dashboard page rather than replacing the route.

### Upgrade conclusion

The enhanced dashboard is downstream of roadmap and planner data. It should be Phase 4, not Phase 1.

## Feature 5: PYQ Browser

### Desired

- browse/filter previous year questions
- practice mode

### What already exists

- `questions.source_type`
- `questions.year`
- `questions.subject_id`
- `questions.topic_id`
- admin question filters already support `source_type`, `year`, `subject_id`, `topic_id`, search
- existing quiz UI and submission pipeline

### What is partially there

- The data model already supports PYQ classification.
- The admin side already treats PYQ as a first-class source type.
- The student side already has a question card and submission flow that can be reused for PYQ practice.

### What is missing

- No student-readable PYQ listing/filter endpoint.
- No student PYQ browser page.
- No â€œpractice selected filtered setâ€ mode.
- No quiz-context metadata to distinguish planner/adaptive/PYQ sessions cleanly.

### What should be extended instead of rebuilt

- Reuse `questions` instead of creating a separate PYQ table.
- Reuse current quiz submit/result pipeline by adding context metadata and a `quiz_type` such as `pyq_practice`.
- Reuse current filter patterns from `admin_questions.py`.

### Upgrade conclusion

PYQ browser is a strong reuse feature. It should be Phase 5 and should avoid inventing a second question-delivery system.

## Feature 6: AI Study Chatbot

### Desired

- concept doubts
- roadmap guidance
- weak-topic help
- study planning help

### What already exists

- AI client configuration and fallback handling
- weak-topic explanation prompt flow
- topic, subject, mastery, revision, and quiz context in the DB
- embeddings and lightweight NLP utilities

### What is partially there

- `/api/ai/explain` proves the backend can already generate grounded student-facing AI copy from stored stats.
- `nlp_pipeline.py` already supports embeddings and duplicate detection, which can be repurposed for lightweight retrieval.

### What is missing

- No chat endpoints.
- No session/message persistence.
- No grounding pipeline across roadmap/planner/mastery/question bank.
- No chat UI.
- No guardrail strategy for â€œplanning adviceâ€ versus â€œconcept explanationâ€.

### What should be extended instead of rebuilt

- Extend AI usage around a new context-building service.
- Reuse current mastery/revision/roadmap/planner state as the grounding pack.
- Keep planning decisions rule-based; use AI for explanation, synthesis, and tutoring.

### Upgrade conclusion

This should be the last feature phase. It depends on roadmap and planner data to be genuinely useful.

## Overall Gap Summary

| Requested feature | Current maturity | Recommendation |
| --- | --- | --- |
| Smart Onboarding 2.0 | Partially implemented | Extend existing auth/profile flow |
| Personalized Roadmap | Not implemented | Add new roadmap domain using current syllabus + mastery data |
| Daily Study Planner | Very lightly implied by revision plan | Add planner domain using roadmap + revision + recommender |
| Enhanced Dashboard | Partially implemented | Extend current dashboard/metrics services after planner exists |
| PYQ Browser | Data model ready, UX missing | Reuse question bank and quiz pipeline |
| AI Study Chatbot | Primitive AI building block exists | Add grounded chat last, on top of roadmap/planner/mastery |

## Key Reuse Principle

The project already knows how to answer these questions:

- What topics exist?
- What questions belong to those topics?
- What is the user weak in?
- What should be revised next?
- How much time does the user want to study?

The requested upgrade set should therefore focus on orchestrating those answers over time, not rebuilding the knowledge model or the quiz engine.

