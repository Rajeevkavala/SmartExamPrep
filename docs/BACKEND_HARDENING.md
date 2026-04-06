# Backend Hardening Checklist

Focus on robustness, observability, and predictable failure behavior.

## Already Strengthened

- Env-driven CORS origins instead of wildcard plus credentials
- Persistent quiz result snapshots
- Generic exception handler and request validation formatting
- Lightweight feedback capture endpoints

## Checklist

- Validate all UUID path params before DB access.
- Keep HTTP status codes consistent across routers.
- Ensure all background jobs write status and error message on failure.
- Never let AI provider failure break the student flow.
- Keep scraper and syllabus jobs idempotent enough for retries.
- Add request IDs or correlation IDs for better log tracing.
- Avoid returning raw exception messages to end users in production paths.
- Add explicit timeout and retry strategy for OpenRouter, Groq, and remote scraping calls.
- Review DB transaction boundaries around quiz submission and imports.

## Weak Points To Review

### Auth

- Cookie security should be env-driven in production.
- Verify logout clears both frontend token cookie and local storage.

### Quiz Submission

- Ensure duplicate `question_id` rejection remains covered.
- Review whether unanswered questions defaulting to `"A"` is acceptable product behavior.

### Revision

- Current `mark-done` uses `topic_id`, not schedule row ID.
- Decide whether “mark done” should apply to the latest due row only.

### Scraper

- Review HTML parsing precision on real PYQ sites.
- Log job timing and extraction success rate.

### Syllabus Upload

- Validate very large or scanned PDFs.
- Add upload size guard if needed.

## Optional Structural Improvements

- Add a shared service for analytics snapshot generation.
- Add background job retry counters for scraper and syllabus workflows.
- Add structured JSON logging for API requests and failures.
