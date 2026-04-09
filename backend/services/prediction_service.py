from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime
from statistics import mean

from sqlalchemy.orm import Session, joinedload

from models.models import ExamCatalog, ExamPredictionSnapshot, Question, SourceTypeEnum, User
from schemas.roadmap_schemas import GenerateRoadmapRequest
from services.ai_service import provider_readiness
from services.exam_service import ensure_default_exam_catalog, get_exam_or_404
from services.roadmap_service import generate_roadmap


def _safe_subject_ids(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _priority_from_probability(probability: int) -> str:
    if probability >= 85:
        return "Critical"
    if probability >= 70:
        return "High"
    if probability >= 55:
        return "Medium"
    return "Low"


def _trend_from_year_counts(year_counts: Counter[int]) -> str:
    years = sorted(year_counts)
    if len(years) <= 1:
        return "Stable"

    midpoint = max(1, len(years) // 2)
    early_years = years[:midpoint]
    recent_years = years[midpoint:]
    if not recent_years:
        recent_years = years[-1:]

    early_avg = mean([year_counts[year] for year in early_years]) if early_years else 0.0
    recent_avg = mean([year_counts[year] for year in recent_years]) if recent_years else 0.0

    if recent_avg > early_avg * 1.15:
        return "Rising"
    if recent_avg < early_avg * 0.85:
        return "Cooling"
    return "Stable"


def _reason_text(
    *,
    appearance_count: int,
    distinct_years: list[int],
    last_appeared_year: int | None,
    trend: str,
) -> str:
    if not distinct_years:
        return "Limited historical signal. Keep this topic in your medium-priority revision bucket."

    coverage_text = (
        f"Appeared in {len(distinct_years)} different PYQ seasons"
        if len(distinct_years) > 1
        else "Appeared in one recent PYQ season"
    )
    last_seen_text = (
        f"last seen in {last_appeared_year}"
        if last_appeared_year is not None
        else "with no reliable last-seen year"
    )

    if trend == "Rising":
        return f"{coverage_text}, shows a rising recurrence pattern, and was {last_seen_text}."
    if trend == "Cooling":
        return f"{coverage_text}, but its recurrence has cooled recently even though it was {last_seen_text}."
    return f"{coverage_text} and remains stable in recent PYQ coverage; it was {last_seen_text}."


def _build_prediction_payload(exam: ExamCatalog, db: Session) -> dict:
    subject_ids = _safe_subject_ids(exam.subject_ids)

    query = (
        db.query(Question)
        .options(joinedload(Question.topic), joinedload(Question.subject))
        .filter(Question.is_verified.is_(True))
    )
    if subject_ids:
        query = query.filter(Question.subject_id.in_(subject_ids))

    pyq_questions = query.filter(Question.source_type == SourceTypeEnum.PYQ).all()
    source_label = "pyq"
    if not pyq_questions:
        pyq_questions = query.all()
        source_label = "verified_questions"

    topic_years: dict[str, list[int]] = defaultdict(list)
    topic_counts: Counter[str] = Counter()
    topic_meta: dict[str, dict[str, str]] = {}

    for question in pyq_questions:
        if question.topic is None:
            continue

        topic_id = str(question.topic_id)
        year = int(question.year) if question.year is not None else datetime.utcnow().year
        topic_years[topic_id].append(year)
        topic_counts[topic_id] += 1
        topic_meta[topic_id] = {
            "topic_name": question.topic.name,
            "subject_name": question.subject.name if question.subject else "",
        }

    all_years = sorted({year for years in topic_years.values() for year in years})
    latest_year = all_years[-1] if all_years else datetime.utcnow().year
    earliest_year = all_years[0] if all_years else latest_year
    available_year_span = max(1, (latest_year - earliest_year) + 1)

    rows: list[dict] = []
    repeat_topics: list[dict] = []

    for topic_id, years in topic_years.items():
        year_counts = Counter(years)
        distinct_years = sorted(year_counts)
        appearance_count = int(topic_counts[topic_id])
        last_appeared_year = max(distinct_years) if distinct_years else None
        trend = _trend_from_year_counts(year_counts)

        coverage_ratio = len(distinct_years) / available_year_span
        recency_ratio = 1.0
        if last_appeared_year is not None:
            recency_ratio = 1 - ((latest_year - last_appeared_year) / max(available_year_span, 1))
            recency_ratio = max(0.0, min(1.0, recency_ratio))

        frequency_ratio = min(1.0, appearance_count / max(len(pyq_questions), 1) * 6)
        trend_bonus = 0.12 if trend == "Rising" else (-0.06 if trend == "Cooling" else 0.04)
        probability = int(
            round(
                max(
                    25.0,
                    min(
                        95.0,
                        (coverage_ratio * 38.0)
                        + (recency_ratio * 26.0)
                        + (frequency_ratio * 18.0)
                        + (appearance_count * 4.0)
                        + (trend_bonus * 100.0),
                    ),
                )
            )
        )
        priority = _priority_from_probability(probability)
        expected_questions = max(
            1,
            min(
                3,
                int(round((appearance_count / max(len(distinct_years), 1)) + (0.5 if trend == "Rising" else 0.0))),
            ),
        )

        meta = topic_meta.get(topic_id, {})
        reason = _reason_text(
            appearance_count=appearance_count,
            distinct_years=distinct_years,
            last_appeared_year=last_appeared_year,
            trend=trend,
        )

        rows.append(
            {
                "topic_id": topic_id,
                "topic_name": meta.get("topic_name", topic_id),
                "subject_name": meta.get("subject_name", ""),
                "probability": probability,
                "trend": trend,
                "priority": priority,
                "expected_questions": expected_questions,
                "appearance_count": appearance_count,
                "last_appeared_year": last_appeared_year,
                "reason": reason,
            }
        )

        if appearance_count >= 2 or len(distinct_years) >= 2:
            repeat_topics.append(
                {
                    "topic_id": topic_id,
                    "topic_name": meta.get("topic_name", topic_id),
                    "subject_name": meta.get("subject_name", ""),
                    "appearance_count": appearance_count,
                    "years_appeared": distinct_years,
                    "pattern": (
                        f"Recurring in {len(distinct_years)} PYQ seasons with {appearance_count} total appearances."
                    ),
                    "priority": "Must Study" if probability >= 70 else "Track Closely",
                }
            )

    rows.sort(
        key=lambda item: (
            int(item["probability"]),
            int(item["appearance_count"]),
            int(item["last_appeared_year"] or 0),
        ),
        reverse=True,
    )
    repeat_topics.sort(
        key=lambda item: (int(item["appearance_count"]), len(item["years_appeared"])),
        reverse=True,
    )

    top_topics = rows[:3]
    if top_topics:
        leading_topics = ", ".join(item["topic_name"] for item in top_topics[:3])
        insight = (
            f"Focus first on {leading_topics}. These topics combine repeat appearances, "
            f"recent relevance, and the strongest probability scores for {exam.title}."
        )
    else:
        insight = (
            f"No strong prediction signal is available for {exam.title} yet. "
            "Refresh after more PYQs are imported."
        )

    return {
        "insight_text": insight,
        "rows_json": rows[:8],
        "repeat_topics_json": repeat_topics[:12],
        "metadata_json": {
            "source": source_label,
            "available_years": all_years,
            "questions_analyzed": len(pyq_questions),
            "topics_analyzed": len(topic_years),
            "degraded_mode": source_label != "pyq",
            "provider_readiness": provider_readiness(),
            "recommended_actions": [
                f"Prioritize {item['topic_name']} in the next roadmap refresh."
                for item in rows[:3]
            ],
            "ranking_method": "pyq_frequency_recency_blend",
        },
    }


def _snapshot_to_response(snapshot: ExamPredictionSnapshot, exam: ExamCatalog) -> dict:
    return {
        "exam_id": str(exam.id),
        "exam_title": exam.title,
        "generated_at": snapshot.generated_at.isoformat() if snapshot.generated_at else "",
        "insight": snapshot.insight_text or "",
        "rows": list(snapshot.rows_json or []),
        "repeat_topics": list(snapshot.repeat_topics_json or []),
        "metadata": dict(snapshot.metadata_json or {}),
    }


def refresh_prediction_snapshot(db: Session, exam_id: str, generated_by_user_id: str | None) -> dict:
    ensure_default_exam_catalog(db)
    exam = get_exam_or_404(db, exam_id)
    payload = _build_prediction_payload(exam, db)

    metadata_json = dict(payload["metadata_json"])
    metadata_json["refreshed_by_user_id"] = generated_by_user_id

    snapshot = ExamPredictionSnapshot(
        exam_id=exam.id,
        generated_by_user_id=generated_by_user_id,
        insight_text=payload["insight_text"],
        rows_json=payload["rows_json"],
        repeat_topics_json=payload["repeat_topics_json"],
        metadata_json=metadata_json,
        generated_at=datetime.utcnow(),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return _snapshot_to_response(snapshot, exam)


def get_prediction_snapshot(db: Session, exam_id: str) -> dict:
    ensure_default_exam_catalog(db)
    exam = get_exam_or_404(db, exam_id)
    snapshot = (
        db.query(ExamPredictionSnapshot)
        .filter(ExamPredictionSnapshot.exam_id == exam.id)
        .order_by(ExamPredictionSnapshot.generated_at.desc())
        .first()
    )
    if snapshot is None:
        return refresh_prediction_snapshot(db=db, exam_id=exam_id, generated_by_user_id=None)
    return _snapshot_to_response(snapshot, exam)


def copy_predictions_to_roadmap(
    *,
    db: Session,
    user: User,
    exam_id: str,
    topic_ids: list[str] | None,
    force_regenerate: bool,
) -> dict:
    snapshot = get_prediction_snapshot(db, exam_id)
    selected_topic_ids = [str(topic_id) for topic_id in (topic_ids or []) if str(topic_id).strip()]
    if not selected_topic_ids:
        selected_topic_ids = [str(item["topic_id"]) for item in snapshot.get("rows", [])[:5]]

    roadmap = generate_roadmap(
        user_id=str(user.id),
        request=GenerateRoadmapRequest(
            force_regenerate=force_regenerate,
            generation_reason="prediction_copy",
            priority_topic_ids=selected_topic_ids,
        ),
        db=db,
    )

    return {
        "copied_topic_ids": selected_topic_ids,
        "roadmap_id": str(roadmap["summary"]["roadmap_id"]),
        "generation_reason": "prediction_copy",
    }
