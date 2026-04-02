# PHASE 4 — ML MODEL DESIGN

> **Goal:** Design the complete ML + NLP intelligence layer — Weakness Detector, Adaptive Recommender, Spaced Revision Scheduler, and NLP Pipeline — with full Python implementations.

---

## A) Weakness Detection ML Model

### Feature Engineering

| Feature | Description | Range |
|---|---|---|
| `accuracy` | Correct / Total attempts for this topic | 0.0 – 1.0 |
| `repeated_mistakes` | Count of questions answered wrong 2+ times | 0 – N |
| `avg_response_time_zscore` | Z-score of avg answer time vs all users | -3 – +3 |
| `recent_performance_slope` | Linear slope of last 5 attempt scores | -1.0 – +1.0 |
| `difficulty_sensitivity` | Error rate delta: hard_error_rate – easy_error_rate | 0.0 – 1.0 |

### Weakness Formula (MVP)

```
weakness_score = clip(
  w1 * (1 - accuracy) * 100
  + w2 * min(repeated_mistakes, 10) * 5
  + w3 * max(avg_response_time_zscore, 0) * 10
  + w4 * max(-recent_performance_slope, 0) * 50
  + w5 * difficulty_sensitivity * 30,
  0, 100
)

# Calibrated weights (can be replaced by trained regressor)
w1 = 0.40  # Accuracy is most important
w2 = 0.20  # Repeated mistakes signal
w3 = 0.10  # Slow response = uncertainty
w4 = 0.20  # Declining trend is a red flag
w5 = 0.10  # Can't handle hard questions = weak
```

### Thresholds
| Range | Mastery Level |
|---|---|
| 0 – 30 | **Strong** |
| 31 – 60 | **Moderate** |
| 61 – 100 | **Weak** |

### Python Implementation (`backend/ml/weakness_detector.py`)

