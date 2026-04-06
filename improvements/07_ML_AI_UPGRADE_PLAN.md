# ML / AI Upgrade Plan

## Current ML / AI Position

SmartExamPrep already has real ML integration, but it is concentrated around quiz adaptation and explanation:

- weakness scoring
- adaptive question selection
- spaced revision scheduling
- NLP tagging and embeddings
- AI explanation/parsing

That means roadmap, planner, and chatbot work should be built by orchestrating these signals, not by inventing a separate AI subsystem.

## How Existing ML Logic Should Support The New Features

## 1. Weakness detector -> roadmap prioritization

### Current asset

- `backend/ml/weakness_detector.py`
- `backend/services/weakness_service.py`
- `topic_masteries.weakness_score`

### How to use it

- Feed current weakness scores into roadmap generation.
- Prioritize weak/high-importance topics earlier in the roadmap.
- Reduce priority for topics explicitly marked â€œalready knownâ€ during onboarding.

### Recommended rule

Use a composite topic-priority score such as:

```text
priority = weighted(
  measured_weakness_score,
  onboarding_subject_confidence_inverse,
  topic_difficulty_weight,
  time_to_exam_urgency,
  whether_topic_is_already_known
)
```

AI should not compute this score. It should only explain it.

## 2. Adaptive recommender -> planner practice targets

### Current asset

- `backend/ml/adaptive_recommender.py`
- `backend/services/recommendation_service.py`

### How to use it

- Reuse candidate-selection logic to fill daily practice tasks with high-value questions.
- Keep using:
  - weakness
  - recency
  - duplicate filtering
  - time-budget sizing

### Recommended extension

Refactor the recommender service so it can return:

- either a full quiz payload for `/api/quiz/adaptive`
- or a smaller list of recommended question IDs for planner tasks

This avoids duplicating candidate logic in the planner layer.

## 3. Spaced revision -> planner revision block

### Current asset

- `backend/ml/spaced_revision.py`
- `revision_schedules`

### How to use it

- Keep `RevisionSchedule` as the source of truth for when revision is due.
- Planner generation should treat due revision rows as mandatory daily tasks before optional practice expansion.

### Recommendation

Do not replace the spaced revision logic. Instead:

- keep generating revision schedules from quiz results
- pull due schedules into `daily_study_tasks`

## 4. NLP tagging and embeddings -> PYQ and chatbot grounding

### Current asset

- `backend/ml/nlp_pipeline.py`

### How to use it

- Use keyword tags to support:
  - PYQ search boosting
  - topic-aware chat context selection
- Use embeddings for:
  - lightweight retrieval of similar question text
  - weak-topic concept examples
  - duplicate avoidance in planner-selected practice

### Important practical note

The codebase does not have a vector database. Do not add one in the first upgrade wave. Use the current embedding helper on-demand for a bounded candidate set.

## Rule-Based vs AI-Based Responsibilities

## Keep rule-based

- roadmap structure generation
- week sequencing
- planner carry-forward logic
- task quotas
- streak calculation
- hours-studied calculation
- dashboard KPIs
- PYQ filtering and sorting

These must be deterministic, testable, and explainable.

## Let AI assist

- explain why a topic is prioritized
- explain how to study a weak topic
- summarize a roadmap week in student-friendly language
- answer conceptual questions
- suggest how to rebalance a plan after missed days
- provide study coaching around stored state

These are high-value explanation/synthesis tasks, not core scheduling logic.

## Roadmap Generator Strategy

## Recommended architecture

1. deterministic roadmap builder computes week/topic allocations
2. optional AI summarizer writes:
   - roadmap overview
   - monthly theme blurbs
   - week rationale text

## Why this is right for this repo

The repo already has reliable quantitative state:

- weakness score
- revision state
- topic weights
- study-time target

That makes a rule-based planner more trustworthy than free-form AI generation.

## Daily Planner Strategy

## Inputs

- todayâ€™s available minutes from `daily_study_minutes`
- active roadmap week allocations
- due revision items
- carry-forward tasks
- top weak topics

## Assembly logic

1. place due revision tasks first
2. place roadmap learning tasks second
3. fill remaining capacity with practice targets from recommender logic
4. if capacity remains, add PYQ or reinforcement tasks for same topics

## Optional AI role

AI can generate the student-facing â€œwhy today looks like thisâ€ paragraph, but not the actual task list.

## Chatbot Grounding Strategy

## Build a context pack from existing data

For each chat turn, assemble a compact grounding packet from:

- user profile:
  - daily study minutes
  - experience level
  - exam target date
- current weak topics from `topic_masteries`
- due revisions from `revision_schedules`
- active roadmap summary
- todayâ€™s planner tasks
- optionally matched question/topic snippets

## Response modes

Use lightweight intent routing:

- `concept_help`
- `roadmap_help`
- `planner_help`
- `weak_topic_help`
- `pyq_help`
- `general_study_help`

Each mode should use a different prompt template but the same grounding builder.

## AI Changes Needed

## 1. Split prompt responsibilities inside `ai_service.py`

Current file mixes explanation, scraper classification, and syllabus parsing. Add dedicated functions for:

- `generate_roadmap_summary(...)`
- `generate_daily_plan_explanation(...)`
- `generate_chat_response(...)`

If the file becomes too crowded, keep AI client initialization in `ai_service.py` and move prompt orchestration into `study_chat_service.py` and `roadmap_service.py`.

## 2. Keep fallback behavior explicit

Current weak-topic explanation already has a fallback path. The same pattern should be reused for:

- roadmap explanation
- planner explanation
- chat response when AI is unavailable

Fallbacks should be useful, not empty:

- for roadmap: return deterministic summary text
- for planner: return deterministic summary text
- for chat: return a grounded template response or â€œI can still summarize your current plan, but live AI answers are unavailableâ€

## 3. Enforce structured AI outputs where needed

Use structured JSON outputs for:

- roadmap explanation blocks if they must map cleanly to UI sections
- chat citations/grounding metadata if the UI will expose â€œwhy this answer was givenâ€

## What Should Not Be Done Right Now

- Do not add a vector database.
- Do not make AI responsible for topic sequencing.
- Do not retrain the weakness model for roadmap generation before the planner exists.
- Do not add open-ended web search to the chatbot.

## How Existing Offline ML Scripts Still Fit

### `ml/generate_synthetic_data.py`

- still useful for validating weakness model behavior

### `ml/train_weakness_model.py`

- still useful if the project later decides to reweight weakness estimation

### `ml/model_evaluation.py`

- should remain the evaluation checkpoint for model changes

### `ml/export_model.py`

- remains the bridge from offline training to runtime inference

These scripts do not need to change for roadmap/planner/chatbot delivery in the first pass.

## Key ML / AI Risks

### 1. Overusing AI where rules are enough

This would make roadmap/planner behavior harder to test and harder to trust.

### 2. Slow request-time embedding work

Adaptive recommendation already embeds candidate questions on demand. Planner and chatbot retrieval must keep candidate sets bounded or latency will grow with content volume.

### 3. Weak content pool quality

ML logic is structurally sound, but the question inventory is still thin. Chatbot and planner suggestions will feel better once verified question breadth increases.

## Recommended ML / AI Principle

Use ML to rank and filter. Use AI to explain and tutor. Keep planning logic deterministic.

