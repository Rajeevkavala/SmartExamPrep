from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import JobStatusEnum, StudentUpload, User
from schemas.uploads_schemas import StudentUploadDetailResponse, StudentUploadSummaryResponse
from services.student_upload_service import (
    delete_student_upload,
    get_student_upload,
    list_student_uploads,
    prepare_student_upload_retry,
    process_student_upload,
    validate_exam_for_upload,
)


router = APIRouter()


@router.post(
    "/",
    response_model=StudentUploadSummaryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload a student PDF and convert it into MCQs",
)
async def create_upload(
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
    file: UploadFile = File(...),
    exam_id: str | None = Query(default=None),
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

    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded PDF exceeds the 15 MB limit.",
        )

    exam = validate_exam_for_upload(db, exam_id)

    upload = StudentUpload(
        user_id=user.id,
        exam_id=exam.id if exam is not None else None,
        filename=file.filename,
        upload_path="",
        file_size_bytes=len(file_bytes),
        status=JobStatusEnum.pending,
        processing_mode="queued",
        question_count=0,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    background_tasks.add_task(
        process_student_upload,
        str(upload.id),
        file.filename,
        file_bytes,
    )

    return {
        "upload_id": str(upload.id),
        "exam_id": str(upload.exam_id) if upload.exam_id else None,
        "exam_title": exam.title if exam is not None else None,
        "filename": upload.filename,
        "file_size_bytes": int(upload.file_size_bytes or 0),
        "status": getattr(upload.status, "value", upload.status),
        "lifecycle_state": "queued",
        "progress_pct": 10,
        "processing_mode": upload.processing_mode,
        "question_count": 0,
        "extracted_text_preview": None,
        "error_message": None,
        "can_retry": False,
        "last_error": None,
        "job_summary": {
            "question_count": 0,
            "preview_ready": False,
            "processing_mode": upload.processing_mode,
        },
        "provenance": {
            "generation_source": upload.processing_mode,
            "fallback_used": False,
            "confidence_label": "unknown",
            "preview_ready": False,
        },
        "created_at": upload.created_at.isoformat() if upload.created_at else "",
        "updated_at": upload.updated_at.isoformat() if upload.updated_at else "",
    }


@router.get(
    "/",
    response_model=list[StudentUploadSummaryResponse],
    summary="List current student's uploads",
)
def uploads(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
    limit: int = Query(default=25, ge=1, le=100),
) -> list[dict]:
    return list_student_uploads(str(user.id), db, limit=limit)


@router.get(
    "/{upload_id}",
    response_model=StudentUploadDetailResponse,
    summary="Get current student's upload details",
)
def upload_detail(
    upload_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return get_student_upload(str(user.id), upload_id, db)


@router.delete(
    "/{upload_id}",
    summary="Delete a current student's upload",
)
def remove_upload(
    upload_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return delete_student_upload(str(user.id), upload_id, db)


@router.post(
    "/{upload_id}/retry",
    response_model=StudentUploadSummaryResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Retry processing a student's stored PDF upload",
)
def retry_upload(
    upload_id: str,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    upload, file_bytes = prepare_student_upload_retry(str(user.id), upload_id, db)
    background_tasks.add_task(
        process_student_upload,
        str(upload.id),
        upload.filename,
        file_bytes,
    )
    return get_student_upload(str(user.id), upload_id, db)
