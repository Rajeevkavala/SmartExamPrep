# Phase 4 Manual Testing Guide

## Scope

Validate the ML intelligence layer end-to-end:

- Weakness detection formula and ML model
- Adaptive quiz recommendation engine
- Spaced revision scheduler (SM-2)
- NLP pipeline (tagging, embeddings, similarity)
- AI explanation generation (AI integration)
- Integration with quiz submission flow

## Prerequisites

1. Backend dependencies installed in repo venv:
   ```powershell
   cd "d:\New folder (2)\SmartExamPrep"
   .\.venv\Scripts\pip.exe install -r backend/requirements.txt
   .\.venv\Scripts\pip.exe install -r ml/requirements.txt
   ```

2. ML model trained and exported:
   ```powershell
   cd ml
   ..\..\.venv\Scripts\python.exe generate_synthetic_data.py
   ..\..\.venv\Scripts\python.exe train_weakness_model.py
   ..\..\.venv\Scripts\python.exe export_model.py
   ```

3. Database seeded with baseline content:
   ```powershell
   cd backend
   ..\.venv\Scripts\python.exe seed.py
   ```

4. Frontend dependencies installed.

5. (Optional) AI API key configured for AI explanations:
   ```
   OPENROUTER_API_KEY / GROQ_API_KEY=your_api_key_here
   ```

---

## Automated Checks

Run these before manual QA:

### Unit Tests

```powershell
cd "d:\New folder (2)\SmartExamPrep\backend"
$env:PYTHONPATH = "d:\New folder (2)\SmartExamPrep\backend"
..\.venv\Scripts\python.exe -m pytest tests/test_phase4_ml_components.py -v
```

Expected: All tests pass (50+ tests covering formula, ML, scheduler, recommender, NLP).

### ML Model Evaluation

```powershell
cd "d:\New folder (2)\SmartExamPrep\ml"
..\.venv\Scripts\python.exe model_evaluation.py
```

Expected output:
- MAE < 5.0 points
- RÂ² > 0.95
- Classification accuracy > 90% for all buckets (Weak/Moderate/Strong)

---

## Manual Testing Flow

### 1. Verify ML Model Loading at Startup

**Steps:**
1. Start the backend server:
   ```powershell
   cd backend
   ..\.venv\Scripts\python.exe -m uvicorn main:app --reload
   ```
2. Check startup logs.

**Expected:**
- Log shows: `[ok] NLP models loaded (spaCy + sentence-transformers)`
- Log shows: `[ok] WeaknessDetector loaded`
- No errors about missing model files

---

### 2. Weakness Detection Formula Test

**Steps:**
1. Register a new student and complete onboarding.
2. Take a diagnostic quiz with intentionally poor performance (20% correct).
3. Check weakness analysis endpoint:
   ```bash
   curl -X GET http://localhost:8000/api/analysis/weakness \
     -H "Authorization: Bearer <token>"
   ```

**Expected:**
- `weakness_score` > 60 for topics with poor performance
- `mastery_level` = "Weak" for those topics
- Response includes `topic_id`, `topic_name`, `subject_name`, `accuracy`

**Edge Cases to Test:**
- [ ] New user with no quiz history â†’ should return empty or default values
- [ ] Perfect quiz (100% correct) â†’ `weakness_score` â‰¤ 30, `mastery_level` = "Strong"
- [ ] Mixed performance â†’ appropriate moderate scores

---

### 3. Weakness Score Calculation Verification

**Scenario A: Perfect Performance**
- Accuracy: 100%
- Expected `weakness_score`: 0

**Scenario B: Zero Accuracy**
- Accuracy: 0%
- Expected `weakness_score`: 40 (from accuracy component alone)

**Scenario C: Repeated Mistakes**
1. Answer the same question wrong 3+ times across multiple quizzes.
2. Check weakness analysis.
3. Expected: Higher `weakness_score` due to `repeated_mistakes` component.

**Scenario D: Slow Response Times**
1. Take quiz with response times > 60 seconds per question.
2. Expected: Higher `weakness_score` due to `avg_response_time_zscore` component.

**Scenario E: Declining Performance**
1. Take multiple quizzes with declining scores (80% â†’ 60% â†’ 40%).
2. Expected: Higher `weakness_score` due to negative `recent_performance_slope`.

---

### 4. Adaptive Quiz Recommendation Test

