# Research Evaluation Mode

This project can now be framed as a measurable educational research prototype instead of only a student web app.

## Main Research Questions

1. Does baseline diagnostic analysis identify meaningful weak areas?
2. Do adaptive quizzes improve topic-level performance over time?
3. Does spaced revision improve topic recovery and retention?
4. Does the readiness score move upward with continued usage?

## Metrics To Track

- Diagnostic baseline score
- Adaptive quiz improvement
- Topic recovery percentage
- Revision compliance rate
- Readiness score improvement

## Definitions And Formulas

### Diagnostic Baseline Score

- Definition: first diagnostic quiz score for a student.
- Formula: first `quiz_attempt.score` where `quiz_type = diagnostic`

### Adaptive Quiz Improvement

- Definition: adaptive average minus diagnostic baseline.
- Formula: `AVG(adaptive_scores) - diagnostic_baseline_score`

### Topic Recovery

- Definition: percentage of before/after topic comparisons where weakness decreases.
- Formula: `improved_topic_comparisons / comparable_topic_comparisons * 100`

### Revision Compliance

- Definition: share of revision items marked done.
- Formula: `completed_revision_items / total_revision_items * 100`

### Readiness Improvement

- Definition: current readiness minus earliest recorded readiness snapshot.
- Formula: `current_readiness_score - first_readiness_score`

## How To Track In The Current System

- Quiz attempts already store `quiz_type`, score, answers, and now `result_snapshot`.
- Topic comparisons inside `result_snapshot` support before/after change analysis.
- Revision schedules support completion tracking.
- Topic masteries support current state analysis.
- Feedback submissions can be joined later to compare objective improvement with subjective usefulness.

## Before vs After Comparison Plan

For each student:

1. Capture the first diagnostic attempt as baseline.
2. Track the next 2 to 5 adaptive attempts.
3. Track revision completion during the same period.
4. Compute readiness and topic recovery change after each attempt.
5. Compare pre-use versus post-use metrics.

## Suggested Evaluation Table

| Student | Baseline Diagnostic | Avg Adaptive | Improvement | Revision Compliance | Topic Recovery | Current Readiness |
| --- | --- | --- | --- | --- | --- | --- |
| Persona A | 38.0 | 55.0 | +17.0 | 66.7% | 50.0% | 52.0 |

## Minimum Viable Study Design

- Participants: 5 to 20 students
- Duration: 1 to 2 weeks
- Inputs: one baseline diagnostic, repeated adaptive usage, revision interactions
- Outputs: score delta, topic recovery, readiness delta, feedback scores

## Claim You Can Defend

Avoid claiming “AI teaches students better than all alternatives.”

Prefer:

- “The system identifies weak topics and tracks measurable improvement over repeated adaptive practice.”
- “Students showed positive change in readiness score, adaptive performance, and topic recovery over the usage window.”

## Threats To Validity

- Small dataset or too few verified questions
- Practice effect from repeated exposure
- Self-selection bias in motivated users
- AI explanation quality varying by prompt or content quality
