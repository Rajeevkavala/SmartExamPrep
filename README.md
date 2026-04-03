# SmartExamPrep

SmartExamPrep is a full-stack learning platform with a FastAPI backend, a Next.js frontend, and an ML pipeline for adaptive learning.

## Monorepo Structure

- `frontend/` - Next.js 14 App Router application
- `backend/` - FastAPI + SQLAlchemy backend
- `ml/` - Offline ML training scripts and model artifacts

## Prerequisites

- Python 3.11+
- Node.js 20+
- npm 10+
- Docker Desktop (for PostgreSQL via Docker Compose)

## 1. Environment Setup

1. Copy environment template:
   - Windows PowerShell:
     ```powershell
     Copy-Item .env.example .env
     ```
2. Update `.env` values as needed.

## 2. Start PostgreSQL (Docker)

```powershell
docker-compose up -d postgres
```

## 3. Backend Setup

```powershell
Set-Location backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API health check:
- http://localhost:8000/health

## 4. Frontend Setup

```powershell
Set-Location frontend
npm install
npm run dev
```

Frontend URL:
- http://localhost:3000

## 5. ML Setup (Optional for initial development)

```powershell
Set-Location ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Notes

- Frontend calls backend using `NEXT_PUBLIC_API_URL`.
- Backend service in Docker Compose is exposed on port `8000`.
- PostgreSQL service is exposed on port `5432`.
