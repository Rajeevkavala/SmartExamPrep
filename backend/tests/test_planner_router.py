import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-planner-router.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import Base, DailyStudyPlan, DailyStudyTask, RoleEnum, User
from routers import planner
from services.auth_service import create_token, hash_password


class PlannerRouterTests(unittest.TestCase):
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
        cls.app.include_router(planner.router, prefix="/api/planner", tags=["Planner"])

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
            db.query(DailyStudyTask).delete()
            db.query(DailyStudyPlan).delete()
            db.query(User).delete()
            db.commit()

    def _create_user(self) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"planner-router-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="Planner Student",
                role=RoleEnum.student,
                daily_study_minutes=75,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=100),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": str(user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def test_today_endpoint_and_task_update_flow(self) -> None:
        user = self._create_user()

        today_response = self.client.get(
            "/api/planner/today",
            headers=self._auth_headers(user),
        )
        self.assertEqual(today_response.status_code, 200)
        today_payload = today_response.json()
        self.assertGreaterEqual(len(today_payload["tasks"]), 1)

        first_task_id = today_payload["tasks"][0]["task_id"]

        update_response = self.client.patch(
            f"/api/planner/tasks/{first_task_id}",
            headers=self._auth_headers(user),
            json={"status": "completed"},
        )
        self.assertEqual(update_response.status_code, 200)
        update_payload = update_response.json()
        self.assertTrue(update_payload["success"])
        self.assertTrue(
            any(task["status"] == "completed" for task in update_payload["plan"]["tasks"])
        )

    def test_carry_forward_endpoint_adds_previous_pending_tasks(self) -> None:
        user = self._create_user()

        with self.SessionLocal() as db:
            yesterday = date.today() - timedelta(days=1)
            old_plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=str(user.id),
                roadmap_id=None,
                roadmap_week_id=None,
                plan_date=yesterday,
                status="active",
                total_planned_minutes=30,
                total_completed_minutes=0,
                carry_forward_from_plan_id=None,
                metadata_json={},
                generated_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(old_plan)
            db.flush()

            db.add(
                DailyStudyTask(
                    id=str(uuid4()),
                    daily_plan_id=str(old_plan.id),
                    task_type="learn",
                    source_type="planner",
                    subject_id=None,
                    topic_id=None,
                    title="Carry forward reading",
                    description="Read revision notes",
                    resource_hint="/dashboard",
                    target_question_count=None,
                    target_minutes=30,
                    sequence_order=1,
                    status="pending",
                    completed_at=None,
                    carry_forward_count=0,
                    source_payload={},
                )
            )
            db.commit()

        carry_response = self.client.post(
            "/api/planner/carry-forward",
            headers=self._auth_headers(user),
            json={"from_date": yesterday.isoformat()},
        )
        self.assertEqual(carry_response.status_code, 200)
        carry_payload = carry_response.json()
        self.assertTrue(carry_payload["success"])
        self.assertTrue(
            any(task["source_type"] == "carry_forward" for task in carry_payload["plan"]["tasks"])
        )


if __name__ == "__main__":
    unittest.main()
