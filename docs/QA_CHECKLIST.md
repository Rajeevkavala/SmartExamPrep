# SmartExamPrep QA Checklist

Use this as the manual end-to-end verification plan for final product sign-off.

## Pre-QA Setup

- Start PostgreSQL and backend.
- Run `python backend/seed.py`.
- Run `python backend/seed_demo.py`.
- Start frontend with `npm run dev` inside `frontend/`.
- Confirm backend health at `GET /health`.
- Confirm frontend login page loads at `/login`.

## Recommended Testing Sequence

1. Smoke check infrastructure.
2. Student auth and onboarding.
3. Diagnostic quiz and result analysis.
4. Adaptive quiz and revision flow.
5. Dashboard and AI explanation.
6. Admin content CRUD.
7. Admin ingestion flows: scraper and syllabus upload.
8. Edge cases and failure states.
9. Production-readiness sanity checks.

## Bug Severity

- `P0`: Product unusable, data loss, auth broken, deploy blocker.
- `P1`: Core flow broken but workaround exists.
- `P2`: Wrong analytics, weak UX, inconsistent validation, partial feature break.
- `P3`: Cosmetic issue, copy issue, layout polish, low-risk mismatch.

## Pass / Fail Format

Use this row format for every test:

| ID | Flow | Scenario | Expected Result | Actual Result | Status | Severity | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S-01 | Student Auth | Register new user | Account created and redirected to onboarding |  | Pass / Fail | P0-P3 |  |

## Student Flow Checklist

| ID | Flow | Scenario | Expected Result |
| --- | --- | --- | --- |
| S-01 | Register | Register with valid email and password | Student account is created and accessible through login |
| S-02 | Register | Register with existing email | Clear validation error, no duplicate account |
| S-03 | Login | Student login with valid credentials | Token stored, protected routes accessible |
| S-04 | Login | Invalid password | User stays on login page with clear error |
| S-05 | Onboarding | Save daily study minutes and experience level | Data persists and route moves to diagnostic quiz |
| S-06 | Diagnostic Quiz | Load diagnostic quiz | Verified question set loads with progress bar |
| S-07 | Diagnostic Quiz | Submit all questions | Attempt is created, result page opens, topic breakdown visible |
| S-08 | Result Analysis | Refresh result page | Result still loads using persisted backend snapshot |
| S-09 | Dashboard | Open dashboard after diagnostic | Readiness score, weakest topics, strongest topics, subject progress visible |
| S-10 | AI Explanation | Dashboard loads AI explanation | Weak-topic explanation appears, fallback copy appears if providers fail |
| S-11 | Adaptive Quiz | Open adaptive quiz after diagnostic | Weak-topic-focused question set loads |
| S-12 | Adaptive Quiz | Submit adaptive quiz | Result page shows score plus before/after topic comparison |
| S-13 | Revision Plan | Open revision page | Due revision items appear with due date and score context |
| S-14 | Revision Plan | Mark revision item done | Item disappears on refresh and schedule updates |
| S-15 | Dashboard Loop | Return to dashboard after adaptive + revision | Readiness and weak-topic ordering reflect recent work |
| S-16 | Feedback | Submit product feedback from `/feedback` | Ratings are saved and visible in student feedback history |

## Admin Flow Checklist

| ID | Flow | Scenario | Expected Result |
| --- | --- | --- | --- |
| A-01 | Admin Login | Login with admin credentials | Admin dashboard loads |
| A-02 | Subjects CRUD | Create subject | Subject appears in list with correct topic count |
| A-03 | Subjects CRUD | Edit subject name/description/order | Updated values persist after refresh |
| A-04 | Topics CRUD | Create topic under subject | Topic appears under correct subject |
| A-05 | Topics CRUD | Edit topic subtopics and NLP tags | Changes persist and list renders correctly |
| A-06 | Topics CRUD | Delete topic | Topic and dependent question references are removed safely |
| A-07 | Questions CRUD | Create verified question | Question appears in admin list and can be used in quizzes |
| A-08 | Questions CRUD | Edit question difficulty/source/year | Filters and detail view show updated data |
| A-09 | Questions Validation | Invalid subject/topic combination | API rejects request with clear message |
| A-10 | Question Verification | Bulk verify unverified questions | Verification count matches selection |
| A-11 | Scraper | Start scrape job with valid URL | Job enters pending or processing, later done or failed |
| A-12 | Scraper | Import selected scraped questions | Imported question count increments on job |
| A-13 | Syllabus Upload | Upload valid PDF | Upload enters processing, later done with extracted structure |
| A-14 | Syllabus Import | Import parsed syllabus | Subjects/topics created or merged without duplication |
| A-15 | Admin Dashboard | Open `/admin` | Counts for questions, unverified items, jobs, uploads are sane |

## Failure-State Checklist

- Submit quiz with duplicate `question_id` values.
- Submit quiz with unknown `question_id`.
- Load adaptive quiz with no mastery history.
- Load dashboard with provider keys missing.
- Upload non-PDF syllabus file.
- Upload empty PDF file.
- Start scraper on page with no parseable question content.
- Create question with fewer than four options.
- Update question with mismatched subject and topic.
- Hit protected student route after logout.
- Hit admin route as student.

## Production Sign-Off Checks

- `frontend` production build passes with `npm run build`.
- Backend imports compile successfully.
- `.env.example` covers all required production variables.
- Result page works after reload.
- Feedback form submits and stores data.
- Analytics endpoint returns non-empty metrics for seeded demo users.
