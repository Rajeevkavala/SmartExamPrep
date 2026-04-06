# Analytics And Learning Metrics

SmartExamPrep should report metrics that are actually useful for the student, for the demo, and for research claims.

## Implemented Metric Endpoint

- `GET /api/analysis/metrics`

This endpoint now returns:

- `total_quizzes_attempted`
- `total_questions_solved`
- `average_accuracy_pct`
- `strongest_topic`
- `weakest_topic`
- `readiness_score_current`
- `readiness_score_delta_pct`
- `readiness_score_trend`
- `revision_completion_rate_pct`
- `topic_recovery_pct`
- `diagnostic_baseline_score_pct`
- `adaptive_average_score_pct`
- `adaptive_improvement_pct`

## Metric Definitions

### Total Quizzes Attempted

- Definition: count of `quiz_attempts` rows for the student.
- Formula: `COUNT(quiz_attempts where user_id = current_user)`

### Total Questions Solved

- Definition: total number of submitted question answers across all attempts.
- Formula: `SUM(quiz_attempt.total_questions)`

### Average Accuracy

- Definition: average attempt score in percent.
- Formula: `AVG(quiz_attempt.score)`

### Strongest Topic

- Definition: topic with the lowest weakness score and high accuracy.
- Data source: `topic_masteries`

### Weakest Topic

- Definition: topic with the highest weakness score.
- Data source: `topic_masteries`

### Readiness Score

- Definition: overall current preparedness proxy from topic weakness values.
- Formula: `mean(100 - weakness_score)` across available topics

### Readiness Score Trend

- Definition: time-ordered readiness after recent attempts.
- Data source: `quiz_attempts.result_snapshot.readiness_after`

### Revision Completion Rate

- Definition: fraction of revision schedule items completed.
- Formula: `completed_revision_items / total_revision_items * 100`

### Topic Recovery Percentage

- Definition: share of comparable topic snapshots where weakness decreases after a quiz.
- Formula: `improved_topic_comparisons / total_comparable_topic_comparisons * 100`

## Dashboard Metric Ideas

- Student-facing cards:
  - Total quizzes attempted
  - Total questions solved
  - Current readiness score
  - Weakest topic
- Student-facing trend:
  - Readiness score trend over recent attempts
- Research-facing export:
  - Baseline diagnostic score
  - Adaptive average score
  - Improvement delta
  - Revision completion rate

## Data Model Guidance

The important new implementation detail is the stored `QuizAttempt.result_snapshot`.

Use it to persist:

- `topic_scores`
- `topic_comparisons`
- `readiness_before`
- `readiness_after`
- `submitted_at`

This is better than relying only on frontend state because:

- result pages can reload safely
- readiness trend becomes reportable
- adaptive improvement becomes easier to compute
- research exports become durable

## Next Useful Additions

- Add admin analytics page consuming `/api/analysis/metrics` for a selected student.
- Export metrics CSV for research/reporting.
- Add date filters for weekly versus all-time analytics.