**Steps:**
1. Complete multiple quizzes to establish mastery data.
2. Request adaptive quiz:
   ```bash
   curl -X GET http://localhost:8000/api/quiz/adaptive \
     -H "Authorization: Bearer <token>"
   ```

**Expected:**
- Returns 5-10 questions
- Questions prioritize weak topics (highest `weakness_score`)
- Difficulty progression: easy â†’ medium â†’ hard
- No duplicate questions from last 7 days (similarity > 0.85)
- Questions include `question_image_urls` when available

**Edge Cases to Test:**
- [ ] New user with no mastery data â†’ falls back to diagnostic questions
- [ ] User with all strong topics â†’ still returns some questions
- [ ] Very short study time (10 min) â†’ returns minimum 5 questions
- [ ] Long study time (120 min) â†’ returns maximum 10 questions

---

### 5. Spaced Revision Schedule Test

**Steps:**
1. Take a quiz on a specific topic.
2. Check revision schedule:
   ```bash
   curl -X GET http://localhost:8000/api/revision/plan \
     -H "Authorization: Bearer <token>"
   ```

**Expected Based on Quiz Score:**

| Score | Expected Interval |
|-------|-------------------|
| < 40% | 1 day |
| 40-65% | 3 days |
| 65-85% | 7 days |
| > 85% | 14 days |

**Difficulty Weight Test:**
1. Take quiz on a topic with `difficulty_weight` = 1.5.
2. Expected: Interval scaled by 1.5x (e.g., 7 days â†’ 11 days).

**SM-2 Progression Test:**
1. Take the same topic quiz 3+ times with good scores (> 65%).
2. Expected: Intervals grow using ease factor multiplication.

---

### 6. NLP Pipeline Test

**Tag Extraction Test:**
1. Add a question via admin:
   ```
   Text: "What is the time complexity of Dijkstra's algorithm using a binary heap?"
   ```
2. Check that tags include: `dijkstra`, `heap`, `algorithm`

**Semantic Deduplication Test:**
1. Add two similar questions:
   - Q1: "Explain the working of a mutex in operating systems"
   - Q2: "Describe how a mutex works in OS"
2. Request adaptive quiz.
3. Expected: Only one of the two appears (similarity > 0.85 blocks the other).

**Image-Based Question Test:**
1. Add a question with `question_image_urls`.
2. Expected: Image URLs preserved in quiz responses.

---

### 7. Quiz Submission Integration Test

**Steps:**
1. Take adaptive quiz.
2. Submit answers.
3. Check response.

**Expected Response Includes:**
- `attempt_id`: UUID of the quiz attempt
- `score`: percentage correct
- `topic_scores`: breakdown by topic
- `topic_comparisons`: before/after weakness for each topic
- `readiness_before` and `readiness_after`: overall readiness scores

**Post-Submission Verification:**
1. Call `/api/analysis/weakness` again.
2. Expected: `weakness_score` and `mastery_level` updated for attempted topics.
3. Call `/api/revision/plan`.
4. Expected: New revision schedules created based on performance.

---

### 8. Dashboard Integration Test

**Steps:**
1. Navigate to `/dashboard` after completing quizzes.

**Expected:**
- Weakness chart shows topic breakdown
- Readiness score reflects overall mastery
- Recent activity log includes quiz submissions
- Study time metrics are accurate

---

### 9. AI Explanation Test (AI Integration)

**Steps:**
1. Have at least one topic with quiz data.
2. Call the explain endpoint:
   ```bash
   curl -X POST http://localhost:8000/api/ai/explain \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"topic_id": "<topic_uuid>"}'
   ```

**Expected Response:**
```json
{
  "topic_name": "CPU Scheduling",
  "explanation": "Based on your accuracy of 42%..."
}
```

**Edge Cases:**
- [ ] No mastery data for topic â†’ returns "No data available for this topic yet."
- [ ] AI API unavailable â†’ returns fallback explanation based on mastery level
- [ ] Repeated mistakes count is included in the prompt

**Verify Repeated Mistakes:**
1. Answer the same question wrong 3 times across quizzes.
2. Call `/api/ai/explain` for that topic.
3. Expected: Explanation mentions repeated mistakes.

---

### 10. ML Model Mode Toggle Test

**Formula Mode (Default):**
1. Ensure `WeaknessDetector(use_ml_model=False)` is used.
2. Take quiz and verify weakness calculations.

**ML Model Mode:**
1. Modify `backend/services/weakness_service.py`:
   ```python
   detector = WeaknessDetector(use_ml_model=True)
   ```
