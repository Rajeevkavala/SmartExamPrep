# Feature-By-Feature Implementation

## 1. Smart Onboarding 2.0

### Feature goal

Capture enough learner context to generate a credible long-range roadmap and short-range daily plan.

### How it should work in this project

- After login/register, the user lands on the existing onboarding route.
- The onboarding flow asks for:
  - exam target date
  - daily study target using the current `daily_study_minutes` concept
  - experience level using the current `experience_level`
  - subject-wise confidence
  - known topics
- Saving onboarding updates the current user profile and baseline confidence tables.

### Backend changes

- Extend `GET/PUT /api/auth/me`.
- Add onboarding save helpers in the service layer.
- Persist subject confidence and known-topic selections.

### Frontend changes

- Convert onboarding into a multi-step form.
- Load subjects/topics from existing content APIs.
- Update auth store with richer profile fields after save.

### DB changes

- add `users.exam_target_date`
- add `users.onboarding_version`
- add `users.onboarding_completed_at`
- add `user_subject_confidences`
- add `user_topic_baselines`

### ML / AI changes

- none required for save itself
- these inputs become roadmap/planner model inputs later

### Analytics changes

- add an onboarding-completed signal to dashboard/profile completeness if desired

### Admin panel changes if relevant

- none required

## 2. Roadmap Generator

### Feature goal

Generate a persistent 52-week roadmap with month and week structure, tailored to:

- time to exam
- current mastery
- self-reported confidence
- known topics

### How it should work in this project

- After onboarding or after a manual â€œGenerate Roadmapâ€ action, the backend creates an active roadmap.
- The roadmap is organized into:
  - overall summary
  - months
  - weeks
  - topic allocations per week
- The roadmap should sequence topics using current syllabus order and difficulty, then adjust priority with weakness and confidence signals.

### Backend changes

- add roadmap router and service
- implement deterministic week allocation algorithm
- store roadmap versions
- expose current roadmap and week-level detail

### Frontend changes

- add `/roadmap` page
- show roadmap summary, monthly grouping, weekly cards, and current week highlight

### DB changes

- add `study_roadmaps`
- add `roadmap_weeks`
- add `roadmap_week_topics`

### ML / AI changes

- use weakness and recommender signals to prioritize topics
- optionally add AI-generated explanation text for why the roadmap looks the way it does

### Analytics changes

- roadmap completion percentage
- current week completion
- planned vs completed week summaries

### Admin panel changes if relevant

- none required initially

## 3. Daily Study Planner

### Feature goal

Turn the roadmap into an executable daily checklist that mixes:

- learning tasks
- practice tasks
- revision tasks
- PYQ tasks

### How it should work in this project

- When the user opens `/planner`, the backend returns or generates the current dayâ€™s plan.
- The plan should include:
  - mandatory revision items due today
  - roadmap topics for the active week
  - recommended practice tasks
  - carry-forward tasks from unfinished prior days
- Completing tasks updates planner state and activity logs.

### Backend changes

- add planner router and planner service
- generate/retrieve todayâ€™s plan
- complete/skip/carry-forward tasks
- write activity logs

### Frontend changes

- add `/planner` page
- render task list and summary
- allow complete/skip actions
- surface carry-forward reasons

### DB changes

- add `daily_study_plans`
- add `daily_study_tasks`
- add `study_activity_logs`

### ML / AI changes

- use adaptive recommendation logic to fill practice tasks
- use revision schedule data to fill revision tasks
- optionally use AI for plan explanation text

### Analytics changes

- planned minutes vs completed minutes
- planner compliance
- carry-forward count

### Admin panel changes if relevant

- none required initially

## 4. Enhanced Dashboard

### Feature goal

Upgrade the current dashboard from a diagnostic snapshot into the main study command center.

### How it should work in this project

- Keep `/dashboard` as the primary student home.
- Add cards for:
  - study streak
  - questions solved
  - accuracy
  - hours studied
  - roadmap progress
  - topic progress
- Add a â€œtoday planâ€ preview and richer quick actions.

### Backend changes

- extend dashboard and metrics services
- aggregate from activity logs, roadmap, planner, quiz attempts, and topic mastery

### Frontend changes

- add KPI card grid
- add planner preview card
- add roadmap progress widget
- add topic progress section

### DB changes

- depends on roadmap and planner tables already added

### ML / AI changes

- existing weak-topic explanation can stay
- optionally add â€œwhy this is your focus todayâ€ summary based on planner/roadmap context

### Analytics changes

- this feature is mainly an analytics-delivery layer

### Admin panel changes if relevant

- optional future admin analytics page, not required now

## 5. PYQ Browser

### Feature goal

Let students browse and practice previous year questions directly.

### How it should work in this project

- Add a student page with filters for:
  - subject
  - topic
  - year range
  - difficulty
  - keyword search
- The practice action should launch a question set that still submits through the existing quiz system.

### Backend changes

- add PYQ list/filter router
- reuse current `questions` table with `source_type = PYQ`
- return question sets for practice without creating a second scoring pipeline

### Frontend changes

- add `/pyq` page
- add filter UI and result list
- add â€œpractice this filtered setâ€ CTA
- reuse `QuizCard` and result flow

### DB changes

- add index support
- optionally add `quiz_attempts.context_payload` if not already added earlier

### ML / AI changes

- optional related-question recommendations
- optional weak-topic + PYQ overlap suggestions

### Analytics changes

- track PYQ attempts as a quiz subtype
- surface PYQ practice counts later on the dashboard if useful

### Admin panel changes if relevant

- minimal
- current admin questions manager already supports PYQ classification, which is enough for the first version

## 6. AI Study Chatbot

### Feature goal

Provide grounded conversational support that uses real student state, not generic study advice.

### How it should work in this project

- Student opens `/chat`.
- Backend creates or loads a chat session.
- Each message is answered using a context pack built from:
  - profile
  - roadmap
  - planner
  - weak topics
  - revisions
  - optionally matched question snippets
- The assistant can answer both tutoring and planning questions.

### Backend changes

- add chat session/message models
- add chat router and chat service
- build context pack per request
- call AI with mode-specific prompt templates

### Frontend changes

- add `/chat` page
- message thread UI
- session list
- suggestion chips for common intents

### DB changes

- add `study_chat_sessions`
- add `study_chat_messages`

### ML / AI changes

- use embeddings and tags for lightweight retrieval
- use AI for grounded responses
- add strong fallback behavior when AI is unavailable

### Analytics changes

- optional later metrics:
  - chatbot usage count
  - topic categories asked
  - planner-help vs concept-help usage split

### Admin panel changes if relevant

- not required for first release

## Cross-Feature Implementation Rule

These features should share existing foundations instead of forking them:

- profile data -> onboarding, roadmap, planner, chat
- `topic_masteries` -> roadmap, planner, dashboard, chat
- `revision_schedules` -> planner and dashboard
- `questions` -> adaptive quiz, PYQ browser, chat grounding
- `quiz_attempts` -> result pages, analytics, dashboard, activity logging