```python
import numpy as np
import joblib
from pathlib import Path
from dataclasses import dataclass

MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"

@dataclass
class WeaknessFeatures:
    accuracy: float                    # 0–1
    repeated_mistakes: int             # count
    avg_response_time_zscore: float    # z-score
    recent_performance_slope: float    # slope of last 5 scores
    difficulty_sensitivity: float      # error rate delta hard–easy

class WeaknessDetector:
    """
    Computes a weakness score (0–100) per topic per user.
    MVP uses calibrated weighted formula.
    Production upgrade: load XGBoost model from weakness_model.pkl.
    """

    WEIGHTS = {
        "accuracy": 0.40,
        "repeated_mistakes": 0.20,
        "response_time": 0.10,
        "trend": 0.20,
        "difficulty": 0.10
    }

    def __init__(self, use_ml_model: bool = False):
        self.use_ml_model = use_ml_model
        self.model = None
        if use_ml_model and MODEL_PATH.exists():
            self.model = joblib.load(MODEL_PATH)

    def compute(self, features: WeaknessFeatures) -> dict:
        """
        Returns weakness_score (0-100) and mastery_level label.
        """
        if self.use_ml_model and self.model:
            score = self._compute_ml(features)
        else:
            score = self._compute_formula(features)

        score = float(np.clip(score, 0, 100))
        level = self._get_mastery_level(score)
        return {"weakness_score": round(score, 2), "mastery_level": level}

    def _compute_formula(self, f: WeaknessFeatures) -> float:
        w = self.WEIGHTS
        score = (
            w["accuracy"] * (1 - f.accuracy) * 100
            + w["repeated_mistakes"] * min(f.repeated_mistakes, 10) * 5
            + w["response_time"] * max(f.avg_response_time_zscore, 0) * 10
            + w["trend"] * max(-f.recent_performance_slope, 0) * 50
            + w["difficulty"] * f.difficulty_sensitivity * 30
        )
        return score

    def _compute_ml(self, f: WeaknessFeatures) -> float:
        X = np.array([[
            f.accuracy,
            f.repeated_mistakes,
            f.avg_response_time_zscore,
            f.recent_performance_slope,
            f.difficulty_sensitivity
        ]])
        return float(self.model.predict(X)[0])

    @staticmethod
    def _get_mastery_level(score: float) -> str:
        if score <= 30:
            return "Strong"
        elif score <= 60:
            return "Moderate"
        else:
            return "Weak"

    @staticmethod
    def extract_features_from_db(user_id: str, topic_id: str, db) -> WeaknessFeatures:
        """
        Build feature vector from DB records.
        Call after each quiz submission.
        """
        from models.models import QuizAttempt, TopicMastery
        import json

        mastery = db.query(TopicMastery).filter_by(
            user_id=user_id, topic_id=topic_id
        ).first()

        if not mastery:
            return WeaknessFeatures(0.5, 0, 0.0, 0.0, 0.0)

        accuracy = mastery.accuracy

        # Get last 5 quiz attempts — answers JSON filtering for this topic
        attempts = (
            db.query(QuizAttempt)
            .filter_by(user_id=user_id)
            .order_by(QuizAttempt.started_at.desc())
            .limit(10)
            .all()
        )

        topic_scores = []
        response_times = []
        mistake_counts = {}

        for attempt in attempts:
            for ans in attempt.answers:
                if ans.get("topic_id") == topic_id:
                    topic_scores.append(1 if ans["correct"] else 0)
                    response_times.append(ans.get("time_taken_s", 30))
                    if not ans["correct"]:
                        qid = ans["question_id"]
                        mistake_counts[qid] = mistake_counts.get(qid, 0) + 1

        repeated_mistakes = sum(1 for v in mistake_counts.values() if v >= 2)

        # Z-score of response time
        if response_times:
            mean_rt = np.mean(response_times)
            global_mean = 30.0
            global_std = 15.0
            rt_zscore = (mean_rt - global_mean) / global_std
        else:
            rt_zscore = 0.0

        # Recent performance slope (linear regression on last 5 binary scores)
        if len(topic_scores) >= 3:
            x = np.arange(len(topic_scores[-5:]))
            y = np.array(topic_scores[-5:])
            slope = float(np.polyfit(x, y, 1)[0]) if len(x) > 1 else 0.0
        else:
            slope = 0.0

        # Difficulty sensitivity (error rate hard – error rate easy)
        difficulty_sensitivity = 0.0  # Needs difficulty-split attempt data

        return WeaknessFeatures(
            accuracy=accuracy,
            repeated_mistakes=repeated_mistakes,
            avg_response_time_zscore=rt_zscore,
            recent_performance_slope=slope,
            difficulty_sensitivity=difficulty_sensitivity
        )
```

---

## B) Adaptive Quiz Recommendation ML Model

### Algorithm Design

```
Priority Score per Topic:
  priority = weakness_score × (1 - mastery_pct) × recency_factor

  recency_factor:
    - never attempted: 1.5  (boost new topics)
    - attempted today: 0.2  (avoid repeating)
    - attempted this week: 0.7
    - older: 1.0

  mastery_pct = (100 - weakness_score) / 100

Top-K Topics → Select Questions:
  1. Pick top 3 topics by priority score
  2. From each topic: pick 2–4 questions
  3. Filter: avoid questions attempted in last 7 days
  4. NLP filter: if cosine_similarity(new_q, recent_q) > 0.85 → skip
  5. Difficulty progression: start easy → medium → hard
```

### Python Implementation (`backend/ml/adaptive_recommender.py`)

