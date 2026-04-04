import os
import unittest
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


# Ensure required settings exist before importing backend modules that initialize config.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test-contract.db")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

from dependencies import get_db, require_admin
from models.models import Base, JobStatusEnum, RoleEnum, SyllabusUpload, User
from routers import syllabus


class SyllabusContractTests(unittest.TestCase):
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
        cls.app.include_router(
            syllabus.router,
            prefix="/api/admin/syllabus",
            tags=["Admin Syllabus"],
        )

        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        def override_require_admin() -> User:
            return User(
                id=str(uuid4()),
                email="admin@example.com",
                hashed_password="unused",
                full_name="Contract Admin",
                role=RoleEnum.admin,
                is_active=True,
            )

        cls.app.dependency_overrides[get_db] = override_get_db
        cls.app.dependency_overrides[require_admin] = override_require_admin
        cls.client = TestClient(cls.app)

    @classmethod
    def tearDownClass(cls) -> None:
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()

    def setUp(self) -> None:
        with self.SessionLocal() as db:
            db.query(SyllabusUpload).delete()
            db.query(User).delete()
            db.commit()

    def _seed_done_upload_with_null_structure(self) -> str:
        with self.SessionLocal() as db:
            admin_uuid = str(uuid4())
            admin = User(
                id=admin_uuid,
                email=f"admin-{uuid4()}@example.com",
                hashed_password="unused",
                full_name="Contract Admin",
                role=RoleEnum.admin,
                is_active=True,
            )
            db.add(admin)
            db.flush()

            upload = SyllabusUpload(
                uploaded_by_id=admin.id,
                filename="syllabus-null-structure.pdf",
                upload_path="uploads/syllabi/syllabus-null-structure.pdf",
                status=JobStatusEnum.done,
                extracted_structure=None,
                subjects_imported=0,
                topics_imported=0,
                error_message=None,
            )
            db.add(upload)
            db.commit()
            db.refresh(upload)
            return str(upload.id)

    def test_list_uploads_keeps_done_with_null_extracted_structure(self) -> None:
        upload_id = self._seed_done_upload_with_null_structure()

        response = self.client.get("/api/admin/syllabus/uploads", params={"limit": 10, "offset": 0})
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertIsInstance(payload, list)

        item = next((entry for entry in payload if entry.get("upload_id") == upload_id), None)
        self.assertIsNotNone(item)

        self.assertEqual(item["status"], "done")
        self.assertIn("extracted_structure", item)
        self.assertIsNone(item["extracted_structure"])
        self.assertIn("error_message", item)
        self.assertIsNone(item["error_message"])

    def test_get_upload_keeps_done_with_null_extracted_structure(self) -> None:
        upload_id = self._seed_done_upload_with_null_structure()

        response = self.client.get(f"/api/admin/syllabus/uploads/{upload_id}")
        self.assertEqual(response.status_code, 200)

        item = response.json()
        self.assertEqual(item["upload_id"], upload_id)
        self.assertEqual(item["status"], "done")
        self.assertIn("extracted_structure", item)
        self.assertIsNone(item["extracted_structure"])
        self.assertIn("error_message", item)
        self.assertIsNone(item["error_message"])
        self.assertIsInstance(item["created_at"], str)
        self.assertTrue(item["created_at"])


if __name__ == "__main__":
    unittest.main()