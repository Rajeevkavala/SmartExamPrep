from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from dependencies import get_db, require_admin
from models.models import JobStatusEnum, SyllabusUpload, User
from schemas.syllabus_schemas import ImportSyllabusRequest, SyllabusUploadResponse
from services.syllabus_service import import_syllabus_to_db, process_syllabus_upload

router = APIRouter()


def _serialize_upload(upload: SyllabusUpload) -> dict:
	def lifecycle_state() -> str:
		status_value = str(getattr(upload.status, "value", upload.status) or "").strip().lower()
		if status_value == "pending":
			return "queued"
		if status_value == "processing":
			return "running"
		if status_value == "done":
			return "completed"
		return "failed"

	def progress_pct() -> int:
		status_value = str(getattr(upload.status, "value", upload.status) or "").strip().lower()
		if status_value == "pending":
			return 10
		if status_value == "processing":
			return 55 if upload.extracted_structure else 35
		return 100

	structure = upload.extracted_structure if isinstance(upload.extracted_structure, dict) else {}
	subjects = structure.get("subjects", []) if isinstance(structure, dict) else []
	subject_count = len(subjects) if isinstance(subjects, list) else 0
	topic_count = 0
	if isinstance(subjects, list):
		for subject in subjects:
			if isinstance(subject, dict) and isinstance(subject.get("topics"), list):
				topic_count += len(subject.get("topics", []))

	return {
		"upload_id": str(upload.id),
		"filename": upload.filename,
		"status": getattr(upload.status, "value", upload.status),
		"lifecycle_state": lifecycle_state(),
		"progress_pct": progress_pct(),
		"extracted_structure": upload.extracted_structure,
		"subjects_imported": int(upload.subjects_imported or 0),
		"topics_imported": int(upload.topics_imported or 0),
		"error_message": upload.error_message,
		"can_retry": str(getattr(upload.status, "value", upload.status)) in {"failed", "done"} and bool(upload.upload_path),
		"job_summary": {
			"subject_count": subject_count,
			"topic_count": topic_count,
			"subjects_imported": int(upload.subjects_imported or 0),
			"topics_imported": int(upload.topics_imported or 0),
		},
		"provenance": {
			"parser": "ai_then_rule_fallback",
			"has_structure": bool(upload.extracted_structure),
			"has_error": bool(upload.error_message),
		},
		"created_at": upload.created_at.isoformat() if upload.created_at else "",
	}


@router.post(
	"/upload",
	status_code=status.HTTP_202_ACCEPTED,
	summary="Upload syllabus PDF and start AI parsing",
)
async def upload_syllabus(
	background_tasks: BackgroundTasks,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
	file: UploadFile = File(...),
) -> dict:
	if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Only PDF files are accepted.",
		)

	file_bytes = await file.read()
	if not file_bytes:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Uploaded PDF is empty.",
		)

	upload = SyllabusUpload(
		uploaded_by_id=admin.id,
		filename=file.filename,
		upload_path="",
		status=JobStatusEnum.pending,
	)
	db.add(upload)
	db.commit()
	db.refresh(upload)

	background_tasks.add_task(
		process_syllabus_upload,
		str(upload.id),
		file.filename,
		file_bytes,
	)

	return {
		"upload_id": str(upload.id),
		"status": getattr(upload.status, "value", upload.status),
		"lifecycle_state": "queued",
		"progress_pct": 10,
		"extracted_structure": None,
		"subjects_imported": 0,
		"topics_imported": 0,
		"error_message": None,
		"can_retry": False,
		"job_summary": {
			"subject_count": 0,
			"topic_count": 0,
			"subjects_imported": 0,
			"topics_imported": 0,
		},
		"provenance": {
			"parser": "ai_then_rule_fallback",
			"has_structure": False,
			"has_error": False,
		},
	}


@router.get(
	"/uploads",
	response_model=list[SyllabusUploadResponse],
	summary="List syllabus uploads",
)
def list_uploads(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
	limit: int = Query(default=20, ge=1, le=100),
	offset: int = Query(default=0, ge=0),
) -> list[dict]:
	_ = admin
	uploads = (
		db.query(SyllabusUpload)
		.order_by(SyllabusUpload.created_at.desc())
		.offset(offset)
		.limit(limit)
		.all()
	)
	return [_serialize_upload(upload) for upload in uploads]


@router.get(
	"/uploads/{upload_id}",
	response_model=SyllabusUploadResponse,
	summary="Get syllabus upload details",
)
def get_upload(
	upload_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	upload = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
	if not upload:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Upload not found.",
		)
	return _serialize_upload(upload)


@router.post(
	"/uploads/{upload_id}/import",
	summary="Import extracted syllabus into subjects/topics",
)
def import_syllabus(
	upload_id: str,
	req: ImportSyllabusRequest,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	result = import_syllabus_to_db(upload_id, req.structure, str(admin.id), db)
	if "error" in result:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=result["error"],
		)
	return result


@router.delete(
	"/uploads/{upload_id}",
	summary="Delete a syllabus upload",
)
def delete_upload(
	upload_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	upload = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
	if not upload:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Upload not found.",
		)

	db.delete(upload)
	db.commit()
	return {"deleted": True}


@router.post(
	"/uploads/{upload_id}/retry",
	response_model=SyllabusUploadResponse,
	status_code=status.HTTP_202_ACCEPTED,
	summary="Retry a syllabus parsing upload",
)
async def retry_upload(
	upload_id: str,
	background_tasks: BackgroundTasks,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	upload = db.query(SyllabusUpload).filter(SyllabusUpload.id == upload_id).first()
	if not upload:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Upload not found.",
		)

	_ = admin
	file_path = Path(upload.upload_path)
	if not upload.upload_path or not file_path.exists():
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Retry is unavailable because the original syllabus PDF is no longer stored.",
		)

	upload.status = JobStatusEnum.pending
	upload.error_message = None
	upload.extracted_structure = None
	db.add(upload)
	db.commit()
	db.refresh(upload)

	background_tasks.add_task(
		process_syllabus_upload,
		str(upload.id),
		upload.filename,
		file_path.read_bytes(),
	)
	return _serialize_upload(upload)