```python
from datetime import datetime, timedelta
import numpy as np
from ml.nlp_pipeline import compute_similarity

class AdaptiveRecommender:
    """
    Recommends 5–10 questions for today's adaptive quiz.
    Prioritizes weak topics, avoids duplicate questions via NLP similarity.
    """

    RECENCY_FACTORS = {
        "today": 0.2,
        "this_week": 0.7,
        "older": 1.0,
        "never": 1.5
    }

    SIMILARITY_THRESHOLD = 0.85  # Block near-duplicate questions
    MAX_QUESTIONS = 10
    MIN_QUESTIONS = 5

    def recommend(
        self,
        topic_masteries: list[dict],
        recent_question_embeddings: list[list[float]],
        candidate_questions: list[dict],
        daily_study_minutes: int = 60
    ) -> list[dict]:
        """
        Args:
            topic_masteries: [{topic_id, topic_name, weakness_score, last_attempted_at}]
            recent_question_embeddings: embeddings of questions done in last 7 days
            candidate_questions: [{id, topic_id, difficulty, question_text, embedding, ...}]
            daily_study_minutes: from user profile
        Returns:
            List of recommended question dicts
        """
        target_count = min(
            self.MAX_QUESTIONS,
            max(self.MIN_QUESTIONS, daily_study_minutes // 6)
        )

        # Step 1: Score topics by priority
        topic_priorities = []
        for tm in topic_masteries:
            ws = tm["weakness_score"]
            mastery_pct = (100 - ws) / 100
            recency = self._recency_factor(tm.get("last_attempted_at"))
            priority = ws * (1 - mastery_pct) * recency
            topic_priorities.append({
                "topic_id": tm["topic_id"],
                "priority": priority,
                "weakness_score": ws
            })

        topic_priorities.sort(key=lambda x: x["priority"], reverse=True)
        top_topics = [t["topic_id"] for t in topic_priorities[:3]]

        # Step 2: Filter candidate questions
        filtered = [q for q in candidate_questions if q["topic_id"] in top_topics]

        # Step 3: Sort by difficulty progression
        difficulty_order = {"easy": 0, "medium": 1, "hard": 2}
        filtered.sort(key=lambda q: difficulty_order.get(q["difficulty"], 1))

        # Step 4: NLP deduplication + selection
        selected = []
        for q in filtered:
            if len(selected) >= target_count:
                break
            if self._is_duplicate(q.get("embedding", []), recent_question_embeddings):
                continue
            selected.append(q)

        return selected

    def _recency_factor(self, last_attempted_at) -> float:
        if not last_attempted_at:
            return self.RECENCY_FACTORS["never"]
        now = datetime.utcnow()
        delta = now - last_attempted_at
        if delta.days == 0:
            return self.RECENCY_FACTORS["today"]
        elif delta.days <= 7:
            return self.RECENCY_FACTORS["this_week"]
        return self.RECENCY_FACTORS["older"]

    def _is_duplicate(
        self,
        candidate_embedding: list[float],
        recent_embeddings: list[list[float]]
    ) -> bool:
        if not candidate_embedding or not recent_embeddings:
            return False
        for emb in recent_embeddings:
            if compute_similarity(candidate_embedding, emb) >= self.SIMILARITY_THRESHOLD:
                return True
        return False
```

---

## C) Spaced Revision Scheduler

### Modified SM-2 Algorithm

```
Base interval from last score:
  score < 40%  → 1 day
  score 40–65% → 3 days
  score 65–85% → 7 days
  score > 85%  → 14 days

Adjust for topic difficulty_weight:
  interval = base_interval × topic_difficulty_weight

  (e.g., Turing Machines: weight=1.5 → intervals scaled up 50%)

Update ease_factor (SM-2):
  ease_factor = max(1.3, ease_factor + 0.1 - (1 - score/100) × 0.8)

Next repetition multiplier:
  interval = previous_interval × ease_factor  (for repeated good performance)
```

### Python Implementation (`backend/ml/spaced_revision.py`)

