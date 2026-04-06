import os
import unittest
from datetime import datetime
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-admin-content.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from models.models import (
    Base,
    RevisionSchedule,
    RoleEnum,
    Subject,
    Topic,
    User,
    UserSubjectConfidence,
)
from routers.admin_content import delete_subject


class AdminContentRouterTests(unittest.TestCase):
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

    @classmethod
    def tearDownClass(cls) -> None:
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(RevisionSchedule).delete()
            db.query(UserSubjectConfidence).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def test_delete_subject_removes_subject_confidence_rows(self) -> None:
        with self.SessionLocal() as db:
            admin = User(
                id=str(uuid4()),
                email=f"admin-{uuid4()}@example.com",
                hashed_password="hashed",
                full_name="Admin User",
                role=RoleEnum.admin,
                is_active=True,
            )
            subject = Subject(
                id=str(uuid4()),
                name=f"Subject-{uuid4()}",
                description="Temporary subject",
                display_order=1,
            )
            db.add(admin)
            db.add(subject)
            db.flush()

            confidence = UserSubjectConfidence(
                id=str(uuid4()),
                user_id=admin.id,
                subject_id=subject.id,
                confidence_pct=45,
                source="onboarding",
            )
            db.add(confidence)
            db.commit()

            subject_id = str(subject.id)

            result = delete_subject(subject_id, db=db, admin=admin)

            self.assertTrue(result["deleted"])
            self.assertEqual(result["subject_id"], subject_id)
            self.assertEqual(result["questions_deleted"], 0)
            self.assertEqual(
                db.query(Subject).filter(Subject.id == subject_id).count(),
                0,
            )
            self.assertEqual(
                db.query(UserSubjectConfidence)
                .filter(UserSubjectConfidence.subject_id == subject_id)
                .count(),
                0,
            )

    def test_delete_subject_removes_revision_schedule_rows(self) -> None:
        with self.SessionLocal() as db:
            admin = User(
                id=str(uuid4()),
                email=f"admin-{uuid4()}@example.com",
                hashed_password="hashed",
                full_name="Admin User",
                role=RoleEnum.admin,
                is_active=True,
            )
            subject = Subject(
                id=str(uuid4()),
                name=f"Subject-{uuid4()}",
                description="Temporary subject",
                display_order=1,
            )
            db.add(admin)
            db.add(subject)
            db.flush()

            topic = Topic(
                id=str(uuid4()),
                subject_id=subject.id,
                name="Topic A",
                subtopics=["Subtopic A"],
                display_order=1,
                difficulty_weight=1.0,
            )
            db.add(topic)
            db.flush()

            revision = RevisionSchedule(
                id=str(uuid4()),
                user_id=admin.id,
                topic_id=topic.id,
                due_date=datetime.utcnow(),
                interval_days=1,
                ease_factor=2.3,
                repetition_count=0,
                last_score_pct=50.0,
                is_done=True,
            )
            db.add(revision)
            db.commit()

            subject_id = str(subject.id)
            topic_id = str(topic.id)

            result = delete_subject(subject_id, db=db, admin=admin)

            self.assertTrue(result["deleted"])
            self.assertEqual(result["subject_id"], subject_id)
            self.assertEqual(
                db.query(RevisionSchedule)
                .filter(RevisionSchedule.topic_id == topic_id)
                .count(),
                0,
            )
            self.assertEqual(
                db.query(Topic).filter(Topic.id == topic_id).count(),
                0,
            )


if __name__ == "__main__":
    unittest.main()
