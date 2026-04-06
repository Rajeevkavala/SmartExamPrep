import os
import unittest
from datetime import date, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-roadmap-service.db")

from models.models import (
    Base,
    MasteryLevelEnum,
    RoleEnum,
    StudyRoadmap,
    Subject,
    Topic,
    TopicMastery,
    User,
    UserSubjectConfidence,
    UserTopicBaseline,
)
from schemas.roadmap_schemas import GenerateRoadmapRequest
from services.roadmap_service import generate_roadmap, regenerate_roadmap


class RoadmapServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        cls.SessionLocal = sessionmaker(bind=cls.engine, autocommit=False, autoflush=False)
        Base.metadata.create_all(bind=cls.engine)

    @classmethod
    def tearDownClass(cls) -> None:
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(StudyRoadmap).delete()
            db.query(TopicMastery).delete()
            db.query(UserTopicBaseline).delete()
            db.query(UserSubjectConfidence).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def _seed_user_and_content(self) -> tuple[str, list[str]]:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"student-{uuid4()}@example.com",
                hashed_password="hashed",
                role=RoleEnum.student,
                is_active=True,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=70),
            )
            db.add(user)

            os_subject = Subject(id=str(uuid4()), name=f"Operating Systems-{uuid4()}", display_order=1)
            cn_subject = Subject(id=str(uuid4()), name=f"Computer Networks-{uuid4()}", display_order=2)
            db.add_all([os_subject, cn_subject])
            db.flush()

            topic_rows = [
                Topic(
                    id=str(uuid4()),
                    subject_id=os_subject.id,
                    name="CPU Scheduling",
                    display_order=1,
                    difficulty_weight=1.2,
                    subtopics=["FCFS"],
                ),
                Topic(
                    id=str(uuid4()),
                    subject_id=os_subject.id,
                    name="Deadlocks",
                    display_order=2,
                    difficulty_weight=1.1,
                    subtopics=["Resource allocation graph"],
                ),
                Topic(
                    id=str(uuid4()),
                    subject_id=cn_subject.id,
                    name="Routing",
                    display_order=1,
                    difficulty_weight=1.0,
                    subtopics=["Distance vector"],
                ),
                Topic(
                    id=str(uuid4()),
                    subject_id=cn_subject.id,
                    name="Transport Layer",
                    display_order=2,
                    difficulty_weight=1.3,
                    subtopics=["Congestion control"],
                ),
            ]
            db.add_all(topic_rows)
            db.flush()

            db.add_all(
                [
                    UserSubjectConfidence(
                        id=str(uuid4()),
                        user_id=user.id,
                        subject_id=os_subject.id,
                        confidence_pct=40,
                        source="onboarding",
                    ),
                    UserSubjectConfidence(
                        id=str(uuid4()),
                        user_id=user.id,
                        subject_id=cn_subject.id,
                        confidence_pct=65,
                        source="onboarding",
                    ),
                ]
            )

            db.add(
                UserTopicBaseline(
                    id=str(uuid4()),
                    user_id=user.id,
                    topic_id=topic_rows[2].id,
                    already_known=True,
                    source="onboarding",
                )
            )

            db.add(
                TopicMastery(
                    id=str(uuid4()),
                    user_id=user.id,
                    topic_id=topic_rows[0].id,
                    accuracy=0.35,
                    weakness_score=78,
                    mastery_level=MasteryLevelEnum.weak,
                    total_attempts=4,
                    correct_attempts=1,
                )
            )

            db.commit()
            return str(user.id), [str(topic.id) for topic in topic_rows]

    def test_generate_roadmap_creates_weeks_and_topics(self) -> None:
        user_id, _topic_ids = self._seed_user_and_content()

        with self.SessionLocal() as db:
            payload = generate_roadmap(
                user_id=user_id,
                request=GenerateRoadmapRequest(),
                db=db,
            )

        self.assertIn("summary", payload)
        self.assertIn("weeks", payload)
        self.assertGreater(payload["summary"]["plan_horizon_weeks"], 0)
        self.assertLessEqual(payload["summary"]["plan_horizon_weeks"], 52)
        self.assertEqual(payload["summary"]["generated_weeks"], len(payload["weeks"]))
        self.assertLessEqual(len(payload["weeks"]), 4)
        self.assertEqual(payload["summary"]["generated_months"], 1)
        self.assertTrue(payload["summary"]["has_more_months"])
        self.assertTrue(any(week["topics"] for week in payload["weeks"]))
        first_week = payload["weeks"][0]
        self.assertIn("tracking", first_week)
        self.assertIn("day_plan", first_week)
        self.assertTrue(len(first_week["day_plan"]) >= 1)
        first_topic = first_week["topics"][0]
        self.assertIn("resources", first_topic)

    def test_generate_roadmap_appends_next_month_on_generate_call(self) -> None:
        user_id, _topic_ids = self._seed_user_and_content()

        with self.SessionLocal() as db:
            first = generate_roadmap(
                user_id=user_id,
                request=GenerateRoadmapRequest(),
                db=db,
            )
            second = generate_roadmap(
                user_id=user_id,
                request=GenerateRoadmapRequest(),
                db=db,
            )

        self.assertEqual(first["summary"]["roadmap_id"], second["summary"]["roadmap_id"])
        self.assertGreater(second["summary"]["generated_weeks"], first["summary"]["generated_weeks"])
        self.assertGreater(len(second["weeks"]), len(first["weeks"]))

    def test_regenerate_supersedes_previous_active_roadmap(self) -> None:
        user_id, _topic_ids = self._seed_user_and_content()

        with self.SessionLocal() as db:
            first = generate_roadmap(
                user_id=user_id,
                request=GenerateRoadmapRequest(),
                db=db,
            )
            second = regenerate_roadmap(
                user_id=user_id,
                request=GenerateRoadmapRequest(generation_reason="manual_regenerate"),
                db=db,
            )

            active_count = (
                db.query(StudyRoadmap)
                .filter(StudyRoadmap.user_id == user_id, StudyRoadmap.status == "active")
                .count()
            )
            superseded_count = (
                db.query(StudyRoadmap)
                .filter(StudyRoadmap.user_id == user_id, StudyRoadmap.status == "superseded")
                .count()
            )

        self.assertNotEqual(first["summary"]["roadmap_id"], second["summary"]["roadmap_id"])
        self.assertEqual(active_count, 1)
        self.assertGreaterEqual(superseded_count, 1)

    def test_generate_roadmap_requires_exam_target_and_subject_confidence(self) -> None:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"incomplete-{uuid4()}@example.com",
                hashed_password="hashed",
                role=RoleEnum.student,
                is_active=True,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=None,
            )
            db.add(user)

            subject = Subject(
                id=str(uuid4()),
                name=f"Data Structures-{uuid4()}",
                display_order=1,
            )
            db.add(subject)
            db.flush()

            db.add(
                Topic(
                    id=str(uuid4()),
                    subject_id=subject.id,
                    name="Arrays",
                    display_order=1,
                    difficulty_weight=1.0,
                    subtopics=["Sliding window"],
                )
            )
            db.commit()

            with self.assertRaises(HTTPException) as exc:
                generate_roadmap(
                    user_id=str(user.id),
                    request=GenerateRoadmapRequest(),
                    db=db,
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertIn("Complete onboarding before generating a roadmap", exc.exception.detail)


if __name__ == "__main__":
    unittest.main()