```python
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class RevisionInput:
    topic_id: str
    last_score_pct: float        # 0–100
    previous_interval_days: int
    ease_factor: float           # SM-2 ease factor (default 2.5)
    repetition_count: int
    topic_difficulty_weight: float  # from Topic model

class SpacedRevisionScheduler:
    """
    Modified SM-2 spaced repetition scheduler.
    Calculates next revision date based on quiz performance.
    """

    BASE_INTERVALS = {
        "poor": 1,        # score < 40%
        "average": 3,     # 40–65%
        "good": 7,        # 65–85%
        "excellent": 14   # > 85%
    }

    def schedule(self, inp: RevisionInput) -> dict:
        """
        Returns: {
            next_revision_date, interval_days, ease_factor, repetition_count
        }
        """
        score = inp.last_score_pct
        base = self._base_interval(score)

        # Adjust for topic difficulty
        adjusted = base * inp.topic_difficulty_weight

        # SM-2 ease factor update
        new_ease = self._update_ease_factor(inp.ease_factor, score)

        # Multiply by ease for repeated good performance
        if inp.repetition_count >= 2 and score >= 65:
            adjusted = inp.previous_interval_days * new_ease

        interval_days = max(1, round(adjusted))
        next_date = datetime.utcnow() + timedelta(days=interval_days)

        return {
            "due_date": next_date,
            "interval_days": interval_days,
            "ease_factor": round(new_ease, 2),
            "repetition_count": inp.repetition_count + 1
        }

    def _base_interval(self, score: float) -> int:
        if score < 40:
            return self.BASE_INTERVALS["poor"]
        elif score < 65:
            return self.BASE_INTERVALS["average"]
        elif score < 85:
            return self.BASE_INTERVALS["good"]
        return self.BASE_INTERVALS["excellent"]

    @staticmethod
    def _update_ease_factor(current_ef: float, score: float) -> float:
        """SM-2 ease factor update formula. Minimum 1.3."""
        quality = score / 25  # Map 0-100 → 0-4 quality scale
        new_ef = current_ef + 0.1 - (4 - quality) * (0.08 + (4 - quality) * 0.02)
        return max(1.3, new_ef)
```

---

## D) NLP Pipeline

### Complete Implementation (`backend/ml/nlp_pipeline.py`)

```python
import spacy
import numpy as np
from sentence_transformers import SentenceTransformer
from functools import lru_cache
from typing import Optional

# Load models once at module level (cached for FastAPI startup)
_nlp: Optional[spacy.Language] = None
_embedder: Optional[SentenceTransformer] = None

GATE_DOMAIN_TERMS = {
    "process", "thread", "semaphore", "mutex", "deadlock", "paging",
    "scheduling", "cache", "TCP", "UDP", "SQL", "normalization", "BFS",
    "DFS", "heap", "BST", "DP", "NP", "automata", "grammar", "flip-flop",
    "pipeline", "interrupt", "DMA", "recursion", "pointer", "FCFS", "SJF",
    "BCNF", "3NF", "Kruskal", "Dijkstra", "LCS", "LIS", "knapsack",
    "Turing", "PDA", "DFA", "NFA", "CFG", "RISC", "CISC", "IEEE", "ALU"
}

def load_nlp_models():
    """Call during FastAPI lifespan startup."""
    global _nlp, _embedder
    _nlp = spacy.load("en_core_web_sm")
    _embedder = SentenceTransformer("all-MiniLM-L6-v2")

def get_nlp() -> spacy.Language:
    if _nlp is None:
        raise RuntimeError("NLP model not loaded. Call load_nlp_models() at startup.")
    return _nlp

def get_embedder() -> SentenceTransformer:
    if _embedder is None:
        raise RuntimeError("Embedder not loaded. Call load_nlp_models() at startup.")
    return _embedder

# ─── Tag Extraction ───────────────────────────────────────────────────────────

def extract_tags(text: str) -> list[str]:
    """
    Extract GATE CSE keyword tags from question text.
    Uses spaCy noun chunks + domain vocabulary matching.
    """
    doc = get_nlp()(text.lower())
    tags = set()

    # Noun chunks from spaCy parse
    for chunk in doc.noun_chunks:
        phrase = chunk.text.strip()
        if 2 < len(phrase) < 40:
            tags.add(phrase)

    # Domain term matching
    for term in GATE_DOMAIN_TERMS:
        if term.lower() in text.lower():
            tags.add(term)

    return list(tags)[:12]

# ─── Semantic Embedding ───────────────────────────────────────────────────────

def embed_text(text: str) -> list[float]:
    """Generate sentence embedding for a question."""
    vec = get_embedder().encode(text, convert_to_numpy=True)
    return vec.tolist()

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    va = np.array(a)
    vb = np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0

def is_near_duplicate(
    candidate_embedding: list[float],
    existing_embeddings: list[list[float]],
    threshold: float = 0.85
) -> bool:
    """Check if a question is semantically too similar to existing ones."""
    return any(
        cosine_similarity(candidate_embedding, e) >= threshold
        for e in existing_embeddings
    )

# ─── Weakness Explanation Builder ─────────────────────────────────────────────

def build_weakness_prompt(
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    accuracy: float,
    repeated_mistakes: int,
    avg_response_time_s: float
) -> str:
    """
    Builds a safe, structured prompt for Gemini to generate
    human-readable weakness explanation.
    """
    return f"""
You are a GATE CSE exam coach. A student has these statistics for {topic_name} ({subject_name}):
- Weakness Score: {weakness_score:.0f}/100 (higher = weaker)
- Accuracy: {accuracy * 100:.1f}%
- Repeated Mistakes: {repeated_mistakes} questions answered wrong multiple times
- Average Response Time: {avg_response_time_s:.0f} seconds per question

Write a 2–3 sentence personalized insight for the student explaining:
1. Why they are struggling in this topic
2. What specific sub-areas to focus on
3. One actionable next step

Use encouraging, student-friendly language. Be specific. Do NOT make up statistics not given above.
Output plain text only, no markdown.
""".strip()
```

