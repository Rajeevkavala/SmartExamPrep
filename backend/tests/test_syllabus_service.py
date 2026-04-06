import os
import unittest
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-syllabus-service.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from models.models import Base, JobStatusEnum, RoleEnum, Subject, SyllabusUpload, Topic, User
from services.syllabus_service import import_syllabus_to_db, parse_syllabus_with_rules


class SyllabusServiceTests(unittest.TestCase):
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
            db.query(SyllabusUpload).delete()
            db.query(Topic).delete()
            db.query(Subject).delete()
            db.query(User).delete()
            db.commit()

    def _seed_upload(self, extracted_structure: dict | None) -> str:
        with self.SessionLocal() as db:
            admin = User(
                id=str(uuid4()),
                email=f"admin-{uuid4()}@example.com",
                hashed_password="unused",
                full_name="Admin",
                role=RoleEnum.admin,
                is_active=True,
            )
            db.add(admin)
            db.flush()

            upload = SyllabusUpload(
                uploaded_by_id=admin.id,
                filename="syllabus.pdf",
                upload_path="uploads/syllabi/syllabus.pdf",
                status=JobStatusEnum.done,
                extracted_structure=extracted_structure,
                subjects_imported=0,
                topics_imported=0,
                error_message=None,
            )
            db.add(upload)
            db.commit()
            db.refresh(upload)
            return str(upload.id)

    def test_parse_syllabus_with_rules_extracts_subjects(self) -> None:
        raw_text = (
            "Section 1: Engineering Mathematics\n"
            "Discrete Mathematics: Propositional logic. Sets and relations.\n"
            "Linear Algebra: Matrices. Eigenvalues.\n"
            "Section 2: Algorithms\n"
            "Searching, sorting, hashing.\n"
        )

        parsed = parse_syllabus_with_rules(raw_text)

        self.assertIn("subjects", parsed)
        self.assertGreaterEqual(len(parsed["subjects"]), 2)
        self.assertEqual(parsed["subjects"][0]["name"], "Engineering Mathematics")

    def test_import_syllabus_to_db_rejects_empty_subject_list(self) -> None:
        upload_id = self._seed_upload({"subjects": []})

        with self.SessionLocal() as db:
            result = import_syllabus_to_db(upload_id, None, str(uuid4()), db)

        self.assertIn("error", result)
        self.assertEqual(
            result["error"],
            "No subjects found in the extracted syllabus structure.",
        )

    def test_import_syllabus_to_db_recovers_from_empty_extraction(self) -> None:
        upload_id = self._seed_upload({"subjects": []})

        with self.SessionLocal() as db:
            upload = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
            upload.upload_path = "uploads/syllabi/recoverable.pdf"
            db.commit()

            fallback_structure = {
                "subjects": [
                    {
                        "name": "Operating System",
                        "topics": [
                            {
                                "name": "Processes",
                                "subtopics": ["Threads", "Scheduling"],
                            }
                        ],
                    }
                ]
            }

            with patch(
                "services.syllabus_service.extract_pdf_text",
                return_value="Section 1: Operating System\nProcesses: Threads. Scheduling.",
            ), patch(
                "services.syllabus_service.parse_syllabus_with_rules",
                return_value=fallback_structure,
            ):
                result = import_syllabus_to_db(upload_id, None, str(uuid4()), db)

            self.assertEqual(result.get("subjects_created"), 1)
            self.assertEqual(result.get("topics_created"), 1)

            refreshed = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
            self.assertEqual(
                len((refreshed.extracted_structure or {}).get("subjects", [])),
                1,
            )


if __name__ == "__main__":
    unittest.main()
