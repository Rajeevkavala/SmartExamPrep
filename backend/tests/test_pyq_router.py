import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-pyq-router.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    DifficultyEnum,
    Question,
    RoleEnum,
    SourceTypeEnum,
    Subject,
    Topic,
    User,
)
from routers import pyq, quiz
from services.auth_service import create_token, hash_password


class PYQRouterTests(unittest.TestCase):
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

        cls.app = FastAPI()
        cls.app.include_router(pyq.router, prefix="/api/pyq", tags=["PYQ"])
        cls.app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])

        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        cls.app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(cls.app)

    @classmethod
    def tearDownClass(cls) -> None:
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.user = self._create_user()
        self.seed = self._seed_inventory()

    def _create_user(self) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"pyq-router-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="PYQ Student",
                role=RoleEnum.student,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=180),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _seed_inventory(self) -> dict[str, str]:
        with self.SessionLocal() as db:
            subject_os = Subject(
                id=str(uuid4()),
                name="Operating Systems",
                description="OS",
                display_order=1,
            )
            subject_dbms = Subject(
                id=str(uuid4()),
                name="DBMS",
                description="DBMS",
                display_order=2,
            )
            db.add_all([subject_os, subject_dbms])
            db.flush()

            topic_sched = Topic(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                name="CPU Scheduling",
                subtopics=["Round Robin"],
                nlp_keyword_tags=[],
                display_order=1,
                difficulty_weight=1.0,
            )
            topic_deadlocks = Topic(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                name="Deadlocks",
                subtopics=["Prevention"],
                nlp_keyword_tags=[],
                display_order=2,
                difficulty_weight=1.2,
            )
            topic_normalization = Topic(
                id=str(uuid4()),
                subject_id=str(subject_dbms.id),
                name="Normalization",
                subtopics=["BCNF"],
                nlp_keyword_tags=[],
                display_order=1,
                difficulty_weight=1.1,
            )
            db.add_all([topic_sched, topic_deadlocks, topic_normalization])
            db.flush()

            verified_pyq_latest = Question(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                topic_id=str(topic_sched.id),
                subtopic="Round Robin",
                question_text="Which scheduler can starve low-priority jobs?",
                options=["A. FCFS", "B. Priority", "C. Round Robin", "D. Lottery"],
                question_image_urls=[],
                correct_answer="B",
                explanation="Priority scheduling can starve lower-priority tasks.",
                difficulty=DifficultyEnum.medium,
                source_type=SourceTypeEnum.PYQ,
                source_url="https://example.com/pyq/os-priority",
                year=2023,
                nlp_keyword_tags=["scheduler", "priority"],
                is_verified=True,
                created_by=str(self.user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            verified_pyq_older = Question(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                topic_id=str(topic_deadlocks.id),
                subtopic="Prevention",
                question_text="Which Coffman condition is broken in prevention strategies?",
                options=["A. Hold and wait", "B. Circular wait", "C. No preemption", "D. All"],
                question_image_urls=[],
                correct_answer="D",
                explanation="Prevention techniques can break one or more conditions.",
                difficulty=DifficultyEnum.hard,
                source_type=SourceTypeEnum.PYQ,
                source_url="https://example.com/pyq/os-deadlocks",
                year=2021,
                nlp_keyword_tags=["deadlock"],
                is_verified=True,
                created_by=str(self.user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            verified_pyq_dbms = Question(
                id=str(uuid4()),
                subject_id=str(subject_dbms.id),
                topic_id=str(topic_normalization.id),
                subtopic="BCNF",
                question_text="What does BCNF eliminate compared to 3NF?",
                options=["A. Redundancy", "B. Dependency", "C. Partial dependency", "D. Nothing"],
                question_image_urls=[],
                correct_answer="A",
                explanation="BCNF removes anomalies caused by non-trivial dependencies.",
                difficulty=DifficultyEnum.easy,
                source_type=SourceTypeEnum.PYQ,
                source_url="https://example.com/pyq/dbms-bcnf",
                year=2020,
                nlp_keyword_tags=["bcnf", "normalization"],
                is_verified=True,
                created_by=str(self.user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            unverified_pyq = Question(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                topic_id=str(topic_sched.id),
                subtopic="MLFQ",
                question_text="This unverified PYQ should never be visible.",
                options=["A. 1", "B. 2", "C. 3", "D. 4"],
                question_image_urls=[],
                correct_answer="A",
                explanation="",
                difficulty=DifficultyEnum.medium,
                source_type=SourceTypeEnum.PYQ,
                source_url=None,
                year=2024,
                nlp_keyword_tags=[],
                is_verified=False,
                created_by=str(self.user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            practice_question = Question(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                topic_id=str(topic_sched.id),
                subtopic="SJF",
                question_text="Practice-only question",
                options=["A. 1", "B. 2", "C. 3", "D. 4"],
                question_image_urls=[],
                correct_answer="A",
                explanation="",
                difficulty=DifficultyEnum.easy,
                source_type=SourceTypeEnum.practice,
                source_url=None,
                year=2019,
                nlp_keyword_tags=[],
                is_verified=True,
                created_by=str(self.user.id),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )

            db.add_all(
                [
                    verified_pyq_latest,
                    verified_pyq_older,
                    verified_pyq_dbms,
                    unverified_pyq,
                    practice_question,
                ]
            )
            db.commit()

            return {
                "subject_os_id": str(subject_os.id),
                "subject_dbms_id": str(subject_dbms.id),
                "topic_sched_id": str(topic_sched.id),
                "verified_pyq_latest_id": str(verified_pyq_latest.id),
            }

    def _auth_headers(self) -> dict[str, str]:
        token = create_token({"sub": str(self.user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def test_filters_include_only_verified_pyq_inventory(self) -> None:
        response = self.client.get("/api/pyq/filters", headers=self._auth_headers())
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["years"], [2023, 2021, 2020])
        self.assertNotIn(2024, payload["years"])
        self.assertNotIn(2019, payload["years"])

        subject_ids = {item["id"] for item in payload["subjects"]}
        self.assertIn(self.seed["subject_os_id"], subject_ids)
        self.assertIn(self.seed["subject_dbms_id"], subject_ids)

        self.assertEqual(payload["difficulties"], ["easy", "medium", "hard"])

    def test_browse_endpoint_applies_filters(self) -> None:
        response = self.client.get(
            "/api/pyq/questions",
            params={
                "subject_id": self.seed["subject_os_id"],
                "difficulty": "medium",
                "year_from": 2022,
                "limit": 10,
                "offset": 0,
            },
            headers=self._auth_headers(),
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(len(payload["questions"]), 1)
        self.assertEqual(payload["questions"][0]["id"], self.seed["verified_pyq_latest_id"])
        self.assertEqual(payload["applied_filters"]["difficulty"], "medium")
        self.assertEqual(payload["applied_filters"]["subject_id"], self.seed["subject_os_id"])

    def test_practice_endpoint_returns_question_payload_and_context(self) -> None:
        response = self.client.post(
            "/api/pyq/practice",
            json={
                "subject_id": self.seed["subject_os_id"],
                "question_limit": 2,
                "year_from": 2020,
                "year_to": 2023,
            },
            headers=self._auth_headers(),
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["total"], 2)
        self.assertEqual(len(payload["questions"]), 2)
        self.assertEqual(payload["context_payload"]["source"], "pyq_browser")
        self.assertEqual(
            payload["context_payload"]["filters"]["subject_id"],
            self.seed["subject_os_id"],
        )
        self.assertEqual(
            payload["context_payload"]["filters"]["subject_name"],
            "Operating Systems",
        )

    def test_practice_submission_reuses_quiz_pipeline(self) -> None:
        practice_response = self.client.post(
            "/api/pyq/practice",
            json={
                "topic_id": self.seed["topic_sched_id"],
                "question_limit": 1,
            },
            headers=self._auth_headers(),
        )
        self.assertEqual(practice_response.status_code, 200)

        practice_payload = practice_response.json()
        question_id = practice_payload["questions"][0]["id"]

        submit_response = self.client.post(
            "/api/quiz/submit",
            json={
                "quiz_type": "pyq_practice",
                "answers": [
                    {
                        "question_id": question_id,
                        "selected_answer": "B",
                        "time_taken_s": 9.5,
                    }
                ],
                "context_payload": practice_payload["context_payload"],
            },
            headers=self._auth_headers(),
        )
        self.assertEqual(submit_response.status_code, 200)

        submit_payload = submit_response.json()
        self.assertEqual(submit_payload["quiz_type"], "pyq_practice")
        self.assertEqual(submit_payload["context_payload"]["source"], "pyq_browser")

        attempt_response = self.client.get(
            f"/api/quiz/attempts/{submit_payload['attempt_id']}",
            headers=self._auth_headers(),
        )
        self.assertEqual(attempt_response.status_code, 200)

        attempt_payload = attempt_response.json()
        self.assertEqual(attempt_payload["quiz_type"], "pyq_practice")
        self.assertEqual(attempt_payload["context_payload"]["source"], "pyq_browser")

    def test_browse_rejects_invalid_uuid_filters(self) -> None:
        response = self.client.get(
            "/api/pyq/questions",
            params={"subject_id": "not-a-uuid"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid subject_id", response.json()["detail"])

        response = self.client.get(
            "/api/pyq/questions",
            params={"topic_id": "invalid-topic-id"},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid topic_id", response.json()["detail"])

    def test_practice_rejects_invalid_uuid_filters(self) -> None:
        response = self.client.post(
            "/api/pyq/practice",
            json={"subject_id": "bad-subject-id", "question_limit": 2},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid subject_id", response.json()["detail"])

        response = self.client.post(
            "/api/pyq/practice",
            json={"topic_id": "bad-topic-id", "question_limit": 2},
            headers=self._auth_headers(),
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid topic_id", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
