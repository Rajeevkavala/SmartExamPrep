import os
import tempfile
import unittest
from datetime import date, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-student-runtime.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db
from models.models import (
    Base,
    DifficultyEnum,
    MockQuizSession,
    Question,
    RoleEnum,
    SourceTypeEnum,
    StudentUpload,
    StudyRoadmap,
    Subject,
    Topic,
    User,
    UserSubjectConfidence,
)
from routers import ai, auth, exams, quiz, uploads
from services import student_upload_service
from services.auth_service import create_token, hash_password


PARSED_UPLOAD_TEXT = """
1. Which scheduling policy can starve low-priority processes?
A. FCFS
B. Priority scheduling
C. Round Robin
D. Earliest deadline first
Answer: B
Explanation: Priority scheduling can indefinitely delay low-priority jobs.

2. What is the primary benefit of paging?
A. Eliminates context switches
B. Supports contiguous allocation only
C. Avoids external fragmentation
D. Removes the need for page tables
Answer: C
Explanation: Paging removes external fragmentation by using fixed-size blocks.

3. Which normal form removes transitive dependencies?
A. 1NF
B. 2NF
C. 3NF
D. BCNF
Answer: C
Explanation: Third normal form removes transitive dependencies on non-key attributes.
""".strip()


class StudentRuntimeFeatureTests(unittest.TestCase):
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
        cls.app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
        cls.app.include_router(exams.router, prefix="/api/exams", tags=["Exams"])
        cls.app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
        cls.app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
        cls.app.include_router(uploads.router, prefix="/api/uploads", tags=["Uploads"])

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

        self._temp_upload_dir = tempfile.TemporaryDirectory()
        self._original_upload_dir = student_upload_service.UPLOAD_DIR
        self._original_session_local = student_upload_service.SessionLocal
        self._original_extract_pdf_text = student_upload_service.extract_pdf_text

        student_upload_service.UPLOAD_DIR = Path(self._temp_upload_dir.name)
        student_upload_service.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        student_upload_service.SessionLocal = self.SessionLocal
        student_upload_service.extract_pdf_text = lambda _path: PARSED_UPLOAD_TEXT

    def tearDown(self) -> None:
        student_upload_service.UPLOAD_DIR = self._original_upload_dir
        student_upload_service.SessionLocal = self._original_session_local
        student_upload_service.extract_pdf_text = self._original_extract_pdf_text
        self._temp_upload_dir.cleanup()

    def _auth_headers(self, user: User) -> dict[str, str]:
        token = create_token({"sub": str(user.id), "role": "student"})
        return {"Authorization": f"Bearer {token}"}

    def _create_student(self, *, complete_profile: bool) -> User:
        with self.SessionLocal() as db:
            user = User(
                id=str(uuid4()),
                email=f"student-{uuid4()}@example.com",
                hashed_password=hash_password("Password123"),
                full_name="Runtime Student",
                role=RoleEnum.student,
                daily_study_minutes=90 if complete_profile else 60,
                experience_level="intermediate",
                exam_target_date=(date.today() + timedelta(days=150)) if complete_profile else None,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    def _seed_exam_inventory(self, user_id: str) -> dict:
        with self.SessionLocal() as db:
            subject_os = Subject(
                id=str(uuid4()),
                name=f"Operating Systems-{uuid4()}",
                description="OS",
                display_order=1,
            )
            subject_dbms = Subject(
                id=str(uuid4()),
                name=f"DBMS-{uuid4()}",
                description="DBMS",
                display_order=2,
            )
            db.add_all([subject_os, subject_dbms])
            db.flush()

            topic_sched = Topic(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                name="CPU Scheduling",
                subtopics=["Round Robin", "Priority"],
                display_order=1,
                difficulty_weight=1.2,
            )
            topic_deadlocks = Topic(
                id=str(uuid4()),
                subject_id=str(subject_os.id),
                name="Deadlocks",
                subtopics=["Prevention"],
                display_order=2,
                difficulty_weight=1.1,
            )
            topic_norm = Topic(
                id=str(uuid4()),
                subject_id=str(subject_dbms.id),
                name="Normalization",
                subtopics=["3NF"],
                display_order=1,
                difficulty_weight=1.0,
            )
            db.add_all([topic_sched, topic_deadlocks, topic_norm])
            db.flush()

            questions = [
                Question(
                    id=str(uuid4()),
                    subject_id=str(subject_os.id),
                    topic_id=str(topic_sched.id),
                    subtopic="Priority",
                    question_text="Which scheduler can starve low-priority jobs?",
                    options=["A. FCFS", "B. Priority", "C. Round Robin", "D. Lottery"],
                    question_image_urls=[],
                    correct_answer="B",
                    explanation="Priority scheduling can starve low-priority jobs.",
                    difficulty=DifficultyEnum.medium,
                    source_type=SourceTypeEnum.PYQ,
                    source_url="https://example.com/pyq/priority",
                    year=2025,
                    nlp_keyword_tags=["priority"],
                    is_verified=True,
                    created_by=user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Question(
                    id=str(uuid4()),
                    subject_id=str(subject_os.id),
                    topic_id=str(topic_sched.id),
                    subtopic="Round Robin",
                    question_text="Round Robin is primarily associated with what?",
                    options=["A. Time quantum", "B. Batch jobs", "C. Locking", "D. Paging"],
                    question_image_urls=[],
                    correct_answer="A",
                    explanation="Round Robin rotates processes using a time quantum.",
                    difficulty=DifficultyEnum.easy,
                    source_type=SourceTypeEnum.PYQ,
                    source_url="https://example.com/pyq/rr",
                    year=2024,
                    nlp_keyword_tags=["round-robin"],
                    is_verified=True,
                    created_by=user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Question(
                    id=str(uuid4()),
                    subject_id=str(subject_os.id),
                    topic_id=str(topic_deadlocks.id),
                    subtopic="Prevention",
                    question_text="Deadlock prevention breaks which style of condition?",
                    options=["A. Coffman", "B. Paging", "C. Routing", "D. Parsing"],
                    question_image_urls=[],
                    correct_answer="A",
                    explanation="Deadlock prevention breaks one or more Coffman conditions.",
                    difficulty=DifficultyEnum.medium,
                    source_type=SourceTypeEnum.PYQ,
                    source_url="https://example.com/pyq/deadlock",
                    year=2023,
                    nlp_keyword_tags=["deadlock"],
                    is_verified=True,
                    created_by=user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Question(
                    id=str(uuid4()),
                    subject_id=str(subject_dbms.id),
                    topic_id=str(topic_norm.id),
                    subtopic="3NF",
                    question_text="Third normal form removes what kind of dependency?",
                    options=["A. Circular", "B. Transitive", "C. Temporal", "D. Logical"],
                    question_image_urls=[],
                    correct_answer="B",
                    explanation="3NF removes transitive dependencies on non-key attributes.",
                    difficulty=DifficultyEnum.easy,
                    source_type=SourceTypeEnum.practice,
                    source_url=None,
                    year=None,
                    nlp_keyword_tags=["3nf"],
                    is_verified=True,
                    created_by=user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Question(
                    id=str(uuid4()),
                    subject_id=str(subject_os.id),
                    topic_id=str(topic_sched.id),
                    subtopic="Multilevel Queue",
                    question_text="Which scheduler can partition tasks into permanent classes?",
                    options=["A. FCFS", "B. Multilevel Queue", "C. EDF", "D. Banker"],
                    question_image_urls=[],
                    correct_answer="B",
                    explanation="Multilevel queue scheduling partitions tasks into fixed classes.",
                    difficulty=DifficultyEnum.hard,
                    source_type=SourceTypeEnum.practice,
                    source_url=None,
                    year=None,
                    nlp_keyword_tags=["mlq"],
                    is_verified=True,
                    created_by=user_id,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
            ]
            db.add_all(questions)
            db.add_all(
                [
                    UserSubjectConfidence(
                        id=str(uuid4()),
                        user_id=user_id,
                        subject_id=str(subject_os.id),
                        confidence_pct=55,
                        source="onboarding",
                    ),
                    UserSubjectConfidence(
                        id=str(uuid4()),
                        user_id=user_id,
                        subject_id=str(subject_dbms.id),
                        confidence_pct=62,
                        source="onboarding",
                    ),
                ]
            )
            db.commit()

            return {
                "subject_ids": [str(subject_os.id), str(subject_dbms.id)],
                "topic_ids": [str(topic_sched.id), str(topic_deadlocks.id), str(topic_norm.id)],
                "answers_by_question_id": {
                    str(question.id): str(question.correct_answer) for question in questions
                },
            }

    def _get_exam(self, user: User) -> dict:
        response = self.client.get("/api/exams/", headers=self._auth_headers(user))
        self.assertEqual(response.status_code, 200)
        exams_payload = response.json()
        self.assertGreaterEqual(len(exams_payload), 1)
        return exams_payload[0]

    def test_auth_profile_update_and_logout_flow(self) -> None:
        register_response = self.client.post(
            "/api/auth/register",
            json={
                "email": f"profile-{uuid4()}@example.com",
                "password": "Password123",
                "full_name": "Profile Student",
            },
        )
        self.assertEqual(register_response.status_code, 201)

        login_response = self.client.post(
            "/api/auth/login",
            json={
                "email": register_response.json()["email"],
                "password": "Password123",
            },
        )
        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["access_token"]
        self.assertIn("access_token=", login_response.headers.get("set-cookie", ""))

        headers = {"Authorization": f"Bearer {token}"}
        update_response = self.client.put(
            "/api/auth/me",
            headers=headers,
            json={
                "full_name": "Updated Profile Student",
                "phone": "+91-9999999999",
                "language": "English",
                "timezone": "Asia/Calcutta",
                "daily_study_minutes": 75,
                "email_notifications_enabled": False,
                "push_notifications_enabled": True,
                "study_reminders_enabled": False,
            },
        )
        self.assertEqual(update_response.status_code, 200)
        updated_payload = update_response.json()
        self.assertEqual(updated_payload["full_name"], "Updated Profile Student")
        self.assertEqual(updated_payload["phone"], "+91-9999999999")
        self.assertEqual(updated_payload["language"], "English")
        self.assertEqual(updated_payload["timezone"], "Asia/Calcutta")
        self.assertFalse(updated_payload["email_notifications_enabled"])
        self.assertTrue(updated_payload["push_notifications_enabled"])
        self.assertFalse(updated_payload["study_reminders_enabled"])

        me_response = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["phone"], "+91-9999999999")

        logout_response = self.client.post("/api/auth/logout")
        self.assertEqual(logout_response.status_code, 200)
        self.assertIn("access_token=", logout_response.headers.get("set-cookie", ""))

        unauthorized_response = self.client.get("/api/auth/me")
        self.assertEqual(unauthorized_response.status_code, 401)

    def test_exams_predictions_and_mock_sessions_are_fully_wired(self) -> None:
        user = self._create_student(complete_profile=True)
        inventory = self._seed_exam_inventory(str(user.id))
        headers = self._auth_headers(user)

        exam_payload = self._get_exam(user)
        self.assertEqual(exam_payload["title"], "GATE Computer Science")
        self.assertGreaterEqual(exam_payload["topic_count"], 3)
        self.assertGreaterEqual(exam_payload["pyq_count"], 3)

        prediction_response = self.client.get(
            "/api/ai/predictions",
            headers=headers,
            params={"exam_id": exam_payload["exam_id"]},
        )
        self.assertEqual(prediction_response.status_code, 200)
        prediction_payload = prediction_response.json()
        self.assertGreaterEqual(len(prediction_payload["rows"]), 1)
        self.assertIn("insight", prediction_payload)

        refresh_response = self.client.post(
            "/api/ai/predictions/refresh",
            headers=headers,
            json={"exam_id": exam_payload["exam_id"]},
        )
        self.assertEqual(refresh_response.status_code, 200)
        refreshed_rows = refresh_response.json()["rows"]
        self.assertGreaterEqual(len(refreshed_rows), 1)

        copy_response = self.client.post(
            f"/api/ai/predictions/{exam_payload['exam_id']}/copy-to-roadmap",
            headers=headers,
            json={
                "topic_ids": [refreshed_rows[0]["topic_id"]],
                "force_regenerate": False,
            },
        )
        self.assertEqual(copy_response.status_code, 200)
        copy_payload = copy_response.json()
        self.assertEqual(copy_payload["copied_topic_ids"], [refreshed_rows[0]["topic_id"]])

        with self.SessionLocal() as db:
            self.assertEqual(db.query(StudyRoadmap).filter(StudyRoadmap.user_id == user.id).count(), 1)

        create_session_response = self.client.post(
            "/api/quiz/mock-session",
            headers=headers,
            json={
                "exam_id": exam_payload["exam_id"],
                "mock_type": "pyq",
                "session_mode": "full",
                "time_limit_seconds": 1800,
                "question_count": 5,
                "year_filter": None,
            },
        )
        self.assertEqual(create_session_response.status_code, 200)
        session_payload = create_session_response.json()
        self.assertGreaterEqual(len(session_payload["questions"]), 3)
        self.assertEqual(session_payload["context_payload"]["source"], "mock_test")

        fetch_session_response = self.client.get(
            f"/api/quiz/mock-session/{session_payload['session_id']}",
            headers=headers,
        )
        self.assertEqual(fetch_session_response.status_code, 200)
        fetched_session = fetch_session_response.json()
        self.assertEqual(fetched_session["session_id"], session_payload["session_id"])

        answers = [
            {
                "question_id": question["id"],
                "selected_answer": inventory["answers_by_question_id"][question["id"]],
                "time_taken_s": 12.5,
            }
            for question in fetched_session["questions"]
        ]

        submit_response = self.client.post(
            "/api/quiz/submit",
            headers=headers,
            json={
                "quiz_type": fetched_session["mock_type"],
                "answers": answers,
                "context_payload": fetched_session["context_payload"],
            },
        )
        self.assertEqual(submit_response.status_code, 200)
        result_payload = submit_response.json()
        self.assertEqual(result_payload["score"], 100.0)

        history_response = self.client.get(
            "/api/quiz/attempts",
            headers=headers,
            params={"source": "mock_test", "limit": 10},
        )
        self.assertEqual(history_response.status_code, 200)
        history_payload = history_response.json()
        self.assertEqual(history_payload["total"], 1)
        self.assertEqual(history_payload["attempts"][0]["exam_title"], exam_payload["title"])

        with self.SessionLocal() as db:
            stored_session = (
                db.query(MockQuizSession)
                .filter(MockQuizSession.id == session_payload["session_id"])
                .first()
            )
            self.assertIsNotNone(stored_session)
            self.assertEqual(stored_session.status, "completed")

    def test_upload_route_processes_pdfs_into_mcqs_and_supports_history(self) -> None:
        user = self._create_student(complete_profile=True)
        _ = self._seed_exam_inventory(str(user.id))
        headers = self._auth_headers(user)
        exam_payload = self._get_exam(user)

        create_response = self.client.post(
            f"/api/uploads/?exam_id={exam_payload['exam_id']}",
            headers=headers,
            files={"file": ("study-notes.pdf", b"%PDF-1.4 fake payload", "application/pdf")},
        )
        self.assertEqual(create_response.status_code, 202)
        upload_id = create_response.json()["upload_id"]

        list_response = self.client.get("/api/uploads/", headers=headers)
        self.assertEqual(list_response.status_code, 200)
        uploads_payload = list_response.json()
        self.assertEqual(len(uploads_payload), 1)
        self.assertEqual(uploads_payload[0]["upload_id"], upload_id)
        self.assertEqual(uploads_payload[0]["status"], "done")
        self.assertEqual(uploads_payload[0]["processing_mode"], "ocr_rule_based")
        self.assertEqual(uploads_payload[0]["question_count"], 3)

        detail_response = self.client.get(f"/api/uploads/{upload_id}", headers=headers)
        self.assertEqual(detail_response.status_code, 200)
        detail_payload = detail_response.json()
        self.assertEqual(detail_payload["question_count"], 3)
        self.assertEqual(detail_payload["questions"][0]["correct_answer"], "B")

        with self.SessionLocal() as db:
            self.assertEqual(db.query(StudentUpload).filter(StudentUpload.user_id == user.id).count(), 1)

        delete_response = self.client.delete(f"/api/uploads/{upload_id}", headers=headers)
        self.assertEqual(delete_response.status_code, 200)
        self.assertTrue(delete_response.json()["deleted"])

        final_list_response = self.client.get("/api/uploads/", headers=headers)
        self.assertEqual(final_list_response.status_code, 200)
        self.assertEqual(final_list_response.json(), [])


if __name__ == "__main__":
    unittest.main()
