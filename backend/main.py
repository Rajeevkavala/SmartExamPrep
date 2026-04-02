from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers import (
    admin_content,
    admin_questions,
    ai,
    analysis,
    auth,
    content,
    quiz,
    revision,
    scraper,
    syllabus,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure upload directories exist on startup.
    upload_root = Path(settings.upload_dir)
    (upload_root / "syllabi").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="SmartExamPrep API",
    description="Backend API for SmartExamPrep MVP",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(revision.router, prefix="/api/revision", tags=["Revision"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(admin_content.router, prefix="/api/admin/content", tags=["Admin Content"])
app.include_router(admin_questions.router, prefix="/api/admin/questions", tags=["Admin Questions"])
app.include_router(scraper.router, prefix="/api/admin/scraper", tags=["Admin Scraper"])
app.include_router(syllabus.router, prefix="/api/admin/syllabus", tags=["Admin Syllabus"])
