from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sqlalchemy.orm import Session


MODEL_PATH = Path(__file__).parent / "models" / "weakness_model.pkl"


@dataclass(slots=True)
class WeaknessFeatures:
    accuracy: float
    repeated_mistakes: int
    avg_response_time_zscore: float
    recent_performance_slope: float
    difficulty_sensitivity: float


class WeaknessDetector:
    """
    Computes a weakness score (0-100) per topic per user.
    """

    WEIGHTS = {
        "accuracy": 0.40,
        "repeated_mistakes": 0.20,
        "response_time": 0.10,
        "trend": 0.20,
        "difficulty": 0.10,
    }

    def __init__(self, use_ml_model: bool = False):
        self.use_ml_model = use_ml_model
        self.model: Any | None = None
        if use_ml_model and MODEL_PATH.exists():
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception:
                self.model = None

    def compute(self, features: WeaknessFeatures) -> dict:
        if self.use_ml_model and self.model is not None:
            score = self._compute_ml(features)
        else:
            score = self._compute_formula(features)

        clipped_score = float(np.clip(score, 0, 100))
        return {
            "weakness_score": round(clipped_score, 2),
            "mastery_level": self._get_mastery_level(clipped_score),
        }

    def _compute_formula(self, features: WeaknessFeatures) -> float:
        w = self.WEIGHTS
        return (
            w["accuracy"] * (1 - features.accuracy) * 100
            + w["repeated_mistakes"] * min(features.repeated_mistakes, 10) * 5
            + w["response_time"] * max(features.avg_response_time_zscore, 0) * 10
            + w["trend"] * max(-features.recent_performance_slope, 0) * 50
            + w["difficulty"] * features.difficulty_sensitivity * 30
        )

    def _compute_ml(self, features: WeaknessFeatures) -> float:
        X = np.array(
            [
                [
                    features.accuracy,
                    features.repeated_mistakes,
                    features.avg_response_time_zscore,
                    features.recent_performance_slope,
                    features.difficulty_sensitivity,
                ]
            ]
        )
        return float(self.model.predict(X)[0])

    @staticmethod
    def _get_mastery_level(score: float) -> str:
        if score <= 30:
            return "Strong"
        if score <= 60:
            return "Moderate"
        return "Weak"

    @staticmethod
    def extract_features_from_db(
        user_id: str,
        topic_id: str,
        db: Session,
    ) -> WeaknessFeatures:
        from models.models import QuizAttempt, TopicMastery

        mastery = (
            db.query(TopicMastery)
            .filter(TopicMastery.user_id == user_id, TopicMastery.topic_id == topic_id)
            .first()
        )

        if not mastery:
            return WeaknessFeatures(
                accuracy=0.5,
                repeated_mistakes=0,
                avg_response_time_zscore=0.0,
                recent_performance_slope=0.0,
                difficulty_sensitivity=0.0,
            )

        attempts = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == user_id)
            .order_by(QuizAttempt.started_at.desc())
            .limit(10)
            .all()
        )

        topic_scores: list[int] = []
        response_times: list[float] = []
        mistake_counts: dict[str, int] = {}

        hard_total = 0
        hard_wrong = 0
        easy_total = 0
        easy_wrong = 0

        for attempt in attempts:
            answers = attempt.answers or []
            if not isinstance(answers, list):
                continue

            for ans in answers:
                if not isinstance(ans, dict):
                    continue

                if str(ans.get("topic_id")) != str(topic_id):
                    continue

                is_correct = bool(ans.get("correct", False))
                topic_scores.append(1 if is_correct else 0)

                time_taken_s = ans.get("time_taken_s", 30.0)
                try:
                    response_times.append(float(time_taken_s))
                except (TypeError, ValueError):
                    response_times.append(30.0)

                if not is_correct:
                    question_id = ans.get("question_id")
                    if question_id:
                        qid = str(question_id)
                        mistake_counts[qid] = mistake_counts.get(qid, 0) + 1

                difficulty = str(
                    ans.get("difficulty") or ans.get("difficulty_level") or ""
                ).lower()
                if difficulty == "hard":
                    hard_total += 1
                    if not is_correct:
                        hard_wrong += 1
                elif difficulty == "easy":
                    easy_total += 1
                    if not is_correct:
                        easy_wrong += 1

        repeated_mistakes = sum(1 for count in mistake_counts.values() if count >= 2)

        if response_times:
            mean_rt = float(np.mean(response_times))
            rt_zscore = (mean_rt - 30.0) / 15.0
        else:
            rt_zscore = 0.0

        if len(topic_scores) >= 3:
            y = np.array(topic_scores[-5:], dtype=float)
            x = np.arange(len(y), dtype=float)
            slope = float(np.polyfit(x, y, 1)[0]) if len(y) > 1 else 0.0
        else:
            slope = 0.0

        if hard_total > 0 and easy_total > 0:
            hard_error_rate = hard_wrong / hard_total
            easy_error_rate = easy_wrong / easy_total
            difficulty_sensitivity = float(np.clip(hard_error_rate - easy_error_rate, 0, 1))
        else:
            difficulty_sensitivity = 0.0

        return WeaknessFeatures(
            accuracy=float(mastery.accuracy or 0.0),
            repeated_mistakes=repeated_mistakes,
            avg_response_time_zscore=float(rt_zscore),
            recent_performance_slope=float(slope),
            difficulty_sensitivity=float(difficulty_sensitivity),
        )
