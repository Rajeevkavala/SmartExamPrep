# AI / ML Validation Plan

This document is for validating whether SmartExamPrep is genuinely useful, not just AI-branded.

## Components To Validate

- Weakness detection: `backend/ml/weakness_detector.py`
- Adaptive recommendation: `backend/ml/adaptive_recommender.py`
- Spaced revision scheduling: `backend/ml/spaced_revision.py`
- AI explanation and parsing: `backend/services/ai_service.py`

## Validation Questions

1. Does weakness scoring rank topics in the order a human mentor would expect?
2. Do adaptive quizzes actually target weak and stale topics instead of random ones?
3. Does revision spacing react sensibly to low versus high scores?
4. Are AI explanations specific, student-friendly, and fact-grounded in available stats?

## Test Scenarios

| ID | Component | Scenario | Expected Output |
| --- | --- | --- | --- |
| AI-01 | Weakness Detector | High accuracy, low repeated mistakes, stable trend | Low weakness score, mastery `Strong` |
| AI-02 | Weakness Detector | Low accuracy, repeated mistakes, slow responses | High weakness score, mastery `Weak` |
| AI-03 | Weakness Detector | Same accuracy but worse hard-question performance | Higher weakness than easy-only profile |
| AI-04 | Adaptive Recommender | User has 3 clearly weak topics | Majority of recommendations come from top weak topics |
| AI-05 | Adaptive Recommender | Recently attempted questions in last 7 days | Near-duplicate or very recent questions are filtered out |
| AI-06 | Adaptive Recommender | No mastery history | System falls back to diagnostic-style questions |
| AI-07 | Spaced Revision | Score below 40% | Next revision scheduled soon, interval stays short |
| AI-08 | Spaced Revision | Score above 85% repeatedly | Interval expands and ease factor grows gradually |
| AI-09 | AI Explanation | Weak topic with low accuracy and repeated mistakes | Explanation names likely sub-areas and one next step |
| AI-10 | AI Failure | Missing provider key or runtime failure | Product shows fallback explanation instead of crashing |

## Edge Case Checks

- No topic mastery records exist.
- Attempt has malformed or partial answer JSON.
- Candidate question pool is very small.
- Embeddings are empty or duplicate-heavy.
- AI returns empty text.
- AI returns invalid JSON for scraper or syllabus parsing.
- Question images exist without enough text context.

## Human Review Rubric

Score each AI output on a 1-5 scale:

- Relevance: does it focus on the right topic/problem?
- Specificity: does it avoid vague “study more” advice?
- Actionability: does it tell the student what to do next?
- Consistency: does the same input produce similar quality repeatedly?
- Trustworthiness: does it avoid invented facts and unsupported claims?

## Acceptance Rules

- Weakness detector ordering should match human expectation in at least 8/10 curated cases.
- Adaptive recommendations should allocate at least 60% of selected questions to the top 3 weak topics.
- Revision intervals must monotonically improve with stronger performance in controlled cases.
- AI explanation must be non-empty and grounded in the passed statistics for all smoke cases.

## Validation Harness Idea

Create a lightweight scripted harness with deterministic cases:

- Mock weakness feature profiles and assert relative weakness ordering.
- Feed controlled recommendation candidates and assert chosen topics.
- Feed revision scheduler with poor, average, good, and excellent scores.
- Verify fallback behavior when provider keys are missing.

Current repo helper:

```bash
python backend/run_ai_validation.py
```

## Practical Recommendation

- Run model validation every time the weakness formula or recommendation weights change.
- Save 10 hand-curated “expected good behavior” cases in version control.
- Treat the AI as valid only if it consistently improves action selection, not just if it produces text.