---

## E) FastAPI Service Wrappers

### `backend/services/weakness_service.py`

```python
from sqlalchemy.orm import Session
from ml.weakness_detector import WeaknessDetector, WeaknessFeatures
from ml.spaced_revision import SpacedRevisionScheduler, RevisionInput
from models.models import TopicMastery, RevisionSchedule, Topic
from datetime import datetime

detector = WeaknessDetector(use_ml_model=False)  # True in production
scheduler = SpacedRevisionScheduler()

def update_topic_mastery(
    user_id: str,
    topic_id: str,
    new_correct: int,
    new_total: int,
    avg_time_s: float,
    db: Session
):
    """Called after each quiz submission for each topic in the quiz."""
    mastery = db.query(TopicMastery).filter_by(
        user_id=user_id, topic_id=topic_id
    ).first()

    topic = db.query(Topic).filter_by(id=topic_id).first()

    if not mastery:
        mastery = TopicMastery(
            user_id=user_id,
            topic_id=topic_id
        )
        db.add(mastery)

    # Update cumulative stats
    mastery.total_attempts += new_total
    mastery.correct_attempts += new_correct
    mastery.accuracy = mastery.correct_attempts / mastery.total_attempts
    mastery.avg_response_time_s = avg_time_s
    mastery.last_attempted_at = datetime.utcnow()

    # Extract features + compute weakness
    features = WeaknessDetector.extract_features_from_db(user_id, topic_id, db)
    result = detector.compute(features)
    mastery.weakness_score = result["weakness_score"]
    mastery.mastery_level = result["mastery_level"]

    # Compute next revision date
    revision = db.query(RevisionSchedule).filter_by(
        user_id=user_id, topic_id=topic_id
    ).first()

    if not revision:
        revision = RevisionSchedule(user_id=user_id, topic_id=topic_id)
        db.add(revision)

    score_pct = (new_correct / new_total) * 100 if new_total > 0 else 0

    sched = scheduler.schedule(RevisionInput(
        topic_id=topic_id,
        last_score_pct=score_pct,
        previous_interval_days=revision.interval_days,
        ease_factor=revision.ease_factor,
        repetition_count=revision.repetition_count,
        topic_difficulty_weight=topic.difficulty_weight if topic else 1.0
    ))

    revision.due_date = sched["due_date"]
    revision.interval_days = sched["interval_days"]
    revision.ease_factor = sched["ease_factor"]
    revision.repetition_count = sched["repetition_count"]
    revision.last_score_pct = score_pct
    revision.is_done = False

    db.commit()
```

---

## F) PYQ Image Support Addendum

- Keep core weakness features unchanged, but ensure image-based PYQs are not dropped from analysis.
- For NLP tagging, enrich text input with OCR/caption text derived from `question_image_urls` when available.
- In recommendation deduplication, compare embeddings generated from combined text (`question_text + OCR/caption text`) so diagram-only duplicates are filtered.
- Preserve `question_image_urls` in recommended question payloads returned to frontend.
