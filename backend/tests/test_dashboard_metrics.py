import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-dashboard-metrics.db")

from models.models import (  # noqa: E402
    Base,
    DailyStudyPlan,
    DailyStudyTask,
    MasteryLevelEnum,
    QuizAttempt,
    RoadmapWeek,
    RoadmapWeekTopic,
    RoleEnum,
    StudyActivityLog,
    StudyRoadmap,
    Subject,
    Topic,
    TopicMastery,
    User,
)
from services import dashboard_service, metrics_service  # noqa: E402


class DashboardMetricsTests(unittest.TestCase):
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
        self._original_focus_hint = dashboard_service.generate_dashboard_focus_hint
        dashboard_service.generate_dashboard_focus_hint = lambda **_: "Focus on CPU Scheduling drills today."

        with self.SessionLocal() as db:
            db.query(StudyActivityLog).delete()
            db.query(DailyStudyTask).delete()
            db.query(DailyStudyPlan).delete()
            db.query(RoadmapWeekTopic).delete()
            db.query(RoadmapWeek).delete()
            db.query(StudyRoadmap).delete()
            db.query(QuizAttempt).delete()
            db.query(TopicMastery).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def tearDown(self) -> None:
        dashboard_service.generate_dashboard_focus_hint = self._original_focus_hint

    def _seed_dashboard_data(self) -> tuple[str, str]:
        with self.SessionLocal() as db:
            today = date.today()
            user = User(
                id=str(uuid4()),
                email=f"dash-{uuid4()}@example.com",
                hashed_password="hashed",
                role=RoleEnum.student,
                is_active=True,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=today + timedelta(days=120),
            )
            db.add(user)

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
                display_order=1,
                difficulty_weight=1.2,
                subtopics=["FCFS", "SJF"],
            )
            db.add(topic)
            db.flush()

            db.add(
                TopicMastery(
                    id=str(uuid4()),
                    user_id=user.id,
                    topic_id=topic.id,
                    accuracy=0.52,
                    weakness_score=68.0,
                    mastery_level=MasteryLevelEnum.weak,
                    total_attempts=14,
                    correct_attempts=7,
                )
            )

            db.add_all(
                [
                    QuizAttempt(
                        id=str(uuid4()),
                        user_id=user.id,
                        quiz_type="adaptive",
                        score=62.5,
                        total_questions=20,
                        correct_count=12,
                        answers=[],
                        context_payload={},
                        result_snapshot={},
                        started_at=datetime.utcnow() - timedelta(days=2),
                        completed_at=datetime.utcnow() - timedelta(days=2),
                    ),
                    QuizAttempt(
                        id=str(uuid4()),
                        user_id=user.id,
                        quiz_type="adaptive",
                        score=71.0,
                        total_questions=15,
                        correct_count=11,
                        answers=[],
                        context_payload={},
                        result_snapshot={},
                        started_at=datetime.utcnow(),
                        completed_at=datetime.utcnow(),
                    ),
                ]
            )
            db.flush()

            roadmap = StudyRoadmap(
                id=str(uuid4()),
                user_id=user.id,
                status="active",
                plan_horizon_weeks=8,
                generation_reason="manual_generate",
                generated_at=datetime.utcnow() - timedelta(days=3),
                start_date=today - timedelta(days=14),
                end_date=today + timedelta(days=42),
                metadata_json={},
            )
            db.add(roadmap)
            db.flush()

            week_one = RoadmapWeek(
                id=str(uuid4()),
                roadmap_id=roadmap.id,
                week_number=1,
                month_number=1,
                start_date=today - timedelta(days=14),
                end_date=today - timedelta(days=8),
                planned_minutes=300,
                focus_label="Revise weak OS areas",
                status="completed",
                day_plan_json=[],
                tracking_json={
                    "completed_days": 7,
                    "total_days": 7,
                    "completion_pct": 100.0,
                    "completed_minutes": 300,
                    "planned_minutes": 300,
                },
            )
            db.add(week_one)
            db.flush()

            week_two = RoadmapWeek(
                id=str(uuid4()),
                roadmap_id=roadmap.id,
                week_number=2,
                month_number=1,
                start_date=today - timedelta(days=7),
                end_date=today - timedelta(days=1),
                planned_minutes=280,
                focus_label="Solve scheduling questions",
                status="active",
                day_plan_json=[],
                tracking_json={
                    "completed_days": 3,
                    "total_days": 7,
                    "completion_pct": 42.86,
                    "completed_minutes": 120,
                    "planned_minutes": 280,
                },
            )
            db.add(week_two)
            db.flush()

            db.add(
                RoadmapWeekTopic(
                    id=str(uuid4()),
                    roadmap_week_id=week_two.id,
                    topic_id=topic.id,
                    subject_id=subject.id,
                    sequence_order=1,
                    priority_score=82.0,
                    planned_minutes=120,
                    goal_type="practice",
                    resources_json=[],
                    rationale={"weakness_score": 68.0},
                )
            )

            plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=user.id,
                roadmap_id=roadmap.id,
                roadmap_week_id=week_two.id,
                plan_date=today,
                status="active",
                total_planned_minutes=120,
                total_completed_minutes=60,
                carry_forward_from_plan_id=None,
                metadata_json={},
                generated_at=datetime.utcnow(),
            )
            db.add(plan)
            db.flush()

            db.add_all(
                [
                    DailyStudyTask(
                        id=str(uuid4()),
                        daily_plan_id=plan.id,
                        task_type="practice",
                        source_type="roadmap",
                        subject_id=subject.id,
                        topic_id=topic.id,
                        title="Solve OS set",
                        description="Practice scheduling problems",
                        resource_hint="/quiz/adaptive",
                        target_question_count=10,
                        target_minutes=60,
                        sequence_order=1,
                        status="completed",
                        completed_at=datetime.utcnow(),
                        carry_forward_count=0,
                        source_payload={},
                    ),
                    DailyStudyTask(
                        id=str(uuid4()),
                        daily_plan_id=plan.id,
                        task_type="revision",
                        source_type="planner",
                        subject_id=subject.id,
                        topic_id=topic.id,
                        title="Revise notes",
                        description="Review summary sheet",
                        resource_hint="/revision",
                        target_question_count=0,
                        target_minutes=60,
                        sequence_order=2,
                        status="pending",
                        completed_at=None,
                        carry_forward_count=0,
                        source_payload={},
                    ),
                ]
            )

            db.add_all(
                [
                    StudyActivityLog(
                        id=str(uuid4()),
                        user_id=user.id,
                        activity_type="planner_task_completed",
                        related_entity_type="daily_study_task",
                        related_entity_id=None,
                        duration_minutes=60,
                        questions_solved=10,
                        accuracy_pct=70.0,
                        activity_date=today,
                        payload_json={},
                        quiz_attempt_id=None,
                        daily_task_id=None,
                        topic_id=topic.id,
                    ),
                    StudyActivityLog(
                        id=str(uuid4()),
                        user_id=user.id,
                        activity_type="quiz_submitted",
                        related_entity_type="quiz_attempt",
                        related_entity_id=None,
                        duration_minutes=45,
                        questions_solved=15,
                        accuracy_pct=62.5,
                        activity_date=today - timedelta(days=1),
                        payload_json={},
                        quiz_attempt_id=None,
                        daily_task_id=None,
                        topic_id=topic.id,
                    ),
                ]
            )

            db.commit()
            return str(user.id), str(topic.id)

    def test_dashboard_response_contains_phase4_metrics(self) -> None:
        user_id, topic_id = self._seed_dashboard_data()

        with self.SessionLocal() as db:
            payload = dashboard_service.get_dashboard_data(user_id=user_id, db=db)

        self.assertIn("roadmap_progress", payload)
        self.assertIn("topic_progress", payload)
        self.assertIn("quick_actions", payload)
        self.assertEqual(payload["today_plan_status"], "active")
        self.assertGreater(payload["questions_solved_total"], 0)
        self.assertGreater(payload["hours_studied_total"], 0)
        self.assertGreater(payload["roadmap_progress_pct"], 0)
        self.assertTrue(payload["planner_summary"]["has_plan"])
        self.assertTrue(any(item["href"] == "/planner" for item in payload["quick_actions"]))
        self.assertTrue(any(item["topic_id"] == topic_id for item in payload["topic_progress"]))
        self.assertEqual(payload["nlp_insight"], "Focus on CPU Scheduling drills today.")

    def test_metrics_overview_contains_phase4_rollups(self) -> None:
        user_id, _ = self._seed_dashboard_data()

        with self.SessionLocal() as db:
            payload = metrics_service.get_analytics_overview(user_id=user_id, db=db)

        self.assertIn("study_streak_days", payload)
        self.assertIn("hours_studied_total", payload)
        self.assertIn("roadmap_progress_pct", payload)
        self.assertIn("planner_completion_pct_today", payload)
        self.assertGreaterEqual(payload["study_streak_days"], 1)
        self.assertGreater(payload["hours_studied_total"], 0)


if __name__ == "__main__":
    unittest.main()
