# PHASE 5 — BACKEND API DEVELOPMENT (FastAPI)

> **Goal:** Build all FastAPI routers, services, middleware, and dependency injection for the complete SmartExamPrep backend — student APIs, admin CRUD, web scraper, and PDF syllabus extraction.

---

## 1. FastAPI App Entry (`backend/main.py`)

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from database import Base, engine
from ml.nlp_pipeline import load_nlp_models
from ml.weakness_detector import WeaknessDetector

from routers import auth, quiz, analysis, revision, content, ai
from routers import admin_content, admin_questions, scraper, syllabus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables + load ML models
    Base.metadata.create_all(bind=engine)
    load_nlp_models()
    logger.info("✅ NLP models loaded")
    yield
    # Shutdown: cleanup (if needed)

app = FastAPI(
    title="SmartExamPrep API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://smartexamprep.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Student Routers
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(quiz.router,     prefix="/api/quiz",     tags=["Quiz"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(revision.router, prefix="/api/revision", tags=["Revision"])
app.include_router(content.router,  prefix="/api/content",  tags=["Content"])
app.include_router(ai.router,       prefix="/api/ai",       tags=["AI"])

# Admin Routers
app.include_router(admin_content.router,   prefix="/api/admin/content",   tags=["Admin-Content"])
app.include_router(admin_questions.router, prefix="/api/admin/questions", tags=["Admin-Questions"])
app.include_router(scraper.router,         prefix="/api/admin/scraper",   tags=["Admin-Scraper"])
app.include_router(syllabus.router,        prefix="/api/admin/syllabus",  tags=["Admin-Syllabus"])

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 2. Database Setup (`backend/database.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 3. Config & Dependencies (`backend/dependencies.py`)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from database import get_db
from models.models import User
from config import settings

bearer = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    user = db.query(User).filter_by(id=user_id, is_active=True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def require_student(user: User = Depends(get_current_user)) -> User:
    return user  # Any authenticated user can access student routes
```

---

## 4. Auth Router (`backend/routers/auth.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas.auth_schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from services.auth_service import create_user, authenticate_user, create_token
from dependencies import get_current_user
from models.models import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=201)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(email=req.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")
    user = create_user(req, db)
    return user

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(req.email, req.password, db)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    token = create_token({"sub": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
```

### Auth Service (`backend/services/auth_service.py`)

```python
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from config import settings
from models.models import User
from schemas.auth_schemas import RegisterRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_user(req: RegisterRequest, db) -> User:
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role="student"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(email: str, password: str, db):
    user = db.query(User).filter_by(email=email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
```

---

## 5. Quiz Router (`backend/routers/quiz.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_student
from schemas.quiz_schemas import SubmitQuizRequest, QuizResultResponse
from services.quiz_service import get_diagnostic_questions, process_quiz_submission
from services.recommendation_service import get_adaptive_questions

router = APIRouter()

@router.get("/diagnostic")
def diagnostic_quiz(
    db: Session = Depends(get_db),
    user=Depends(require_student)
):
    questions = get_diagnostic_questions(db)
    return {"questions": questions, "total": len(questions)}

@router.post("/submit", response_model=QuizResultResponse)
async def submit_quiz(
    req: SubmitQuizRequest,
    db: Session = Depends(get_db),
    user=Depends(require_student)
):
    result = await process_quiz_submission(user.id, req, db)
    return result

@router.get("/adaptive")
def adaptive_quiz(
    db: Session = Depends(get_db),
    user=Depends(require_student)
):
    questions = get_adaptive_questions(user, db)
    return {"questions": questions, "total": len(questions)}
```

---

## 6. Analysis Router (`backend/routers/analysis.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_student
from services.weakness_service import get_weakness_analysis
from services.dashboard_service import get_dashboard_data

router = APIRouter()

@router.get("/weakness")
def weakness(db: Session = Depends(get_db), user=Depends(require_student)):
    return get_weakness_analysis(user.id, db)

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user=Depends(require_student)):
    return get_dashboard_data(user.id, db)
```

---

## 7. Revision Router (`backend/routers/revision.py`)

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_student
from models.models import RevisionSchedule
from datetime import datetime

router = APIRouter()

class MarkDoneRequest(BaseModel):
    topic_id: str

@router.get("/plan")
def revision_plan(db: Session = Depends(get_db), user=Depends(require_student)):
    today = datetime.utcnow().date()
    schedules = (
        db.query(RevisionSchedule)
        .filter(
            RevisionSchedule.user_id == user.id,
            RevisionSchedule.is_done == False,
            RevisionSchedule.due_date <= datetime.utcnow()
        )
        .join(RevisionSchedule.topic)
        .all()
    )
    return {"revision_items": [
        {
            "topic_id": s.topic_id,
            "topic_name": s.topic.name,
            "subject_name": s.topic.subject.name,
            "due_date": s.due_date.isoformat(),
            "interval_days": s.interval_days,
            "last_score_pct": s.last_score_pct
        } for s in schedules
    ]}

@router.post("/mark-done")
def mark_done(
    req: MarkDoneRequest,
    db: Session = Depends(get_db),
    user=Depends(require_student)
):
    schedule = db.query(RevisionSchedule).filter_by(
        user_id=user.id, topic_id=req.topic_id
    ).first()
    if schedule:
        schedule.is_done = True
        db.commit()
    return {"success": True}
```

---

## 8. AI Router (`backend/routers/ai.py`)

```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_student
from services.gemini_service import generate_weakness_explanation
from models.models import TopicMastery, Topic

router = APIRouter()

class ExplainRequest(BaseModel):
    topic_id: str

@router.post("/explain")
async def explain(
    req: ExplainRequest,
    db: Session = Depends(get_db),
    user=Depends(require_student)
):
    mastery = db.query(TopicMastery).filter_by(
        user_id=user.id, topic_id=req.topic_id
    ).first()
    topic = db.query(Topic).filter_by(id=req.topic_id).first()

    if not mastery or not topic:
        return {"explanation": "No data available for this topic yet."}

    explanation = await generate_weakness_explanation(
        topic_name=topic.name,
        subject_name=topic.subject.name,
        weakness_score=mastery.weakness_score,
        accuracy=mastery.accuracy,
        repeated_mistakes=0,
        avg_response_time_s=mastery.avg_response_time_s
    )
    return {"explanation": explanation, "topic_name": topic.name}
```

---

## 9. Admin Content Router (`backend/routers/admin_content.py`)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models.models import Subject, Topic
from schemas.admin_schemas import SubjectCreate, SubjectUpdate, TopicCreate, TopicUpdate

router = APIRouter()

# --- Subjects ---

@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db), admin=Depends(require_admin)):
    subjects = db.query(Subject).order_by(Subject.display_order).all()
    return [{"id": s.id, "name": s.name, "topic_count": len(s.topics)} for s in subjects]

@router.post("/subjects", status_code=201)
def create_subject(req: SubjectCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    existing = db.query(Subject).filter_by(name=req.name).first()
    if existing:
        raise HTTPException(400, "Subject already exists")
    s = Subject(**req.dict())
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/subjects/{subject_id}")
def update_subject(subject_id: str, req: SubjectUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    s = db.query(Subject).filter_by(id=subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    for k, v in req.dict(exclude_none=True).items():
        setattr(s, k, v)
    db.commit()
    return s

@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    s = db.query(Subject).filter_by(id=subject_id).first()
    if not s:
        raise HTTPException(404, "Subject not found")
    db.delete(s)
    db.commit()
    return {"deleted": True}

# --- Topics ---

@router.get("/subjects/{subject_id}/topics")
def list_topics(subject_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(Topic).filter_by(subject_id=subject_id).all()

@router.post("/subjects/{subject_id}/topics", status_code=201)
def create_topic(subject_id: str, req: TopicCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    t = Topic(subject_id=subject_id, **req.dict())
    db.add(t)
    db.commit()
    db.refresh(t)
    return t

@router.put("/topics/{topic_id}")
def update_topic(topic_id: str, req: TopicUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    t = db.query(Topic).filter_by(id=topic_id).first()
    if not t:
        raise HTTPException(404, "Topic not found")
    for k, v in req.dict(exclude_none=True).items():
        setattr(t, k, v)
    db.commit()
    return t

@router.delete("/topics/{topic_id}")
def delete_topic(topic_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    t = db.query(Topic).filter_by(id=topic_id).first()
    if not t:
        raise HTTPException(404, "Topic not found")
    db.delete(t)
    db.commit()
    return {"deleted": True}
```

---

## 10. Admin Questions Router (`backend/routers/admin_questions.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models.models import Question
from schemas.admin_schemas import QuestionCreate, QuestionUpdate, BulkVerifyRequest
from ml.nlp_pipeline import extract_tags, embed_text

router = APIRouter()

@router.get("/")
def list_questions(
    subject_id: str | None = Query(None),
    topic_id: str | None = Query(None),
    difficulty: str | None = Query(None),
    source_type: str | None = Query(None),
    is_verified: bool | None = Query(None),
    year: int | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    q = db.query(Question)
    if subject_id: q = q.filter_by(subject_id=subject_id)
    if topic_id: q = q.filter_by(topic_id=topic_id)
    if difficulty: q = q.filter_by(difficulty=difficulty)
    if source_type: q = q.filter_by(source_type=source_type)
    if is_verified is not None: q = q.filter_by(is_verified=is_verified)
    if year: q = q.filter_by(year=year)
    if search: q = q.filter(Question.question_text.ilike(f"%{search}%"))
    total = q.count()
    questions = q.offset(offset).limit(limit).all()
    return {"total": total, "questions": questions}

@router.get("/{question_id}")
def get_question(question_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    q = db.query(Question).filter_by(id=question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    return q

@router.post("/", status_code=201)
def create_question(req: QuestionCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    tags = extract_tags(req.question_text)
    question = Question(
        **req.dict(),
        nlp_keyword_tags=tags,
        is_verified=True,
        created_by=admin.id
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question

@router.put("/{question_id}")
def update_question(question_id: str, req: QuestionUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    q = db.query(Question).filter_by(id=question_id).first()
    if not q:
        raise HTTPException(404, "Question not found")
    for k, v in req.dict(exclude_none=True).items():
        setattr(q, k, v)
    db.commit()
    return q

@router.delete("/{question_id}")
def delete_question(question_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    q = db.query(Question).filter_by(id=question_id).first()
    if not q:
        raise HTTPException(404, "Not found")
    db.delete(q)
    db.commit()
    return {"deleted": True}

@router.post("/{question_id}/verify")
def verify_question(question_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    q = db.query(Question).filter_by(id=question_id).first()
    if not q:
        raise HTTPException(404, "Not found")
    q.is_verified = True
    db.commit()
    return {"verified": True}

@router.post("/bulk-verify")
def bulk_verify(req: BulkVerifyRequest, db: Session = Depends(get_db), admin=Depends(require_admin)):
    updated = db.query(Question).filter(
        Question.id.in_(req.question_ids)
    ).update({"is_verified": True}, synchronize_session=False)
    db.commit()
    return {"verified_count": updated}
```

---

## 11. Scraper Router (`backend/routers/scraper.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models.models import ScrapeJob
from schemas.scraper_schemas import ScrapeStartRequest, ImportJobRequest
from services.scraper_service import run_scrape_job, import_scraped_questions
import uuid

router = APIRouter()

@router.post("/start", status_code=202)
async def start_scrape(
    req: ScrapeStartRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    job = ScrapeJob(
        id=str(uuid.uuid4()),
        url=str(req.url),
        initiated_by_id=admin.id,
        notes=req.notes,
        status="pending"
    )
    db.add(job)
    db.commit()
    # Run scraping in background
    background_tasks.add_task(run_scrape_job, job.id, str(req.url))
    return {"job_id": job.id, "status": "pending"}

@router.get("/jobs")
def list_jobs(
    limit: int = 20, offset: int = 0,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    jobs = db.query(ScrapeJob).order_by(ScrapeJob.created_at.desc()).offset(offset).limit(limit).all()
    return jobs

@router.get("/jobs/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    job = db.query(ScrapeJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Job not found")
    return job

@router.post("/jobs/{job_id}/import")
def import_job(
    job_id: str,
    req: ImportJobRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    count = import_scraped_questions(job_id, req.accepted_indices, admin.id, db)
    return {"imported": count}

@router.delete("/jobs/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    job = db.query(ScrapeJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(404, "Not found")
    db.delete(job)
    db.commit()
    return {"deleted": True}
```

---

## 12. Syllabus Router (`backend/routers/syllabus.py`)

```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from dependencies import require_admin
from models.models import SyllabusUpload
from schemas.syllabus_schemas import ImportSyllabusRequest
from services.syllabus_service import process_syllabus_upload, import_syllabus_to_db
import uuid

router = APIRouter()

@router.post("/upload", status_code=202)
async def upload_syllabus(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    upload = SyllabusUpload(
        id=str(uuid.uuid4()),
        uploaded_by_id=admin.id,
        filename=file.filename,
        upload_path="",
        status="pending"
    )
    db.add(upload)
    db.commit()
    background_tasks.add_task(process_syllabus_upload, upload.id, file)
    return {"upload_id": upload.id, "status": "pending"}

@router.get("/uploads")
def list_uploads(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(SyllabusUpload).order_by(SyllabusUpload.created_at.desc()).all()

@router.get("/uploads/{upload_id}")
def get_upload(upload_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    upload = db.query(SyllabusUpload).filter_by(id=upload_id).first()
    if not upload:
        raise HTTPException(404, "Upload not found")
    return upload

@router.post("/uploads/{upload_id}/import")
def import_syllabus(
    upload_id: str,
    req: ImportSyllabusRequest,
    db: Session = Depends(get_db),
    admin=Depends(require_admin)
):
    result = import_syllabus_to_db(upload_id, req.structure, admin.id, db)
    return result

@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    upload = db.query(SyllabusUpload).filter_by(id=upload_id).first()
    if not upload:
        raise HTTPException(404, "Not found")
    db.delete(upload)
    db.commit()
    return {"deleted": True}
```

---

## 13. Scraper Service (`backend/services/scraper_service.py`)

```python
import httpx
from bs4 import BeautifulSoup
from services.gemini_service import classify_questions_with_gemini
from models.models import ScrapeJob, Question, Subject, Topic
from database import SessionLocal
from ml.nlp_pipeline import extract_tags
import json

async def run_scrape_job(job_id: str, url: str):
    """Background task: fetch → parse → classify → update job record."""
    db = SessionLocal()
    job = db.query(ScrapeJob).filter_by(id=job_id).first()
    try:
        job.status = "processing"
        db.commit()

        # Step 1: Fetch HTML
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, follow_redirects=True)
            html = response.text

        job.raw_html = html[:50000]  # Store first 50KB

        # Step 2: Parse with BS4
        raw_questions = parse_html_questions(html)

        if not raw_questions:
            job.status = "failed"
            job.error_message = "No questions could be parsed from this URL."
            db.commit()
            return

        # Step 3: Classify with Gemini
        structured = await classify_questions_with_gemini(raw_questions)

        job.extracted_questions = structured
        job.status = "done"
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
    finally:
        db.close()

def parse_html_questions(html: str) -> list[str]:
    """
    Site-agnostic BS4 parser.
    Extracts blocks of text that look like exam questions.
    Heuristic: find numbered items, paragraphs with A./B./C./D. options nearby.
    """
    soup = BeautifulSoup(html, "html.parser")
    candidates = []

    # Strategy 1: Look for common GFG/exam site patterns
    for elem in soup.select(".question-body, .qtext, .question, article p"):
        text = elem.get_text(separator=" ", strip=True)
        if len(text) > 50 and any(opt in text for opt in ["A.", "B.", "(A)", "(B)"]):
            candidates.append(text[:2000])

    # Strategy 2: Fallback — extract all paragraphs with option-like structure
    if not candidates:
        for p in soup.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 60 and ("A." in text or "(A)" in text):
                candidates.append(text[:2000])

    return candidates[:20]  # Cap at 20 questions per scrape

def import_scraped_questions(job_id: str, accepted_indices: list[int], admin_id: str, db) -> int:
    """Import accepted extracted questions into the questions table."""
    job = db.query(ScrapeJob).filter_by(id=job_id).first()
    if not job or not job.extracted_questions:
        return 0

    count = 0
    for idx in accepted_indices:
        if idx >= len(job.extracted_questions):
            continue
        q_data = job.extracted_questions[idx]

        # Find or create subject + topic
        subject = db.query(Subject).filter_by(name=q_data.get("subject", "")).first()
        topic = None
        if subject:
            topic = db.query(Topic).filter_by(
                subject_id=subject.id, name=q_data.get("topic", "")
            ).first()

        if not subject or not topic:
            continue  # Skip if subject/topic not in DB yet

        question = Question(
            subject_id=subject.id,
            topic_id=topic.id,
            subtopic=q_data.get("subtopic"),
            question_text=q_data["question_text"],
            options=q_data["options"],
            question_image_urls=q_data.get("question_image_urls", []),
            correct_answer=q_data["correct_answer"],
            explanation=q_data.get("explanation"),
            difficulty=q_data.get("difficulty", "medium"),
            source_type="scraped",
            source_url=job.url,
            year=q_data.get("year"),
            nlp_keyword_tags=extract_tags(q_data["question_text"]),
            is_verified=True,
            created_by=admin_id,
            scrape_job_id=job_id
        )
        db.add(question)
        count += 1

    job.questions_imported = (job.questions_imported or 0) + count
    db.commit()
    return count
```

---

## 14. Syllabus Service (`backend/services/syllabus_service.py`)

```python
import pdfplumber
import aiofiles
import os
from pathlib import Path
from fastapi import UploadFile
from services.gemini_service import parse_syllabus_with_gemini
from models.models import SyllabusUpload, Subject, Topic
from database import SessionLocal

UPLOAD_DIR = Path("uploads/syllabi")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

async def process_syllabus_upload(upload_id: str, file: UploadFile):
    """Background task: save PDF → extract text → Gemini → update record."""
    db = SessionLocal()
    upload = db.query(SyllabusUpload).filter_by(id=upload_id).first()
    try:
        upload.status = "processing"
        db.commit()

        # Save PDF
        file_path = UPLOAD_DIR / f"{upload_id}_{file.filename}"
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        upload.upload_path = str(file_path)
        db.commit()

        # Extract text with pdfplumber
        raw_text = extract_pdf_text(str(file_path))

        # Parse with Gemini
        structure = await parse_syllabus_with_gemini(raw_text)

        upload.extracted_structure = structure
        upload.status = "done"
        db.commit()

    except Exception as e:
        upload.status = "failed"
        upload.error_message = str(e)
        db.commit()
    finally:
        db.close()

def extract_pdf_text(path: str) -> str:
    """Extract all text from a PDF using pdfplumber."""
    text_parts = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)

def import_syllabus_to_db(upload_id: str, override_structure: dict | None, admin_id: str, db) -> dict:
    """Upsert Subject + Topic records from extracted structure."""
    upload = db.query(SyllabusUpload).filter_by(id=upload_id).first()
    if not upload:
        return {"error": "Upload not found"}

    structure = override_structure or upload.extracted_structure
    if not structure:
        return {"error": "No extracted structure available"}

    subjects_count = 0
    topics_count = 0

    for subj_data in structure.get("subjects", []):
        # Upsert subject
        subject = db.query(Subject).filter_by(name=subj_data["name"]).first()
        if not subject:
            subject = Subject(name=subj_data["name"])
            db.add(subject)
            db.flush()
            subjects_count += 1

        for topic_data in subj_data.get("topics", []):
            topic = db.query(Topic).filter_by(
                subject_id=subject.id, name=topic_data["name"]
            ).first()
            if not topic:
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_data["name"],
                    subtopics=topic_data.get("subtopics", [])
                )
                db.add(topic)
                topics_count += 1
            else:
                # Merge subtopics
                existing = set(topic.subtopics or [])
                new_subs = set(topic_data.get("subtopics", []))
                topic.subtopics = list(existing | new_subs)

    upload.subjects_imported = subjects_count
    upload.topics_imported = topics_count
    db.commit()

    return {
        "subjects_created": subjects_count,
        "topics_created": topics_count
    }
```

---

## 15. Gemini Service (`backend/services/gemini_service.py`)

```python
import google.generativeai as genai
import json
import re
from config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")

FALLBACK_EXPLANATION = (
    "Based on your performance, this topic needs more attention. "
    "Review the fundamentals and try practice questions at lower difficulty first."
)

async def generate_weakness_explanation(
    topic_name: str, subject_name: str, weakness_score: float,
    accuracy: float, repeated_mistakes: int, avg_response_time_s: float
) -> str:
    prompt = f"""
You are a GATE CSE exam coach. A student has these statistics for {topic_name} ({subject_name}):
- Weakness Score: {weakness_score:.0f}/100
- Accuracy: {accuracy * 100:.1f}%
- Repeated Mistakes: {repeated_mistakes}
- Avg Response Time: {avg_response_time_s:.0f}s

Write 2-3 sentences: why struggling, what to focus on, one next step. Plain text only.
""".strip()
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception:
        return FALLBACK_EXPLANATION

async def classify_questions_with_gemini(raw_texts: list[str]) -> list[dict]:
    results = []
    for raw in raw_texts:
        prompt = f"""
You are a GATE CSE question classifier. Given this raw question text, return ONLY a valid JSON object:
{{
  "question_text": "cleaned question",
    "question_image_urls": ["https://example.com/pyq/image-1.png"],
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "correct_answer": "A",
  "explanation": "detailed explanation",
  "subject": "Operating Systems",
  "topic": "CPU Scheduling",
  "subtopic": "Round Robin",
  "difficulty": "medium",
  "year": null,
  "source_type": "PYQ"
}}
Raw text: {raw[:1500]}
""".strip()
        try:
            response = model.generate_content(prompt)
            json_str = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_str:
                results.append(json.loads(json_str.group()))
        except Exception:
            continue
    return results

async def parse_syllabus_with_gemini(raw_text: str) -> dict:
    prompt = f"""
You are a university syllabus parser. Return ONLY a valid JSON object:
{{
  "subjects": [
    {{
      "name": "Subject Name",
      "topics": [
        {{"name": "Topic Name", "subtopics": ["subtopic 1", "subtopic 2"]}}
      ]
    }}
  ]
}}
Syllabus text: {raw_text[:4000]}
""".strip()
    try:
        response = model.generate_content(prompt)
        json_str = re.search(r'\{.*\}', response.text, re.DOTALL)
        if json_str:
            return json.loads(json_str.group())
    except Exception:
        pass
    return {"subjects": []}
```

---

## 16. PYQ Image Support Addendum

Apply these backend rules across all relevant routers/services:

- Add `question_image_urls` to Question ORM model, create/update schemas, list/detail responses, and seed/import payloads.
- In `/api/admin/questions` create/update endpoints, validate image URL arrays and persist in order.
- In scraper pipeline, extract image URLs from HTML and include them in `extracted_questions` structured JSON.
- In import flow from scrape jobs, copy `question_image_urls` into `Question` rows.
- In student quiz endpoints (`/diagnostic`, `/adaptive`), include `question_image_urls` so the frontend can render all PYQ diagrams.
