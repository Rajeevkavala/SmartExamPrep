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
	return {
		"upload_id": str(upload.id),
		"filename": upload.filename,
		"status": getattr(upload.status, "value", upload.status),
		"extracted_structure": upload.extracted_structure,
		"subjects_imported": int(upload.subjects_imported or 0),
		"topics_imported": int(upload.topics_imported or 0),
		"error_message": upload.error_message,
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
