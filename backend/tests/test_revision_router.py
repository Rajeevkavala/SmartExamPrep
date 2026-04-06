import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-revision-router.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    DailyStudyPlan,
    DailyStudyTask,
    RevisionSchedule,
    RoleEnum,
    StudyActivityLog,
    Subject,
    Topic,
    User,
)
from routers import revision
from services.auth_service import create_token, hash_password


class RevisionRouterTests(unittest.TestCase):
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
        cls.app.include_router(revision.router, prefix="/api/revision", tags=["Revision"])

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
            db.query(StudyActivityLog).delete()
            db.query(DailyStudyTask).delete()
            db.query(DailyStudyPlan).delete()
            db.query(RevisionSchedule).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def _create_user(self) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"revision-router-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="Revision Student",
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

    def _seed_revision_item(self, user_id: str) -> tuple[str, str]:
        with self.SessionLocal() as db:
            subject = Subject(
                id=str(uuid4()),
                name=f"Operating Systems-{uuid4()}",
                display_order=1,
            )
            db.add(subject)
            db.flush()

            topic = Topic(
                id=str(uuid4()),
                subject_id=subject.id,
                name="Deadlocks",
                display_order=1,
                difficulty_weight=1.0,
                subtopics=["Resource graph"],
            )
            db.add(topic)
            db.flush()

            schedule = RevisionSchedule(
                id=str(uuid4()),
                user_id=user_id,
                topic_id=topic.id,
                due_date=datetime.utcnow() - timedelta(hours=1),
                interval_days=2,
                ease_factor=2.5,
                repetition_count=1,
                last_score_pct=52,
                is_done=False,
            )
            db.add(schedule)
            db.flush()

            plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=user_id,
                roadmap_id=None,
                roadmap_week_id=None,
                plan_date=date.today(),
                status="active",
                total_planned_minutes=20,
                total_completed_minutes=0,
                carry_forward_from_plan_id=None,
                metadata_json={},
                generated_at=datetime.utcnow(),
            )
            db.add(plan)
            db.flush()

            task = DailyStudyTask(
                id=str(uuid4()),
                daily_plan_id=plan.id,
                task_type="revision",
                source_type="revision_schedule",
                subject_id=subject.id,
                topic_id=topic.id,
                title="Revise Deadlocks",
                description="Due now based on spaced repetition.",
                resource_hint="/revision",
                target_question_count=None,
                target_minutes=20,
                sequence_order=1,
                status="pending",
                completed_at=None,
                carry_forward_count=0,
                source_payload={"revision_schedule_id": str(schedule.id)},
            )
            db.add(task)
            db.commit()
            return str(schedule.id), str(task.id)

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": str(user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def test_mark_done_is_idempotent_for_activity_logging(self) -> None:
        user = self._create_user()
        schedule_id, task_id = self._seed_revision_item(str(user.id))

        first = self.client.post(
            "/api/revision/mark-done",
            headers=self._auth_headers(user),
            json={
                "schedule_id": schedule_id,
                "daily_task_id": task_id,
            },
        )
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["success"])

        second = self.client.post(
            "/api/revision/mark-done",
            headers=self._auth_headers(user),
            json={
                "schedule_id": schedule_id,
                "daily_task_id": task_id,
            },
        )
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["success"])

        with self.SessionLocal() as db:
            log_count = (
                db.query(StudyActivityLog)
                .filter(
                    StudyActivityLog.user_id == str(user.id),
                    StudyActivityLog.activity_type == "revision_done",
                )
                .count()
            )
            updated_task = db.query(DailyStudyTask).filter(DailyStudyTask.id == task_id).first()

        self.assertEqual(log_count, 1)
        self.assertIsNotNone(updated_task)
        self.assertEqual(updated_task.status, "completed")


if __name__ == "__main__":
    unittest.main()
