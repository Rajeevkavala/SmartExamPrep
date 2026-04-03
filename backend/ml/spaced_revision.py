from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(slots=True)
class RevisionInput:
    topic_id: str
    last_score_pct: float
    previous_interval_days: int
    ease_factor: float
    repetition_count: int
    topic_difficulty_weight: float


class SpacedRevisionScheduler:
    """
    Modified SM-2 scheduler from phase-04.
    """

    BASE_INTERVALS = {
        "poor": 1,
        "average": 3,
        "good": 7,
        "excellent": 14,
    }

    def schedule(self, inp: RevisionInput) -> dict:
        score = float(inp.last_score_pct)

        base_interval = self._base_interval(score)
        adjusted_interval = base_interval * float(inp.topic_difficulty_weight)

        new_ease_factor = self._update_ease_factor(float(inp.ease_factor), score)

        if inp.repetition_count >= 2 and score >= 65:
            adjusted_interval = float(inp.previous_interval_days) * new_ease_factor

        interval_days = max(1, round(adjusted_interval))
        due_date = datetime.utcnow() + timedelta(days=interval_days)

        return {
            "due_date": due_date,
            "interval_days": interval_days,
            "ease_factor": round(new_ease_factor, 2),
            "repetition_count": inp.repetition_count + 1,
        }

    def _base_interval(self, score: float) -> int:
        if score < 40:
            return self.BASE_INTERVALS["poor"]
        if score < 65:
            return self.BASE_INTERVALS["average"]
        if score < 85:
            return self.BASE_INTERVALS["good"]
        return self.BASE_INTERVALS["excellent"]

    @staticmethod
    def _update_ease_factor(current_ef: float, score: float) -> float:
        """
        ease_factor = max(1.3, ease_factor + 0.1 - (1 - score/100) * 0.8)
        """
        updated = current_ef + 0.1 - (1 - (score / 100.0)) * 0.8
        return max(1.3, updated)
