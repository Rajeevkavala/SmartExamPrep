import os
import unittest
from datetime import date, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-roadmap-router.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    RoleEnum,
    StudyRoadmap,
    Subject,
    Topic,
    User,
    UserSubjectConfidence,
)
from routers import roadmap
from services.auth_service import create_token, hash_password


class RoadmapRouterTests(unittest.TestCase):
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
        cls.app.include_router(roadmap.router, prefix="/api/roadmap", tags=["Roadmap"])

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
            db.query(UserSubjectConfidence).delete()
            db.query(StudyRoadmap).delete()
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
                full_name="Roadmap Student",
                role=RoleEnum.student,
                daily_study_minutes=80,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=140),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _create_subject_and_topics(self, user_id: str) -> None:
        with self.SessionLocal() as db:
            subject = Subject(
                id=str(uuid4()),
                name=f"Algorithms-{uuid4()}",
                description="Algorithms",
                display_order=1,
            )
            db.add(subject)
            db.flush()

            topic_one = Topic(
                id=str(uuid4()),
                subject_id=subject.id,
                name="Sorting",
                display_order=1,
                difficulty_weight=1.0,
                subtopics=["Quick Sort"],
            )
            topic_two = Topic(
                id=str(uuid4()),
                subject_id=subject.id,
                name="Dynamic Programming",
                display_order=2,
                difficulty_weight=1.4,
                subtopics=["Knapsack"],
            )
            db.add_all([topic_one, topic_two])
            db.flush()

            db.add(
                UserSubjectConfidence(
                    id=str(uuid4()),
                    user_id=user_id,
                    subject_id=subject.id,
                    confidence_pct=55,
                    source="onboarding",
                )
            )
            db.commit()

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": str(user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def test_generate_and_get_current_roadmap(self) -> None:
        user = self._create_user()
        self._create_subject_and_topics(str(user.id))

        generate_response = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={"generation_reason": "manual_generate"},
        )
        self.assertEqual(generate_response.status_code, 200)
        generate_payload = generate_response.json()
        self.assertIn("summary", generate_payload)
        self.assertGreater(len(generate_payload["weeks"]), 0)
        self.assertLessEqual(len(generate_payload["weeks"]), 4)

        append_response = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={"generation_reason": "manual_generate_next_month"},
        )
        self.assertEqual(append_response.status_code, 200)
        append_payload = append_response.json()
        self.assertEqual(
            append_payload["summary"]["roadmap_id"],
            generate_payload["summary"]["roadmap_id"],
        )
        self.assertGreater(len(append_payload["weeks"]), len(generate_payload["weeks"]))

        current_response = self.client.get(
            "/api/roadmap/current",
            headers=self._auth_headers(user),
        )
        self.assertEqual(current_response.status_code, 200)
        current_payload = current_response.json()
        self.assertEqual(
            current_payload["summary"]["roadmap_id"],
            append_payload["summary"]["roadmap_id"],
        )

        week_response = self.client.get(
            "/api/roadmap/weeks/1",
            headers=self._auth_headers(user),
        )
        self.assertEqual(week_response.status_code, 200)
        self.assertEqual(week_response.json()["week_number"], 1)

    def test_regenerate_supersedes_previous_roadmap(self) -> None:
        user = self._create_user()
        self._create_subject_and_topics(str(user.id))

        first = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={},
        )
        self.assertEqual(first.status_code, 200)
        first_id = first.json()["summary"]["roadmap_id"]

        second = self.client.post(
            "/api/roadmap/regenerate",
            headers=self._auth_headers(user),
            json={"generation_reason": "manual_regenerate"},
        )
        self.assertEqual(second.status_code, 200)
        second_id = second.json()["summary"]["roadmap_id"]
        self.assertNotEqual(first_id, second_id)

        with self.SessionLocal() as db:
            active_count = (
                db.query(StudyRoadmap)
                .filter(StudyRoadmap.user_id == str(user.id), StudyRoadmap.status == "active")
                .count()
            )
            superseded_count = (
                db.query(StudyRoadmap)
                .filter(StudyRoadmap.user_id == str(user.id), StudyRoadmap.status == "superseded")
                .count()
            )

        self.assertEqual(active_count, 1)
        self.assertGreaterEqual(superseded_count, 1)

    def test_update_day_tracking_status(self) -> None:
        user = self._create_user()
        self._create_subject_and_topics(str(user.id))

        generate = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={},
        )
        self.assertEqual(generate.status_code, 200)

        patch_response = self.client.patch(
            "/api/roadmap/weeks/1/days/1",
            headers=self._auth_headers(user),
            json={"status": "completed"},
        )
        self.assertEqual(patch_response.status_code, 200)
        payload = patch_response.json()
        self.assertEqual(payload["week_number"], 1)
        self.assertTrue(any(day["status"] == "completed" for day in payload["day_plan"]))

    def test_mark_week_complete_transaction_endpoint(self) -> None:
        user = self._create_user()
        self._create_subject_and_topics(str(user.id))

        generate = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={},
        )
        self.assertEqual(generate.status_code, 200)

        response = self.client.post(
            "/api/roadmap/weeks/1/complete",
            headers=self._auth_headers(user),
        )
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertIn("summary", payload)
        self.assertIn("week", payload)
        self.assertEqual(payload["week"]["week_number"], 1)
        self.assertEqual(payload["week"]["status"], "completed")
        self.assertEqual(payload["summary"]["requested_week_number"], 1)
        self.assertGreaterEqual(payload["summary"]["total_days"], 1)
        self.assertEqual(payload["summary"]["completion_pct"], 100.0)
        self.assertTrue(all(day["status"] == "completed" for day in payload["week"]["day_plan"]))

    def test_generate_requires_completed_profile_inputs(self) -> None:
        user = self._create_user()

        response = self.client.post(
            "/api/roadmap/generate",
            headers=self._auth_headers(user),
            json={},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Complete onboarding before generating a roadmap",
            response.json()["detail"],
        )


if __name__ == "__main__":
    unittest.main()
