import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-study-chat-router.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    DailyStudyPlan,
    DailyStudyTask,
    MasteryLevelEnum,
    QuizAttempt,
    RevisionSchedule,
    RoadmapWeek,
    RoadmapWeekTopic,
    RoleEnum,
    StudyChatMessage,
    StudyChatSession,
    StudyRoadmap,
    Subject,
    Topic,
    TopicMastery,
    User,
)
from routers import study_chat
from services import study_chat_service
from services.auth_service import create_token, hash_password


class StudyChatRouterTests(unittest.TestCase):
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
        cls.app.include_router(study_chat.router, prefix="/api/study-chat", tags=["Study Chat"])

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
        self._original_reply = study_chat_service.generate_study_chat_reply

        async def fake_study_chat_reply(**kwargs):
            intent = kwargs.get("intent") or "general_study_help"
            return f"Grounded reply for {intent}."

        study_chat_service.generate_study_chat_reply = fake_study_chat_reply

        with self.SessionLocal() as db:
            db.query(StudyChatMessage).delete()
            db.query(StudyChatSession).delete()
            db.query(DailyStudyTask).delete()
            db.query(DailyStudyPlan).delete()
            db.query(RoadmapWeekTopic).delete()
            db.query(RoadmapWeek).delete()
            db.query(StudyRoadmap).delete()
            db.query(RevisionSchedule).delete()
            db.query(TopicMastery).delete()
            db.query(QuizAttempt).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def tearDown(self) -> None:
        study_chat_service.generate_study_chat_reply = self._original_reply

    def _create_user(self, email_prefix: str) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"{email_prefix}-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="Study Chat Student",
                role=RoleEnum.student,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=120),
                onboarding_version=2,
                onboarding_completed_at=datetime.utcnow(),
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": str(user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def _seed_learning_context(self, user_id: str) -> None:
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
                name="CPU Scheduling",
                subtopics=["Priority", "Round Robin"],
                display_order=1,
                difficulty_weight=1.2,
            )
            db.add(topic)
            db.flush()

            db.add(
                TopicMastery(
                    id=str(uuid4()),
                    user_id=user_id,
                    topic_id=topic.id,
                    accuracy=0.45,
                    weakness_score=74.0,
                    mastery_level=MasteryLevelEnum.weak,
                    total_attempts=9,
                    correct_attempts=4,
                    avg_response_time_s=42,
                    last_attempted_at=datetime.utcnow() - timedelta(days=1),
                )
            )

            roadmap = StudyRoadmap(
                id=str(uuid4()),
                user_id=user_id,
                status="active",
                plan_horizon_weeks=12,
                generation_reason="manual_generate",
                generated_at=datetime.utcnow() - timedelta(days=2),
                start_date=date.today() - timedelta(days=7),
                end_date=date.today() + timedelta(days=70),
                metadata_json={},
            )
            db.add(roadmap)
            db.flush()

            week = RoadmapWeek(
                id=str(uuid4()),
                roadmap_id=roadmap.id,
                week_number=2,
                month_number=1,
                start_date=date.today() - timedelta(days=1),
                end_date=date.today() + timedelta(days=5),
                planned_minutes=420,
                focus_label="Close weak OS topics",
                status="active",
                day_plan_json=[],
                tracking_json={},
            )
            db.add(week)
            db.flush()

            db.add(
                RoadmapWeekTopic(
                    id=str(uuid4()),
                    roadmap_week_id=week.id,
                    subject_id=subject.id,
                    topic_id=topic.id,
                    sequence_order=1,
                    priority_score=82.0,
                    planned_minutes=120,
                    goal_type="practice",
                    rationale={"weakness_score": 74.0},
                    resources_json=[],
                )
            )

            plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=user_id,
                roadmap_id=roadmap.id,
                roadmap_week_id=week.id,
                plan_date=date.today(),
                status="active",
                total_planned_minutes=90,
                total_completed_minutes=30,
                metadata_json={},
                generated_at=datetime.utcnow(),
            )
            db.add(plan)
            db.flush()

            db.add(
                DailyStudyTask(
                    id=str(uuid4()),
                    daily_plan_id=plan.id,
                    task_type="practice",
                    source_type="roadmap",
                    subject_id=subject.id,
                    topic_id=topic.id,
                    title="Practice CPU Scheduling",
                    description="Solve weak-topic problems",
                    target_question_count=12,
                    target_minutes=45,
                    sequence_order=1,
                    status="pending",
                    carry_forward_count=0,
                    source_payload={},
                )
            )

            db.add(
                RevisionSchedule(
                    id=str(uuid4()),
                    user_id=user_id,
                    topic_id=topic.id,
                    due_date=datetime.utcnow() + timedelta(hours=5),
                    interval_days=2,
                    ease_factor=2.4,
                    repetition_count=1,
                    last_score_pct=48,
                    is_done=False,
                )
            )

            db.add(
                QuizAttempt(
                    id=str(uuid4()),
                    user_id=user_id,
                    quiz_type="adaptive",
                    score=61.0,
                    total_questions=10,
                    correct_count=6,
                    answers=[],
                    context_payload={},
                    result_snapshot={},
                    started_at=datetime.utcnow() - timedelta(days=1),
                    completed_at=datetime.utcnow() - timedelta(days=1),
                )
            )

            db.commit()

    def test_create_list_get_session_flow(self) -> None:
        user = self._create_user("chat-student")

        create_response = self.client.post(
            "/api/study-chat/sessions",
            headers=self._auth_headers(user),
            json={"title": "Planner help", "context_type": "planner"},
        )
        self.assertEqual(create_response.status_code, 200)
        create_payload = create_response.json()
        session_id = create_payload["session"]["session_id"]

        list_response = self.client.get(
            "/api/study-chat/sessions",
            headers=self._auth_headers(user),
        )
        self.assertEqual(list_response.status_code, 200)
        sessions = list_response.json()["sessions"]
        self.assertEqual(len(sessions), 1)
        self.assertEqual(sessions[0]["session_id"], session_id)

        get_response = self.client.get(
            f"/api/study-chat/sessions/{session_id}",
            headers=self._auth_headers(user),
        )
        self.assertEqual(get_response.status_code, 200)
        get_payload = get_response.json()
        self.assertEqual(get_payload["session"]["session_id"], session_id)
        self.assertEqual(get_payload["messages"], [])

    def test_send_message_persists_user_and_assistant_messages(self) -> None:
        user = self._create_user("chat-context")
        self._seed_learning_context(str(user.id))

        create_response = self.client.post(
            "/api/study-chat/sessions",
            headers=self._auth_headers(user),
            json={"title": "New Study Chat", "context_type": "general"},
        )
        self.assertEqual(create_response.status_code, 200)
        session_id = create_response.json()["session"]["session_id"]

        send_response = self.client.post(
            f"/api/study-chat/sessions/{session_id}/messages",
            headers=self._auth_headers(user),
            json={"message": "What should I do in my planner today?"},
        )
        self.assertEqual(send_response.status_code, 200)
        send_payload = send_response.json()

        self.assertEqual(send_payload["user_message"]["role"], "user")
        self.assertEqual(send_payload["assistant_message"]["role"], "assistant")
        self.assertIn("Grounded reply", send_payload["assistant_message"]["message_text"])
        self.assertEqual(
            send_payload["assistant_message"].get("token_usage_json", {}).get("source"),
            "ai",
        )
        self.assertIn(
            "grounding_sources",
            send_payload["assistant_message"].get("token_usage_json", {}),
        )
        self.assertIn(
            "provider_readiness",
            send_payload["assistant_message"].get("token_usage_json", {}),
        )

        grounding = send_payload["assistant_message"]["grounding_snapshot_json"]
        self.assertIsInstance(grounding, dict)
        self.assertIn("user_profile", grounding)
        self.assertIn("weak_topics", grounding)
        self.assertIn("planner", grounding)
        self.assertIn("roadmap", grounding)
        self.assertIn("recommended_actions", grounding)

        session_title = send_payload["session"]["title"]
        self.assertNotEqual(session_title, "New Study Chat")

        with self.SessionLocal() as db:
            stored_messages = (
                db.query(StudyChatMessage)
                .filter(StudyChatMessage.session_id == session_id)
                .all()
            )
        self.assertEqual(len(stored_messages), 2)

    def test_sessions_are_user_scoped(self) -> None:
        owner = self._create_user("chat-owner")
        other = self._create_user("chat-other")

        create_response = self.client.post(
            "/api/study-chat/sessions",
            headers=self._auth_headers(owner),
            json={"title": "Owner Session", "context_type": "general"},
        )
        self.assertEqual(create_response.status_code, 200)
        session_id = create_response.json()["session"]["session_id"]

        read_response = self.client.get(
            f"/api/study-chat/sessions/{session_id}",
            headers=self._auth_headers(other),
        )
        self.assertEqual(read_response.status_code, 404)

        send_response = self.client.post(
            f"/api/study-chat/sessions/{session_id}/messages",
            headers=self._auth_headers(other),
            json={"message": "Can I access this?"},
        )
        self.assertEqual(send_response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
