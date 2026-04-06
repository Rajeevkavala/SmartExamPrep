import os
import unittest
from datetime import date, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-profile.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    RoleEnum,
    Subject,
    Topic,
    User,
    UserSubjectConfidence,
    UserTopicBaseline,
)
from routers import auth
from services.auth_service import create_token, hash_password


class ProfileOnboardingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.engine = create_engine(
            "sqlite+pysqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
            future=True,
        )
        cls.SessionLocal = sessionmaker(
            bind=cls.engine, autocommit=False, autoflush=False
        )
        Base.metadata.create_all(bind=cls.engine)

        cls.app = FastAPI()
        cls.app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

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
        with self.SessionLocal() as db:
            db.query(UserTopicBaseline).delete()
            db.query(UserSubjectConfidence).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def _create_user(self) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"student-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="Profile Student",
                role=RoleEnum.student,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _create_subject_with_topic(self, subject_name: str, topic_name: str) -> tuple[Subject, Topic]:
        with self.SessionLocal() as db:
            subject = Subject(
                id=str(uuid4()),
                name=f"{subject_name}-{uuid4()}",
                description="Test subject",
                display_order=1,
            )
            db.add(subject)
            db.flush()

            topic = Topic(
                id=str(uuid4()),
                subject_id=subject.id,
                name=topic_name,
                subtopics=["Foundations"],
                display_order=1,
                difficulty_weight=1.0,
            )
            db.add(topic)
            db.commit()
            db.refresh(subject)
            db.refresh(topic)
            return subject, topic

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": user.id, "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def test_get_me_returns_enriched_shape(self) -> None:
        user = self._create_user()

        response = self.client.get("/api/auth/me", headers=self._auth_headers(user))
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["email"], user.email)
        self.assertEqual(payload["daily_study_minutes"], 60)
        self.assertEqual(payload["experience_level"], "beginner")
        self.assertIsNone(payload["exam_target_date"])
        self.assertIsNone(payload["onboarding_version"])
        self.assertIsNone(payload["onboarding_completed_at"])
        self.assertEqual(payload["subject_confidences"], [])
        self.assertEqual(payload["known_topic_ids"], [])

    def test_put_me_accepts_legacy_payload_without_marking_complete(self) -> None:
        user = self._create_user()

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "daily_study_minutes": 90,
                "experience_level": "advanced",
            },
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["daily_study_minutes"], 90)
        self.assertEqual(payload["experience_level"], "advanced")
        self.assertIsNone(payload["exam_target_date"])
        self.assertIsNone(payload["onboarding_completed_at"])
        self.assertEqual(payload["subject_confidences"], [])
        self.assertEqual(payload["known_topic_ids"], [])

    def test_put_me_creates_and_replaces_profile_rows(self) -> None:
        user = self._create_user()
        subject_one, topic_one = self._create_subject_with_topic(
            "Operating Systems",
            "CPU Scheduling",
        )
        subject_two, topic_two = self._create_subject_with_topic(
            "Computer Networks",
            "Routing",
        )
        future_date = (date.today() + timedelta(days=120)).isoformat()

        first_response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "exam_target_date": future_date,
                "daily_study_minutes": 100,
                "experience_level": "intermediate",
                "subject_confidences": [
                    {"subject_id": subject_one.id, "confidence_pct": 70},
                    {"subject_id": subject_two.id, "confidence_pct": 55},
                ],
                "known_topic_ids": [topic_one.id],
            },
        )
        self.assertEqual(first_response.status_code, 200)

        first_payload = first_response.json()
        self.assertEqual(first_payload["onboarding_version"], 2)
        self.assertIsNotNone(first_payload["onboarding_completed_at"])
        self.assertEqual(len(first_payload["subject_confidences"]), 2)
        self.assertEqual(first_payload["known_topic_ids"], [topic_one.id])
        first_completed_at = first_payload["onboarding_completed_at"]

        second_response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "exam_target_date": future_date,
                "daily_study_minutes": 120,
                "experience_level": "advanced",
                "subject_confidences": [
                    {"subject_id": subject_two.id, "confidence_pct": 80},
                ],
                "known_topic_ids": [topic_two.id],
            },
        )
        self.assertEqual(second_response.status_code, 200)

        second_payload = second_response.json()
        self.assertEqual(second_payload["daily_study_minutes"], 120)
        self.assertEqual(second_payload["experience_level"], "advanced")
        self.assertEqual(second_payload["subject_confidences"], [
            {"subject_id": subject_two.id, "confidence_pct": 80}
        ])
        self.assertEqual(second_payload["known_topic_ids"], [topic_two.id])
        self.assertEqual(second_payload["onboarding_completed_at"], first_completed_at)

        with self.SessionLocal() as db:
            self.assertEqual(
                db.query(UserSubjectConfidence)
                .filter(UserSubjectConfidence.user_id == user.id)
                .count(),
                1,
            )
            self.assertEqual(
                db.query(UserTopicBaseline)
                .filter(UserTopicBaseline.user_id == user.id)
                .count(),
                1,
            )

    def test_put_me_rejects_duplicate_subject_ids(self) -> None:
        user = self._create_user()
        subject, _ = self._create_subject_with_topic(
            "Databases",
            "Normalization",
        )

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "subject_confidences": [
                    {"subject_id": subject.id, "confidence_pct": 40},
                    {"subject_id": subject.id, "confidence_pct": 60},
                ]
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Duplicate subject ids", response.json()["detail"])

    def test_put_me_rejects_invalid_topic_ids(self) -> None:
        user = self._create_user()

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "known_topic_ids": [str(uuid4())],
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "One or more topic ids are invalid.")

    def test_put_me_rejects_duplicate_known_topic_ids(self) -> None:
        user = self._create_user()
        _, topic = self._create_subject_with_topic(
            "Computer Organization",
            "Pipelining",
        )

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "known_topic_ids": [topic.id, topic.id],
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Duplicate topic ids", response.json()["detail"])

    def test_put_me_rejects_invalid_subject_ids(self) -> None:
        user = self._create_user()

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "subject_confidences": [
                    {"subject_id": str(uuid4()), "confidence_pct": 50},
                ]
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["detail"],
            "One or more subject ids are invalid.",
        )

    def test_put_me_empty_subject_confidences_keeps_onboarding_incomplete(self) -> None:
        user = self._create_user()
        future_date = (date.today() + timedelta(days=120)).isoformat()

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "exam_target_date": future_date,
                "daily_study_minutes": 90,
                "experience_level": "intermediate",
                "subject_confidences": [],
                "known_topic_ids": [],
            },
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertIsNone(payload["onboarding_version"])
        self.assertIsNone(payload["onboarding_completed_at"])
        self.assertEqual(payload["subject_confidences"], [])

    def test_put_me_rejects_past_exam_date(self) -> None:
        user = self._create_user()
        past_date = (date.today() - timedelta(days=1)).isoformat()

        response = self.client.put(
            "/api/auth/me",
            headers=self._auth_headers(user),
            json={
                "exam_target_date": past_date,
            },
        )
        self.assertEqual(response.status_code, 422)
        self.assertIsInstance(response.json()["detail"], list)
        self.assertTrue(
            any("Exam target date must be in the future." in str(item) for item in response.json()["detail"])
        )


if __name__ == "__main__":
    unittest.main()
