import os
import unittest
from datetime import date, datetime, timedelta
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-planner-service.db")

from models.models import (
    Base,
    DailyStudyPlan,
    DailyStudyTask,
    RevisionSchedule,
    RoadmapWeek,
    RoadmapWeekTopic,
    RoleEnum,
    StudyActivityLog,
    StudyRoadmap,
    Subject,
    Topic,
    User,
)
from schemas.planner_schemas import GenerateTodayPlanRequest
from services import planner_service


class PlannerServiceTests(unittest.TestCase):
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
        self._original_adaptive = planner_service.get_adaptive_questions
        planner_service.get_adaptive_questions = lambda _user, _db: [
            {
                "id": "question-1",
                "topic_name": "CPU Scheduling",
            },
            {
                "id": "question-2",
                "topic_name": "Deadlocks",
            },
        ]

        with self.SessionLocal() as db:
            db.query(StudyActivityLog).delete()
            db.query(DailyStudyTask).delete()
            db.query(DailyStudyPlan).delete()
            db.query(RevisionSchedule).delete()
            db.query(RoadmapWeekTopic).delete()
            db.query(RoadmapWeek).delete()
            db.query(StudyRoadmap).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def tearDown(self) -> None:
        planner_service.get_adaptive_questions = self._original_adaptive

    def _seed_user_and_roadmap(self) -> tuple[str, str]:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"planner-{uuid4()}@example.com",
                hashed_password="hashed",
                role=RoleEnum.student,
                is_active=True,
                daily_study_minutes=90,
                experience_level="intermediate",
                exam_target_date=date.today() + timedelta(days=120),
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
                name="Deadlocks",
                display_order=1,
                difficulty_weight=1.0,
                subtopics=["Resource graph"],
            )
            db.add(topic)
            db.flush()

            roadmap = StudyRoadmap(
                id=str(uuid4()),
                user_id=user.id,
                status="active",
                plan_horizon_weeks=8,
                generation_reason="manual_generate",
                generated_at=datetime.utcnow(),
                start_date=date.today() - timedelta(days=1),
                end_date=date.today() + timedelta(days=50),
                metadata_json={},
            )
            db.add(roadmap)
            db.flush()

            week = RoadmapWeek(
                id=str(uuid4()),
                roadmap_id=roadmap.id,
                week_number=1,
                month_number=1,
                start_date=date.today() - timedelta(days=1),
                end_date=date.today() + timedelta(days=5),
                planned_minutes=300,
                focus_label="Close weak OS topics",
                status="active",
                day_plan_json=[
                    {
                        "day_number": 2,
                        "title": "Revise Deadlocks",
                        "planned_minutes": 45,
                        "focus_topic_ids": [topic.id],
                        "resources": [
                            {
                                "title": "Deadlocks notes",
                                "url": "https://example.com/deadlocks",
                            }
                        ],
                    }
                ],
                tracking_json={},
            )
            db.add(week)
            db.flush()

            db.add(
                RoadmapWeekTopic(
                    id=str(uuid4()),
                    roadmap_week_id=week.id,
                    topic_id=topic.id,
                    subject_id=subject.id,
                    sequence_order=1,
                    priority_score=80,
                    planned_minutes=60,
                    goal_type="revision",
                    resources_json=[
                        {
                            "title": "Deadlocks notes",
                            "url": "https://example.com/deadlocks",
                        }
                    ],
                    rationale={"weakness_score": 75},
                )
            )

            db.add(
                RevisionSchedule(
                    id=str(uuid4()),
                    user_id=user.id,
                    topic_id=topic.id,
                    due_date=datetime.utcnow() - timedelta(hours=1),
                    interval_days=2,
                    ease_factor=2.5,
                    repetition_count=1,
                    last_score_pct=52,
                    is_done=False,
                )
            )

            db.commit()
            return str(user.id), str(topic.id)

    def test_generate_today_plan_includes_core_task_types(self) -> None:
        user_id, _topic_id = self._seed_user_and_roadmap()

        with self.SessionLocal() as db:
            payload = planner_service.generate_today_plan(
                user_id=user_id,
                request=GenerateTodayPlanRequest(force_regenerate=True, include_carry_forward=True),
                db=db,
            )

        self.assertIn("summary", payload)
        self.assertGreater(payload["summary"]["total_tasks"], 0)
        task_types = {task["task_type"] for task in payload["tasks"]}
        self.assertIn("revision", task_types)
        self.assertTrue("practice" in task_types or "learn" in task_types)

    def test_update_task_status_writes_activity_log(self) -> None:
        user_id, _topic_id = self._seed_user_and_roadmap()

        with self.SessionLocal() as db:
            payload = planner_service.generate_today_plan(
                user_id=user_id,
                request=GenerateTodayPlanRequest(force_regenerate=True, include_carry_forward=True),
                db=db,
            )

            pending_task = next(
                (task for task in payload["tasks"] if task["status"] in {"pending", "in_progress"}),
                None,
            )
            if pending_task is None:
                self.fail("Expected at least one actionable planner task.")

            updated = planner_service.update_task_status(
                user_id=user_id,
                task_id=pending_task["task_id"],
                status_value="completed",
                db=db,
            )
            self.assertGreaterEqual(updated["summary"]["completed_tasks"], 1)

            log_count = (
                db.query(StudyActivityLog)
                .filter(
                    StudyActivityLog.user_id == user_id,
                    StudyActivityLog.activity_type == "planner_task_completed",
                )
                .count()
            )

        self.assertGreaterEqual(log_count, 1)

    def test_carry_forward_tasks_moves_unfinished_items(self) -> None:
        user_id, topic_id = self._seed_user_and_roadmap()

        with self.SessionLocal() as db:
            yesterday = date.today() - timedelta(days=1)

            source_plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=user_id,
                roadmap_id=None,
                roadmap_week_id=None,
                plan_date=yesterday,
                status="active",
                total_planned_minutes=40,
                total_completed_minutes=0,
                carry_forward_from_plan_id=None,
                metadata_json={},
                generated_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(source_plan)
            db.flush()

            db.add(
                DailyStudyTask(
                    id=str(uuid4()),
                    daily_plan_id=str(source_plan.id),
                    task_type="revision",
                    source_type="planner",
                    subject_id=None,
                    topic_id=topic_id,
                    title="Revise carry-forward topic",
                    description="Carry this task to next day",
                    resource_hint="/revision",
                    target_question_count=None,
                    target_minutes=40,
                    sequence_order=1,
                    status="pending",
                    completed_at=None,
                    carry_forward_count=0,
                    source_payload={},
                )
            )
            db.commit()

            today_payload = planner_service.carry_forward_tasks(
                user_id=user_id,
                from_date=yesterday,
                db=db,
            )

        self.assertTrue(any(task["source_type"] == "carry_forward" for task in today_payload["tasks"]))

    def test_carry_forward_tasks_is_idempotent_for_same_source_plan(self) -> None:
        user_id, topic_id = self._seed_user_and_roadmap()

        with self.SessionLocal() as db:
            yesterday = date.today() - timedelta(days=1)

            source_plan = DailyStudyPlan(
                id=str(uuid4()),
                user_id=user_id,
                roadmap_id=None,
                roadmap_week_id=None,
                plan_date=yesterday,
                status="active",
                total_planned_minutes=40,
                total_completed_minutes=0,
                carry_forward_from_plan_id=None,
                metadata_json={},
                generated_at=datetime.utcnow() - timedelta(days=1),
            )
            db.add(source_plan)
            db.flush()

            source_task = DailyStudyTask(
                id=str(uuid4()),
                daily_plan_id=str(source_plan.id),
                task_type="revision",
                source_type="planner",
                subject_id=None,
                topic_id=topic_id,
                title="Revise carry-forward topic",
                description="Carry this task to next day",
                resource_hint="/revision",
                target_question_count=None,
                target_minutes=40,
                sequence_order=1,
                status="pending",
                completed_at=None,
                carry_forward_count=0,
                source_payload={},
            )
            db.add(source_task)
            db.commit()

            planner_service.carry_forward_tasks(
                user_id=user_id,
                from_date=yesterday,
                db=db,
            )
            second_payload = planner_service.carry_forward_tasks(
                user_id=user_id,
                from_date=yesterday,
                db=db,
            )

        carry_forward_tasks = [
            task
            for task in second_payload["tasks"]
            if task["source_type"] == "carry_forward"
        ]
        self.assertEqual(len(carry_forward_tasks), 1)
        self.assertEqual(
            carry_forward_tasks[0]["title"],
            "Carry forward: Revise carry-forward topic",
        )


if __name__ == "__main__":
    unittest.main()
