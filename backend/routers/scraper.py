from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from dependencies import get_db, require_admin
from models.models import JobStatusEnum, Question, ScrapeJob, User
from schemas.scraper_schemas import ImportJobRequest, ScrapeJobResponse, ScrapeStartRequest
from services.scraper_service import import_scraped_questions, run_scrape_job

router = APIRouter()


def _serialize_job(job: ScrapeJob) -> dict:
	def lifecycle_state() -> str:
		status_value = str(getattr(job.status, "value", job.status) or "").strip().lower()
		if status_value == "pending":
			return "queued"
		if status_value == "processing":
			return "running"
		if status_value == "done":
			return "completed"
		return "failed"

	def progress_pct() -> int:
		status_value = str(getattr(job.status, "value", job.status) or "").strip().lower()
		if status_value == "pending":
			return 10
		if status_value == "processing":
			return 55
		return 100

	return {
		"job_id": str(job.id),
		"url": job.url,
		"status": getattr(job.status, "value", job.status),
		"lifecycle_state": lifecycle_state(),
		"progress_pct": progress_pct(),
		"notes": job.notes,
		"extracted_questions": list(job.extracted_questions or []),
		"questions_imported": int(job.questions_imported or 0),
		"error_message": job.error_message,
		"can_retry": str(getattr(job.status, "value", job.status)) in {"failed", "done"},
		"job_summary": {
			"extracted_count": len(job.extracted_questions or []),
			"questions_imported": int(job.questions_imported or 0),
		},
		"provenance": {
			"classification_source": "ai_structured_scrape",
			"has_error": bool(job.error_message),
		},
		"created_at": job.created_at.isoformat() if job.created_at else "",
	}


@router.post(
	"/start",
	status_code=status.HTTP_202_ACCEPTED,
	summary="Start a new scrape and AI structuring job",
)
async def start_scrape(
	req: ScrapeStartRequest,
	background_tasks: BackgroundTasks,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	job = ScrapeJob(
		url=str(req.url),
		initiated_by_id=admin.id,
		notes=req.notes,
		status=JobStatusEnum.pending,
	)
	db.add(job)
	db.commit()
	db.refresh(job)

	background_tasks.add_task(run_scrape_job, str(job.id), str(req.url))
	return {
		"job_id": str(job.id),
		"status": getattr(job.status, "value", job.status),
	}


@router.get(
	"/jobs",
	response_model=list[ScrapeJobResponse],
	summary="List scrape jobs",
)
def list_jobs(
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
	limit: int = Query(default=20, ge=1, le=100),
	offset: int = Query(default=0, ge=0),
) -> list[dict]:
	_ = admin
	jobs = (
		db.query(ScrapeJob)
		.order_by(ScrapeJob.created_at.desc())
		.offset(offset)
		.limit(limit)
		.all()
	)
	return [_serialize_job(job) for job in jobs]


@router.get(
	"/jobs/{job_id}",
	response_model=ScrapeJobResponse,
	summary="Get scrape job details",
)
def get_job(
	job_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
	if not job:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Job not found.",
		)
	return _serialize_job(job)


@router.post(
	"/jobs/{job_id}/import",
	summary="Import accepted scraped questions",
)
def import_job(
	job_id: str,
	req: ImportJobRequest,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
	if not job:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Job not found.",
		)

	imported_count = import_scraped_questions(job_id, req.accepted_indices, str(admin.id), db)
	return {"imported": imported_count}


@router.delete(
	"/jobs/{job_id}",
	summary="Delete a scrape job",
)
def delete_job(
	job_id: str,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	_ = admin
	job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
	if not job:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Job not found.",
		)

	# Keep imported questions while allowing scrape job cleanup.
	(
		db.query(Question)
		.filter(Question.scrape_job_id == job_id)
		.update({"scrape_job_id": None}, synchronize_session=False)
	)
	db.delete(job)
	db.commit()
	return {"deleted": True}


@router.post(
	"/jobs/{job_id}/retry",
	response_model=ScrapeJobResponse,
	status_code=status.HTTP_202_ACCEPTED,
	summary="Retry a scrape and structuring job",
)
def retry_job(
	job_id: str,
	background_tasks: BackgroundTasks,
	db: Annotated[Session, Depends(get_db)],
	admin: Annotated[User, Depends(require_admin)],
) -> dict:
	job = db.query(ScrapeJob).filter(ScrapeJob.id == job_id).first()
	if not job:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail="Job not found.",
		)

	_ = admin
	job.status = JobStatusEnum.pending
	job.error_message = None
	job.extracted_questions = []
	db.add(job)
	db.commit()
	db.refresh(job)

	background_tasks.add_task(run_scrape_job, str(job.id), str(job.url))
	return _serialize_job(job)
