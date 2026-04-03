from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from ml.nlp_pipeline import is_near_duplicate


class AdaptiveRecommender:
    RECENCY_FACTORS = {
        "today": 0.2,
        "this_week": 0.7,
        "older": 1.0,
        "never": 1.5,
    }
    SIMILARITY_THRESHOLD = 0.85
    MAX_QUESTIONS = 10
    MIN_QUESTIONS = 5

    def recommend(
        self,
        topic_masteries: list[dict],
        recent_embeddings: list[list[float]],
        candidates: list[dict],
        daily_study_minutes: int,
    ) -> list[dict]:
        if not topic_masteries or not candidates:
            return []

        target_count = min(
            self.MAX_QUESTIONS,
            max(self.MIN_QUESTIONS, max(1, daily_study_minutes // 6)),
        )

        topic_priorities: list[dict[str, Any]] = []
        for tm in topic_masteries:
            topic_id = tm.get("topic_id")
            if not topic_id:
                continue

            weakness_score = float(tm.get("weakness_score", 0.0))
            mastery_pct = (100 - weakness_score) / 100
            recency_factor = self._recency_factor(tm.get("last_attempted_at"))
            priority = weakness_score * (1 - mastery_pct) * recency_factor
            topic_priorities.append(
                {
                    "topic_id": topic_id,
                    "priority": priority,
                }
            )

        if not topic_priorities:
            return []

        topic_priorities.sort(key=lambda item: item["priority"], reverse=True)
        top_topics = [item["topic_id"] for item in topic_priorities[:3]]

        by_topic: dict[str, list[dict]] = {topic_id: [] for topic_id in top_topics}
        seven_days_ago = datetime.utcnow() - timedelta(days=7)

        for candidate in candidates:
            topic_id = candidate.get("topic_id")
            if topic_id not in by_topic:
                continue

            last_attempted = self._parse_datetime(candidate.get("last_attempted_at"))
            if last_attempted and last_attempted >= seven_days_ago:
                continue

            by_topic[topic_id].append(candidate)

        difficulty_order = {"easy": 0, "medium": 1, "hard": 2}
        for topic_id in top_topics:
            by_topic[topic_id].sort(
                key=lambda item: difficulty_order.get(
                    str(item.get("difficulty", "medium")).lower(),
                    1,
                )
            )

        selected: list[dict] = []
        selected_ids: set[str] = set()
        selected_embeddings: list[list[float]] = []
        selected_per_topic: dict[str, int] = {topic_id: 0 for topic_id in top_topics}

        # First pass: try to pick at least 2 per top topic.
        for topic_id in top_topics:
            for candidate in by_topic[topic_id]:
                if len(selected) >= target_count or selected_per_topic[topic_id] >= 2:
                    break
                if self._pick_candidate(
                    candidate,
                    recent_embeddings,
                    selected_embeddings,
                    selected,
                    selected_ids,
                ):
                    selected_per_topic[topic_id] += 1

        # Second pass: fill remaining slots up to 4 per topic.
        for topic_id in top_topics:
            for candidate in by_topic[topic_id]:
                if len(selected) >= target_count or selected_per_topic[topic_id] >= 4:
                    break
                if self._pick_candidate(
                    candidate,
                    recent_embeddings,
                    selected_embeddings,
                    selected,
                    selected_ids,
                ):
                    selected_per_topic[topic_id] += 1

        return selected

    def _pick_candidate(
        self,
        candidate: dict,
        recent_embeddings: list[list[float]],
        selected_embeddings: list[list[float]],
        selected: list[dict],
        selected_ids: set[str],
    ) -> bool:
        candidate_id = str(candidate.get("id", ""))
        if candidate_id and candidate_id in selected_ids:
            return False

        embedding = candidate.get("embedding") or []
        if self._is_duplicate(embedding, recent_embeddings + selected_embeddings):
            return False

        selected.append(candidate)
        if candidate_id:
            selected_ids.add(candidate_id)
        if isinstance(embedding, list) and embedding:
            selected_embeddings.append(embedding)
        return True

    def _recency_factor(self, last_attempted_at) -> float:
        if not last_attempted_at:
            return self.RECENCY_FACTORS["never"]

        parsed = self._parse_datetime(last_attempted_at)
        if parsed is None:
            return self.RECENCY_FACTORS["older"]

        delta = datetime.utcnow() - parsed
        if delta.days == 0:
            return self.RECENCY_FACTORS["today"]
        if delta.days <= 7:
            return self.RECENCY_FACTORS["this_week"]
        return self.RECENCY_FACTORS["older"]

    def _is_duplicate(self, candidate_emb, recent_embs: list[list[float]]) -> bool:
        if not candidate_emb:
            return False
        if not isinstance(candidate_emb, list):
            return False
        return is_near_duplicate(
            candidate_emb,
            recent_embs,
            threshold=self.SIMILARITY_THRESHOLD,
        )

    @staticmethod
    def _parse_datetime(value) -> datetime | None:
        if not value:
            return None
        if isinstance(value, datetime):
            parsed = value
            if parsed.tzinfo is not None:
                parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
            return parsed
        if isinstance(value, str):
            iso_value = value.replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(iso_value)
                if parsed.tzinfo is not None:
                    parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
                return parsed
            except ValueError:
                return None
        return None
