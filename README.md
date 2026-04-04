# SmartExamPrep

SmartExamPrep is a full-stack learning platform with a FastAPI backend, Next.js frontend, and ML pipeline.

## Quick Start

### Backend
1. cp .env.example .env && fill in values
2. docker-compose up -d postgres
3. cd backend && pip install -r requirements.txt
4. python -m spacy download en_core_web_sm
5. alembic upgrade head
6. python seed.py
7. uvicorn main:app --reload

### ML Training (optional)
1. cd ml && pip install -r requirements.txt
2. python generate_synthetic_data.py
3. python train_weakness_model.py
4. python export_model.py

### Frontend
1. cd frontend && npm install
2. cp .env.example .env.local && set NEXT_PUBLIC_API_URL
3. npm run dev -> http://localhost:3000

### Admin Login
Email: admin@smartexamprep.com
Password: Admin@1234

## Deployment Notes
- frontend/vercel.json contains a rewrite with a placeholder backend URL.
- Replace YOUR_BACKEND_URL in frontend/vercel.json with your deployed backend host.
