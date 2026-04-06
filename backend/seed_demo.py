"""
Seed realistic demo users and learning states for SmartExamPrep.

Run after the base content seed:
    python seed.py
    python seed_demo.py
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

BACKEND_DIR = Path(__file__).parent
sys.path.insert(0, str(BACKEND_DIR))

from database import SessionLocal
from models.models import (
    MasteryLevelEnum,
    Question,
    QuizAttempt,
    RevisionSchedule,
    RoleEnum,
    Subject,
    Topic,
    TopicMastery,
    User,
    UserFeedback,
)
from services.auth_service import hash_password


DEMO_PERSONAS = [
    {
        "email": "ananya.diagnostic@example.com",
        "password": "student@1234",
        "full_name": "Ananya Sharma",
        "daily_study_minutes": 90,
        "experience_level": "intermediate",
        "dashboard_state": "recently onboarded, weak in Operating System and Databases, consistent learner",
        "feedback_comment": "The weakness analysis feels accurate. I want slightly clearer explanation for why some topics are prioritized.",
        "focus_subjects": ["Operating System", "Databases", "Computer Networks"],
        "base_readiness": 38.0,
        "adaptive_gain": 14.0,
    },
    {
        "email": "rohan.comeback@example.com",
        "password": "student@1234",
        "full_name": "Rohan Verma",
        "daily_study_minutes": 60,
        "experience_level": "beginner",
        "dashboard_state": "recovering from weak diagnostics, revision-heavy profile around Digital Logic and COA",
        "feedback_comment": "Revision reminders helped me return to weak topics, but the dashboard can surface next actions more strongly.",
        "focus_subjects": ["Digital Logic", "Computer Organization and Architecture", "Engineering Mathematics"],
        "base_readiness": 31.0,
        "adaptive_gain": 19.0,
    },
    {
        "email": "meera.steady@example.com",
        "password": "student@1234",
        "full_name": "Meera Iyer",
        "daily_study_minutes": 120,
        "experience_level": "advanced",
        "dashboard_state": "strong in Computer Networks and TOC, using adaptive quizzes to polish",
        "feedback_comment": "Recommendations are useful and mostly on point. I especially like that weak topics get recycled into revision.",
        "focus_subjects": ["Compiler Design", "Theory of Computation", "Computer Networks"],
        "base_readiness": 57.0,
        "adaptive_gain": 9.0,
    },
    {
        "email": "arjun.consistent@example.com",
        "password": "student@1234",
        "full_name": "Arjun Patel",
        "daily_study_minutes": 75,
        "experience_level": "intermediate",
        "dashboard_state": "balanced performer with a few algorithm and programming-data-structure gaps",
        "feedback_comment": "The UI is clean and the adaptive quiz is useful. Explanations on result pages could be slightly more detailed.",
        "focus_subjects": ["Algorithms", "Programming and Data Structures", "Engineering Mathematics"],
        "base_readiness": 46.0,
        "adaptive_gain": 12.0,
    },
]


def _pick_topics_for_persona(db, focus_subjects: list[str], total_count: int = 8) -> list[Topic]:
    selected: list[Topic] = []
    seen_ids: set[str] = set()

    for subject_name in focus_subjects:
        focused_topics = (
            db.query(Topic)
            .join(Subject, Topic.subject_id == Subject.id)
            .filter(Subject.name == subject_name)
            .order_by(Topic.display_order.asc(), Topic.name.asc())
            .limit(3)
            .all()
        )
        for topic in focused_topics:
            if topic.id in seen_ids:
                continue
            selected.append(topic)
            seen_ids.add(topic.id)

    if len(selected) >= total_count:
        return selected[:total_count]

    fallback_topics = (
        db.query(Topic)
        .order_by(Topic.display_order.asc(), Topic.name.asc())
        .all()
    )
    for topic in fallback_topics:
        if topic.id in seen_ids:
            continue
        selected.append(topic)
        seen_ids.add(topic.id)
        if len(selected) >= total_count:
            break

    return selected[:total_count]


def _upsert_user(db, persona: dict) -> User:
    user = db.query(User).filter(User.email == persona["email"]).first()
    if user is None:
        user = User(
            email=persona["email"],
            hashed_password=hash_password(persona["password"]),
            full_name=persona["full_name"],
            role=RoleEnum.student,
            is_active=True,
        )
        db.add(user)
        db.flush()

    user.full_name = persona["full_name"]
    user.role = RoleEnum.student
    user.daily_study_minutes = persona["daily_study_minutes"]
    user.experience_level = persona["experience_level"]
    user.is_active = True
    return user


def _mastery_level(score: float) -> MasteryLevelEnum:
    if score >= 60:
        return MasteryLevelEnum.weak
    if score >= 30:
        return MasteryLevelEnum.moderate
    return MasteryLevelEnum.strong


def _reset_user_state(db, user_id: str) -> None:
    db.query(TopicMastery).filter(TopicMastery.user_id == user_id).delete(synchronize_session=False)
    db.query(RevisionSchedule).filter(RevisionSchedule.user_id == user_id).delete(synchronize_session=False)
    db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).delete(synchronize_session=False)
    db.query(UserFeedback).filter(UserFeedback.user_id == user_id).delete(synchronize_session=False)
    db.flush()


def _topic_snapshot(topic: Topic, weakness_score: float, accuracy: float) -> dict:
    return {
        "topic_id": str(topic.id),
        "topic_name": topic.name,
        "subject_name": topic.subject.name if topic.subject else "",
        "weakness_score": round(weakness_score, 2),
        "mastery_level": _mastery_level(weakness_score).value,
        "accuracy": round(accuracy, 2),
    }


def _seed_masteries_and_revisions(db, user: User, base_readiness: float, topics: list[Topic]) -> list[dict]:
    topic_rows: list[dict] = []
    for index, topic in enumerate(topics):
        weakness_score = max(12.0, min(86.0, 100 - base_readiness + (index * 6) - 12))
        accuracy = max(0.22, min(0.88, 1 - (weakness_score / 100)))
        total_attempts = 3 + index
        correct_attempts = max(1, round(total_attempts * accuracy))
        last_attempted_at = datetime.utcnow() - timedelta(days=index + 1)
        next_revision_date = datetime.utcnow() + timedelta(days=(index % 4) - 1)

        mastery = TopicMastery(
            user_id=user.id,
            topic_id=str(topic.id),
            accuracy=round(correct_attempts / total_attempts, 2),
            weakness_score=round(weakness_score, 2),
            mastery_level=_mastery_level(weakness_score),
            total_attempts=total_attempts,
            correct_attempts=correct_attempts,
            avg_response_time_s=round(28 + (index * 4), 2),
            last_attempted_at=last_attempted_at,
            next_revision_date=next_revision_date,
        )
        db.add(mastery)

        revision = RevisionSchedule(
            user_id=user.id,
            topic_id=str(topic.id),
            due_date=next_revision_date,
            interval_days=max(1, index + 1),
            ease_factor=round(2.3 - (index * 0.08), 2),
            repetition_count=index,
            last_score_pct=round(accuracy * 100, 2),
            is_done=index % 3 == 0,
        )
        db.add(revision)
        topic_rows.append(
            {
                "topic": topic,
                "weakness_score": round(weakness_score, 2),
                "accuracy": round(correct_attempts / total_attempts, 2),
            }
        )
    return topic_rows


def _build_comparisons(topic_rows: list[dict], improvement_factor: float) -> list[dict]:
    comparisons: list[dict] = []
    for row in topic_rows[:4]:
        topic = row["topic"]
        before_score = float(row["weakness_score"])
        after_score = max(10.0, before_score - improvement_factor)
        before_accuracy = float(row["accuracy"])
        after_accuracy = min(0.95, before_accuracy + (improvement_factor / 100))
        before = _topic_snapshot(topic, before_score, before_accuracy)
        after = _topic_snapshot(topic, after_score, after_accuracy)
        comparisons.append(
            {
                "topic_id": str(topic.id),
                "topic_name": topic.name,
                "subject_name": topic.subject.name if topic.subject else "",
                "topic_score_pct": round(after_accuracy * 100, 2),
                "before": before,
                "after": after,
            }
        )
    return comparisons


def _attempt_answers(questions: list[Question], score_pct: float) -> list[dict]:
    answers: list[dict] = []
    if not questions:
        return answers

    target_correct = max(1, round((score_pct / 100) * len(questions)))
    for index, question in enumerate(questions):
        is_correct = index < target_correct
        correct_answer = str(question.correct_answer)
        wrong_answer = "B" if correct_answer == "A" else "A"
        answers.append(
            {
                "question_id": str(question.id),
                "topic_id": str(question.topic_id),
                "selected_answer": correct_answer if is_correct else wrong_answer,
                "correct_answer": correct_answer,
                "correct": is_correct,
                "time_taken_s": round(18 + (index * 3.5), 2),
                "difficulty": getattr(question.difficulty, "value", question.difficulty),
            }
        )
    return answers


def _seed_attempts(db, user: User, persona: dict, topic_rows: list[dict], questions: list[Question]) -> None:
    base_readiness = float(persona["base_readiness"])
    adaptive_gain = float(persona["adaptive_gain"])

    attempts = [
        {
            "quiz_type": "diagnostic",
            "score": round(base_readiness + 4, 2),
            "readiness_before": max(20.0, base_readiness - 6),
            "readiness_after": base_readiness,
            "days_ago": 10,
            "improvement_factor": 6.0,
        },
        {
            "quiz_type": "adaptive",
            "score": round(base_readiness + adaptive_gain, 2),
            "readiness_before": base_readiness,
            "readiness_after": min(92.0, base_readiness + adaptive_gain),
            "days_ago": 4,
            "improvement_factor": 10.0,
        },
        {
            "quiz_type": "adaptive",
            "score": round(base_readiness + adaptive_gain + 5, 2),
            "readiness_before": min(92.0, base_readiness + adaptive_gain - 2),
            "readiness_after": min(96.0, base_readiness + adaptive_gain + 5),
            "days_ago": 1,
            "improvement_factor": 14.0,
        },
    ]

    question_pool = questions[: min(len(questions), 6)]
    for attempt_seed in attempts:
        topic_comparisons = _build_comparisons(topic_rows, attempt_seed["improvement_factor"])
        topic_scores = {
            item["topic_name"]: item["topic_score_pct"] for item in topic_comparisons
        }
        completed_at = datetime.utcnow() - timedelta(days=attempt_seed["days_ago"])
        answers = _attempt_answers(question_pool, attempt_seed["score"])

        attempt = QuizAttempt(
            user_id=user.id,
            quiz_type=attempt_seed["quiz_type"],
            score=attempt_seed["score"],
            total_questions=max(1, len(question_pool)),
            correct_count=max(1, round((attempt_seed["score"] / 100) * max(1, len(question_pool)))),
            answers=answers,
            result_snapshot={
                "quiz_type": attempt_seed["quiz_type"],
                "topic_scores": topic_scores,
                "topic_comparisons": topic_comparisons,
                "readiness_before": attempt_seed["readiness_before"],
                "readiness_after": attempt_seed["readiness_after"],
                "submitted_at": completed_at.isoformat(),
            },
            started_at=completed_at - timedelta(minutes=12),
            completed_at=completed_at,
        )
        db.add(attempt)


def _seed_feedback(db, user: User, persona: dict) -> None:
    entry = UserFeedback(
        user_id=user.id,
        weakness_analysis_rating=4,
        recommendation_rating=5,
        revision_rating=4,
        ui_clarity_rating=4,
        overall_rating=4,
        comment=persona["feedback_comment"],
        context_page="dashboard",
    )
    db.add(entry)


def seed_demo_users() -> None:
    random.seed(7)
    db = SessionLocal()
    try:
        available_topic_count = db.query(Topic).count()
        questions = (
            db.query(Question)
            .filter(Question.is_verified.is_(True))
            .order_by(Question.created_at.asc())
            .all()
        )

        if available_topic_count == 0:
            raise RuntimeError("No topics found. Run python seed.py first.")

        for offset, persona in enumerate(DEMO_PERSONAS):
            topics = _pick_topics_for_persona(
                db,
                focus_subjects=persona.get("focus_subjects", []),
                total_count=8,
            )
            user = _upsert_user(db, persona)
            _reset_user_state(db, str(user.id))
            topic_rows = _seed_masteries_and_revisions(
                db=db,
                user=user,
                base_readiness=float(persona["base_readiness"]) + offset,
                topics=topics[offset : offset + 5] or topics[:5],
            )
            _seed_attempts(db, user, persona, topic_rows, questions)
            _seed_feedback(db, user, persona)

        db.commit()

        print("=" * 60)
        print("DEMO DATA SEEDED")
        print("=" * 60)
        for persona in DEMO_PERSONAS:
            print(f"{persona['email']} / {persona['password']}")
            print(f"  {persona['dashboard_state']}")
        print("=" * 60)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
