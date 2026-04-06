# Deployment Checklist

This is the final pre-production checklist for SmartExamPrep.

## Environment Variables

Backend:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `GROQ_API_KEY`
- `UPLOAD_DIR`
- `BACKEND_CORS_ORIGINS`
- `COOKIE_SECURE`
- `COOKIE_SAMESITE`

Frontend:

- `NEXT_PUBLIC_API_URL`

## Code Readiness

- `npm run build` passes in `frontend/`
- backend imports compile without syntax errors
- `.env.example` is current
- `/health` responds with `{"status": "ok"}`
- result page can reload by attempt URL

## Database Readiness

- Run `alembic upgrade head`
- Confirm latest revision includes feedback table and result snapshot column
- Run base seed if deploying demo environment
- Run `seed_demo.py` only for demo or staging, not for real production users

## Frontend Deployment

- Set `NEXT_PUBLIC_API_URL` to production backend base URL
- Run `npm run predeploy:check` in `frontend/` before release
- Confirm middleware-protected routes work with secure cookies under HTTPS

## Backend Deployment

- Set `BACKEND_CORS_ORIGINS` to the real frontend origin
- Set `COOKIE_SECURE=true` in HTTPS production
- Confirm upload directory exists and is writable
- Confirm `GROQ_API_KEY` is present for full AI experience (fallback-only mode is acceptable only if explicitly approved)

## Production Flow

1. Provision PostgreSQL
2. Apply backend environment variables
3. Run migrations
4. Deploy backend
5. Deploy frontend with correct API URL and rewrite
6. Run smoke checks

## Smoke Checks

- `GET /health`
- register student
- login student
- load dashboard
- submit diagnostic quiz
- reload result page
- admin login
- create subject
- create question
- start scraper job
- upload syllabus PDF

## Docker Review Notes

- `docker-compose.yml` is useful for local/staging backend plus Postgres
- add persistent volume strategy for uploaded files if using containers in production
- avoid storing real production secrets in `.env`

## Remaining Deployment Risks

- question inventory may still be too small for strong adaptive demos
- AI provider availability affects explanation richness
- there is no dedicated admin feedback UI yet
