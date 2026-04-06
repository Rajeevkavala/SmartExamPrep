"""
Phase 4 ML Components Unit Tests.

Tests for:
- WeaknessDetector: formula-based and ML-based scoring
- SpacedRevisionScheduler: SM-2 algorithm
- AdaptiveRecommender: topic prioritization and deduplication
- NLP Pipeline: embedding, tag extraction, similarity
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from ml.weakness_detector import WeaknessDetector, WeaknessFeatures
from ml.spaced_revision import SpacedRevisionScheduler, RevisionInput
from ml.adaptive_recommender import AdaptiveRecommender
from ml.nlp_pipeline import (
    extract_tags,
    embed_text,
    cosine_similarity,
    is_near_duplicate,
    build_weakness_prompt,
)


# ═══════════════════════════════════════════════════════════════════════════════
# WEAKNESS DETECTOR TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestWeaknessDetector:
    """Tests for WeaknessDetector formula and ML scoring."""

    def test_perfect_performance_yields_low_weakness_score(self):
        """A student with 100% accuracy should have 0 weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=1.0,
            repeated_mistakes=0,
            avg_response_time_zscore=-1.0,
            recent_performance_slope=0.5,
            difficulty_sensitivity=0.0,
        )
        result = detector.compute(features)
        assert result["weakness_score"] == 0.0
        assert result["mastery_level"] == "Strong"

    def test_poor_performance_yields_high_weakness_score(self):
        """A student with 0% accuracy should have high weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=0.0,
            repeated_mistakes=10,
            avg_response_time_zscore=3.0,
            recent_performance_slope=-1.0,
            difficulty_sensitivity=1.0,
        )
        result = detector.compute(features)
        assert result["weakness_score"] >= 60
        assert result["mastery_level"] == "Weak"

    def test_moderate_performance_yields_moderate_score(self):
        """A student with moderate struggles should have moderate weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        # Features designed to produce score in 31-60 range (Moderate)
        features = WeaknessFeatures(
            accuracy=0.3,
            repeated_mistakes=5,
            avg_response_time_zscore=1.0,
            recent_performance_slope=-0.2,
            difficulty_sensitivity=0.5,
        )
        result = detector.compute(features)
        assert 30 < result["weakness_score"] <= 60
        assert result["mastery_level"] == "Moderate"

    def test_mastery_level_thresholds_strong(self):
        """Score 0-30 maps to Strong."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=0.9,
            repeated_mistakes=0,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        result = detector.compute(features)
        assert result["mastery_level"] == "Strong"

    def test_mastery_level_thresholds_weak(self):
        """Score 61-100 maps to Weak."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=0.0,
            repeated_mistakes=10,
            avg_response_time_zscore=2.0,
            recent_performance_slope=-1.0,
            difficulty_sensitivity=1.0,
        )
        result = detector.compute(features)
        assert result["mastery_level"] == "Weak"

    def test_repeated_mistakes_capped_at_10(self):
        """Repeated mistakes contribution is capped at 10."""
        detector = WeaknessDetector(use_ml_model=False)
        features_10 = WeaknessFeatures(
            accuracy=0.5,
            repeated_mistakes=10,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        features_20 = WeaknessFeatures(
            accuracy=0.5,
            repeated_mistakes=20,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        result_10 = detector.compute(features_10)
        result_20 = detector.compute(features_20)
        # Both should have same repeated_mistakes contribution
        assert result_10["weakness_score"] == result_20["weakness_score"]

    def test_negative_response_time_zscore_ignored(self):
        """Negative z-scores (fast responses) don't reduce weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=0.5,
            repeated_mistakes=0,
            avg_response_time_zscore=-2.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        result = detector.compute(features)
        # Should only reflect accuracy penalty
        expected_accuracy_penalty = 0.40 * (1 - 0.5) * 100
        assert result["weakness_score"] == pytest.approx(expected_accuracy_penalty, rel=0.01)

    def test_positive_slope_ignored(self):
        """Positive slope (improving) doesn't add to weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        features_positive = WeaknessFeatures(
            accuracy=0.5,
            repeated_mistakes=0,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.5,
            difficulty_sensitivity=0.0,
        )
        features_zero = WeaknessFeatures(
            accuracy=0.5,
            repeated_mistakes=0,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        result_positive = detector.compute(features_positive)
        result_zero = detector.compute(features_zero)
        assert result_positive["weakness_score"] == result_zero["weakness_score"]

    def test_score_is_clipped_to_0_100(self):
        """Weakness score is clipped to [0, 100] range."""
        detector = WeaknessDetector(use_ml_model=False)
        # Extreme values that might overflow
        features = WeaknessFeatures(
            accuracy=0.0,
            repeated_mistakes=100,
            avg_response_time_zscore=10.0,
            recent_performance_slope=-5.0,
            difficulty_sensitivity=5.0,
        )
        result = detector.compute(features)
        assert 0 <= result["weakness_score"] <= 100


class TestWeaknessDetectorMLMode:
    """Tests for ML model based weakness detection."""

    def test_ml_model_fallback_when_not_found(self):
        """Falls back to formula when model file doesn't exist."""
        with patch("ml.weakness_detector.MODEL_PATH") as mock_path:
            mock_path.exists.return_value = False
            detector = WeaknessDetector(use_ml_model=True)
            assert detector.model is None

    def test_ml_model_loads_when_available(self):
        """ML model loads when file exists."""
        detector = WeaknessDetector(use_ml_model=True)
        # Model should be loaded if it exists
        # This depends on whether the model file is present
        if detector.model is not None:
            features = WeaknessFeatures(
                accuracy=0.5,
                repeated_mistakes=2,
                avg_response_time_zscore=0.0,
                recent_performance_slope=0.0,
                difficulty_sensitivity=0.3,
            )
            result = detector.compute(features)
            assert 0 <= result["weakness_score"] <= 100


# ═══════════════════════════════════════════════════════════════════════════════
# SPACED REVISION SCHEDULER TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestSpacedRevisionScheduler:
    """Tests for the modified SM-2 spaced repetition scheduler."""

    def test_poor_score_yields_1_day_interval(self):
        """Score < 40% yields 1 day base interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=30.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 1

    def test_average_score_yields_3_day_interval(self):
        """Score 40-65% yields 3 day base interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=50.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 3

    def test_good_score_yields_7_day_interval(self):
        """Score 65-85% yields 7 day base interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=75.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 7

    def test_excellent_score_yields_14_day_interval(self):
        """Score > 85% yields 14 day base interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=90.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 14

    def test_topic_difficulty_weight_scales_interval(self):
        """Difficulty weight scales the base interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=90.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.5,
        )
        result = scheduler.schedule(inp)
        # 14 * 1.5 = 21
        assert result["interval_days"] == 21

    def test_ease_factor_minimum_is_1_3(self):
        """Ease factor never drops below 1.3."""
        scheduler = SpacedRevisionScheduler()
        # Very low score should try to reduce ease factor
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=0.0,
            previous_interval_days=1,
            ease_factor=1.3,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["ease_factor"] >= 1.3

    def test_repeated_good_performance_uses_ease_multiplier(self):
        """After 2+ reps with score >= 65%, interval = prev * ease."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=80.0,
            previous_interval_days=7,
            ease_factor=2.5,
            repetition_count=3,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        # interval = 7 * 2.5 (approx, after ease update)
        assert result["interval_days"] >= 14

    def test_repetition_count_increments(self):
        """Repetition count increments on each schedule."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=70.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=5,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["repetition_count"] == 6

    def test_due_date_is_in_future(self):
        """Due date is always in the future."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=70.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["due_date"] > datetime.utcnow()

    def test_minimum_interval_is_1_day(self):
        """Interval is never less than 1 day."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=30.0,
            previous_interval_days=0,
            ease_factor=1.3,
            repetition_count=0,
            topic_difficulty_weight=0.1,  # Very low weight
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] >= 1


# ═══════════════════════════════════════════════════════════════════════════════
# ADAPTIVE RECOMMENDER TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestAdaptiveRecommender:
    """Tests for the adaptive quiz recommendation engine."""

    def test_empty_masteries_returns_empty(self):
        """No masteries = no recommendations."""
        recommender = AdaptiveRecommender()
        result = recommender.recommend(
            topic_masteries=[],
            recent_embeddings=[],
            candidates=[{"id": "q1", "topic_id": "t1"}],
            daily_study_minutes=60,
        )
        assert result == []

    def test_empty_candidates_returns_empty(self):
        """No candidates = no recommendations."""
        recommender = AdaptiveRecommender()
        result = recommender.recommend(
            topic_masteries=[{"topic_id": "t1", "weakness_score": 50.0}],
            recent_embeddings=[],
            candidates=[],
            daily_study_minutes=60,
        )
        assert result == []

    def test_safe_weakness_score_normalization(self):
        """Weakness score normalization handles null/string/NaN and clamps range."""
        recommender = AdaptiveRecommender()
        assert recommender._safe_weakness_score(None) == 0.0
        assert recommender._safe_weakness_score("85") == 85.0
        assert recommender._safe_weakness_score(float("nan")) == 0.0
        assert recommender._safe_weakness_score(1000) == 100.0
        assert recommender._safe_weakness_score(-15) == 0.0

    def test_recommend_handles_nullable_weakness_scores(self):
        """Nullable weakness values should not crash recommendation flow."""
        recommender = AdaptiveRecommender()
        result = recommender.recommend(
            topic_masteries=[
                {"topic_id": "t1", "weakness_score": None},
                {"topic_id": "t2", "weakness_score": "80"},
            ],
            recent_embeddings=[],
            candidates=[
                {"id": "q1", "topic_id": "t1", "difficulty": "easy"},
                {"id": "q2", "topic_id": "t2", "difficulty": "medium"},
            ],
            daily_study_minutes=30,
        )
        assert isinstance(result, list)

    def test_prioritizes_weak_topics(self):
        """Higher weakness scores get prioritized."""
        recommender = AdaptiveRecommender()
        masteries = [
            {"topic_id": "t1", "weakness_score": 20.0},
            {"topic_id": "t2", "weakness_score": 80.0},
            {"topic_id": "t3", "weakness_score": 50.0},
        ]
        candidates = [
            {"id": "q1", "topic_id": "t1", "difficulty": "easy"},
            {"id": "q2", "topic_id": "t2", "difficulty": "easy"},
            {"id": "q3", "topic_id": "t3", "difficulty": "easy"},
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=60,
        )
        # T2 (highest weakness) should be in results
        topic_ids = [q["topic_id"] for q in result]
        assert "t2" in topic_ids

    def test_recency_factor_never_for_new_topics(self):
        """Topics never attempted get recency boost (1.5x)."""
        recommender = AdaptiveRecommender()
        factor = recommender._recency_factor(None)
        assert factor == 1.5

    def test_recency_factor_today(self):
        """Topics attempted today get low priority (0.2x)."""
        recommender = AdaptiveRecommender()
        factor = recommender._recency_factor(datetime.utcnow())
        assert factor == 0.2

    def test_recency_factor_this_week(self):
        """Topics attempted this week get medium priority (0.7x)."""
        recommender = AdaptiveRecommender()
        three_days_ago = datetime.utcnow() - timedelta(days=3)
        factor = recommender._recency_factor(three_days_ago)
        assert factor == 0.7

    def test_recency_factor_older(self):
        """Topics older than a week get normal priority (1.0x)."""
        recommender = AdaptiveRecommender()
        two_weeks_ago = datetime.utcnow() - timedelta(days=14)
        factor = recommender._recency_factor(two_weeks_ago)
        assert factor == 1.0

    def test_difficulty_progression(self):
        """Questions are ordered easy → medium → hard."""
        recommender = AdaptiveRecommender()
        masteries = [{"topic_id": "t1", "weakness_score": 80.0}]
        candidates = [
            {"id": "q1", "topic_id": "t1", "difficulty": "hard"},
            {"id": "q2", "topic_id": "t1", "difficulty": "easy"},
            {"id": "q3", "topic_id": "t1", "difficulty": "medium"},
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=60,
        )
        # First should be easy
        if result:
            assert result[0]["difficulty"] == "easy"

    def test_target_count_based_on_study_minutes(self):
        """More study minutes = more questions (up to MAX)."""
        recommender = AdaptiveRecommender()
        masteries = [{"topic_id": "t1", "weakness_score": 80.0}]
        candidates = [
            {"id": f"q{i}", "topic_id": "t1", "difficulty": "easy"}
            for i in range(15)
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=120,
        )
        # 120 / 6 = 20, but capped at MAX_QUESTIONS (10)
        assert len(result) <= 10

    def test_minimum_questions(self):
        """At least MIN_QUESTIONS are recommended when available."""
        recommender = AdaptiveRecommender()
        masteries = [
            {"topic_id": "t1", "weakness_score": 80.0},
            {"topic_id": "t2", "weakness_score": 75.0}
        ]
        candidates = [
            {"id": f"q{i}_t1", "topic_id": "t1", "difficulty": "easy"}
            for i in range(5)
        ] + [
            {"id": f"q{i}_t2", "topic_id": "t2", "difficulty": "easy"}
            for i in range(5)
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=6,  # Would suggest only 1
        )
        assert len(result) >= 5


# ═══════════════════════════════════════════════════════════════════════════════
# NLP PIPELINE TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestNLPPipeline:
    """Tests for NLP utilities."""

    def test_extract_tags_from_gate_text(self):
        """Domain terms are extracted from GATE-style text."""
        text = "What is the difference between process and thread in OS?"
        tags = extract_tags(text)
        assert len(tags) > 0
        # Should find domain terms
        assert any(t in ["process", "thread"] for t in tags)

    def test_extract_tags_empty_string(self):
        """Empty string returns empty list."""
        tags = extract_tags("")
        assert tags == []

    def test_extract_tags_max_12(self):
        """Tags are capped at 12."""
        text = " ".join(f"term{i}" for i in range(50))
        tags = extract_tags(text)
        assert len(tags) <= 12

    def test_embed_text_returns_list(self):
        """Embedding returns a list of floats."""
        embedding = embed_text("What is a binary search tree?")
        assert isinstance(embedding, list)
        assert len(embedding) > 0
        assert all(isinstance(v, float) for v in embedding)

    def test_embed_text_consistent_dimension(self):
        """All embeddings have the same dimension."""
        emb1 = embed_text("First question about algorithms")
        emb2 = embed_text("Second question about data structures")
        assert len(emb1) == len(emb2)

    def test_cosine_similarity_identical_vectors(self):
        """Identical vectors have similarity 1.0."""
        vec = [0.1, 0.2, 0.3, 0.4]
        sim = cosine_similarity(vec, vec)
        assert sim == pytest.approx(1.0, rel=0.01)

    def test_cosine_similarity_orthogonal_vectors(self):
        """Orthogonal vectors have similarity 0.0."""
        vec_a = [1.0, 0.0, 0.0]
        vec_b = [0.0, 1.0, 0.0]
        sim = cosine_similarity(vec_a, vec_b)
        assert sim == pytest.approx(0.0, abs=0.01)

    def test_cosine_similarity_opposite_vectors(self):
        """Opposite vectors have similarity -1.0."""
        vec_a = [1.0, 0.0]
        vec_b = [-1.0, 0.0]
        sim = cosine_similarity(vec_a, vec_b)
        assert sim == pytest.approx(-1.0, rel=0.01)

    def test_cosine_similarity_empty_vectors(self):
        """Empty vectors return 0.0."""
        sim = cosine_similarity([], [])
        assert sim == 0.0

    def test_cosine_similarity_mismatched_dimensions(self):
        """Mismatched dimensions return 0.0."""
        sim = cosine_similarity([1.0, 2.0], [1.0, 2.0, 3.0])
        assert sim == 0.0

    def test_is_near_duplicate_true(self):
        """Identical embeddings are flagged as duplicates."""
        emb = embed_text("What is a process in operating systems?")
        existing = [emb]
        assert is_near_duplicate(emb, existing, threshold=0.85) is True

    def test_is_near_duplicate_false(self):
        """Different embeddings are not duplicates."""
        emb1 = embed_text("What is a process in operating systems?")
        emb2 = embed_text("Explain the Dijkstra's algorithm for shortest paths")
        assert is_near_duplicate(emb1, [emb2], threshold=0.85) is False

    def test_is_near_duplicate_empty_existing(self):
        """Empty existing list returns False."""
        emb = embed_text("Test question")
        assert is_near_duplicate(emb, [], threshold=0.85) is False

    def test_is_near_duplicate_empty_candidate(self):
        """Empty candidate returns False."""
        existing = [embed_text("Some question")]
        assert is_near_duplicate([], existing, threshold=0.85) is False


class TestWeaknessPromptBuilder:
    """Tests for the weakness prompt builder."""

    def test_build_weakness_prompt_structure(self):
        """Prompt contains all required statistics."""
        prompt = build_weakness_prompt(
            topic_name="Binary Trees",
            subject_name="Data Structures",
            weakness_score=75.0,
            accuracy=0.25,
            repeated_mistakes=5,
            avg_response_time_s=45.0,
        )
        assert "Binary Trees" in prompt
        assert "Data Structures" in prompt
        assert "75" in prompt
        assert "25" in prompt
        assert "5" in prompt
        assert "45" in prompt

    def test_build_weakness_prompt_instructions(self):
        """Prompt includes coaching instructions."""
        prompt = build_weakness_prompt(
            topic_name="Test",
            subject_name="Test",
            weakness_score=50.0,
            accuracy=0.5,
            repeated_mistakes=0,
            avg_response_time_s=30.0,
        )
        assert "GATE CSE" in prompt
        assert "personalized insight" in prompt
        assert "actionable" in prompt


# ═══════════════════════════════════════════════════════════════════════════════
# EDGE CASE TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestEdgeCases:
    """Edge case and boundary condition tests."""

    def test_weakness_detector_with_zero_accuracy(self):
        """0% accuracy should give maximum weakness."""
        detector = WeaknessDetector(use_ml_model=False)
        features = WeaknessFeatures(
            accuracy=0.0,
            repeated_mistakes=0,
            avg_response_time_zscore=0.0,
            recent_performance_slope=0.0,
            difficulty_sensitivity=0.0,
        )
        result = detector.compute(features)
        # 0.40 * 100 = 40 from accuracy alone
        assert result["weakness_score"] == 40.0

    def test_scheduler_with_100_percent_score(self):
        """Perfect score yields 14 day interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=100.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 14

    def test_scheduler_with_zero_score(self):
        """Zero score yields 1 day interval."""
        scheduler = SpacedRevisionScheduler()
        inp = RevisionInput(
            topic_id="test",
            last_score_pct=0.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        result = scheduler.schedule(inp)
        assert result["interval_days"] == 1

    def test_recommender_with_all_recent_questions(self):
        """Questions attempted in last 7 days are filtered out."""
        recommender = AdaptiveRecommender()
        masteries = [{"topic_id": "t1", "weakness_score": 80.0}]
        now = datetime.utcnow()
        candidates = [
            {"id": "q1", "topic_id": "t1", "difficulty": "easy", "last_attempted_at": now},
            {"id": "q2", "topic_id": "t1", "difficulty": "easy", "last_attempted_at": now - timedelta(days=3)},
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=60,
        )
        # Both are recent, should be filtered
        assert len(result) == 0

    def test_recommender_with_iso_date_string(self):
        """ISO date strings are parsed correctly."""
        recommender = AdaptiveRecommender()
        masteries = [{"topic_id": "t1", "weakness_score": 80.0}]
        candidates = [
            {
                "id": "q1",
                "topic_id": "t1",
                "difficulty": "easy",
                "last_attempted_at": "2020-01-01T00:00:00Z",
            },
        ]
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=60,
        )
        # Old date, should be included
        assert len(result) == 1

    def test_nlp_extract_tags_special_characters(self):
        """Special characters don't break tag extraction."""
        text = "What's the O(n²) complexity of this algorithm? Use {brackets}!"
        tags = extract_tags(text)
        assert isinstance(tags, list)

    def test_embedding_unicode_text(self):
        """Unicode text doesn't break embedding."""
        text = "Explain the α-β pruning algorithm in AI"
        embedding = embed_text(text)
        assert isinstance(embedding, list)
        assert len(embedding) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRATION TESTS
# ═══════════════════════════════════════════════════════════════════════════════

class TestMLPipelineIntegration:
    """Integration tests verifying components work together."""

    def test_weakness_to_recommendation_flow(self):
        """Weakness scores drive recommendation priorities."""
        # Create masteries with varying weakness
        masteries = [
            {"topic_id": "t1", "weakness_score": 80.0},  # Weak
            {"topic_id": "t2", "weakness_score": 20.0},  # Strong
        ]
        
        candidates = [
            {"id": "q1", "topic_id": "t1", "difficulty": "easy"},
            {"id": "q2", "topic_id": "t2", "difficulty": "easy"},
        ]
        
        recommender = AdaptiveRecommender()
        result = recommender.recommend(
            topic_masteries=masteries,
            recent_embeddings=[],
            candidates=candidates,
            daily_study_minutes=60,
        )
        
        # Weak topic (t1) should be prioritized
        if result:
            assert result[0]["topic_id"] == "t1"

    def test_scheduler_updates_feed_weakness(self):
        """Scheduler intervals align with weakness formula expectations."""
        # Poor performance → 1 day interval
        scheduler = SpacedRevisionScheduler()
        poor_inp = RevisionInput(
            topic_id="test",
            last_score_pct=30.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        poor_result = scheduler.schedule(poor_inp)
        
        # Good performance → longer interval
        good_inp = RevisionInput(
            topic_id="test",
            last_score_pct=90.0,
            previous_interval_days=1,
            ease_factor=2.5,
            repetition_count=0,
            topic_difficulty_weight=1.0,
        )
        good_result = scheduler.schedule(good_inp)
        
        assert poor_result["interval_days"] < good_result["interval_days"]