2. Restart backend.
3. Take quiz and verify:
   - Model loads from `backend/ml/models/weakness_model.pkl`
   - Predictions are similar to formula (within ~5 points)

---

## API Contract Reference

### GET /api/analysis/weakness

```json
[
  {
    "topic_id": "uuid",
    "topic_name": "Binary Trees",
    "subject_name": "Data Structures",
    "weakness_score": 65.5,
    "mastery_level": "Weak",
    "accuracy": 0.35,
    "total_attempts": 20
  }
]
```

### GET /api/quiz/adaptive

```json
{
  "questions": [
    {
      "id": "uuid",
      "question_text": "What is the time complexity of BST insertion?",
      "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
      "question_image_urls": [],
      "difficulty": "medium",
      "subject_name": "Data Structures",
      "topic_name": "Binary Search Trees"
    }
  ],
  "total": 10
}
```

### GET /api/revision/plan

```json
{
  "revision_items": [
    {
      "schedule_id": "uuid",
      "topic_id": "uuid",
      "topic_name": "Binary Trees",
      "subject_name": "Data Structures",
      "due_date": "2026-04-06T00:00:00",
      "interval_days": 3,
      "last_score_pct": 55.0
    }
  ]
}
```

---

## Troubleshooting

### Model Not Loading

**Symptom:** `[warning] ML model not found` in startup logs.

**Solution:**
```powershell
cd ml
..\..\.venv\Scripts\python.exe train_weakness_model.py
..\..\.venv\Scripts\python.exe export_model.py
```

### NLP Models Not Loading

**Symptom:** `RuntimeError: NLP model not loaded` errors.

**Solution:**
```powershell
.\.venv\Scripts\pip.exe install spacy sentence-transformers
.\.venv\Scripts\python.exe -m spacy download en_core_web_sm
```

### Incorrect Weakness Scores

**Symptom:** Weakness scores don't match expected values.

**Debug:**
1. Check `TopicMastery` table for raw accuracy values.
2. Verify `WeaknessFeatures` extraction:
   - `accuracy` from cumulative stats
   - `repeated_mistakes` from answer history
   - `avg_response_time_zscore` calculation
   - `recent_performance_slope` from last 5 attempts

### Adaptive Quiz Returns Empty

**Symptom:** `/api/quiz/adaptive` returns `{"questions": [], "total": 0}`.

**Check:**
1. User has mastery data in `topic_mastery` table.
2. Verified questions exist in `questions` table.
3. Questions match user's top 5 weak topics.

---

## Performance Benchmarks

| Operation | Expected Latency |
|-----------|------------------|
| Weakness calculation (formula) | < 10ms |
| Weakness calculation (ML model) | < 50ms |
| Adaptive quiz recommendation | < 500ms |
| Embedding generation | < 100ms per question |
| Tag extraction | < 20ms per question |

---

## Test Verification Results (Automated)

Last verified: Phase 4 ML Components - ALL TESTS PASSED

| Component | Status | Notes |
|-----------|--------|-------|
| WeaknessDetector (formula) | PASS | Perfect/Good/Moderate/Struggling scenarios verified |
| WeaknessDetector (ML model) | PASS | Model loaded, predictions within 0.04 of formula |
| SpacedRevisionScheduler | PASS | 1/3/7/14 day intervals for poor/avg/good/excellent |
| NLP Pipeline | PASS | 384-dim embeddings, tag extraction working |
| AdaptiveRecommender | PASS | Recency factors 0.2/0.7/1.0/1.5 verified |

### Mastery Level Thresholds (Verified)

| Score Range | Mastery Level |
|-------------|---------------|
| 0-30 | Strong |
| 31-60 | Moderate |
| 61-100 | Weak |

---

## Sign-Off Checklist

- [ ] All unit tests pass
- [ ] ML model evaluation metrics meet thresholds
- [ ] Weakness detection works for all scenarios
- [ ] Adaptive quiz prioritizes weak topics
- [ ] Spaced revision intervals match SM-2 formula
- [ ] NLP deduplication prevents similar questions
- [ ] Quiz submission updates mastery and schedules
- [ ] Dashboard reflects ML insights correctly
- [ ] AI explanation endpoint working with AI
- [ ] Repeated mistakes count calculated correctly
- [ ] No errors in server logs during testing
- [ ] Performance benchmarks met

