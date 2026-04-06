# Bugs And Gaps Register

Keep this file as the working defect and readiness register during the final stretch.

## Confirmed / Observed

| ID | Area | Status | Severity | Detail | Action |
| --- | --- | --- | --- | --- | --- |
| G-01 | Quiz Result Persistence | Fixed | P1 | Result page previously depended on local Zustand state only. | Fixed by persisting `QuizAttempt.result_snapshot` and adding `/api/quiz/attempts/{attempt_id}`. |
| G-02 | Production CORS | Fixed | P0 | Backend used wildcard origins with credentials, which is not production-safe. | Fixed with `BACKEND_CORS_ORIGINS` config in backend settings. |
| G-03 | Manual API Smoke Script | Fixed | P2 | `backend/test_api_flow.py` called `/api/admin/content/subjects/all`, which does not exist. | Updated script to call `/api/admin/content/subjects`. |
| G-04 | Automated Backend Test Execution | Open | P2 | Root virtualenv did not have `pytest` available during verification. | Added `pytest` to `backend/requirements.txt`; refresh environment before CI runs. |
| G-05 | Seed Breadth | Open | P1 | Base seed creates only a very small question set, which limits realistic adaptive behavior and QA coverage. | Use `backend/seed_demo.py` and expand real verified question inventory. |
| G-06 | Generated Artifact Noise | Fixed | P3 | Playwright reports and root uploads were surfacing as repo noise. | Added ignore rules in `.gitignore`. |
| G-07 | Python Runtime Age | Open | P3 | Google client libraries emitted a Python 3.10 support warning during AI harness execution. | Prefer Python 3.11+ for longer-term compatibility. |

## Likely Review Targets

| ID | Area | Severity | Why It Matters | Review Focus |
| --- | --- | --- | --- | --- |
| R-01 | AI Fallback Quality | P1 | AI explanation or parsing may silently fall back to generic text. | Compare primary provider output quality versus fallback output. |
| R-02 | Adaptive Question Diversity | P1 | Small content pools can make recommendations feel repetitive. | Validate duplicate-avoidance against a larger verified bank. |
| R-03 | Revision Completion Semantics | P2 | `mark-done` marks by topic, not by specific schedule ID. | Confirm this matches intended product behavior. |
| R-04 | Research Trend Fidelity | P2 | Historical readiness trend is now derived from stored attempt snapshots, but older attempts may not have them. | Re-seed or backfill if older data must be used in reports. |
| R-05 | Admin Feedback Review | P3 | Feedback is captured, but there is no dedicated admin UI yet. | Use API or future admin page for review/export. |

## What To Re-Test After Every Backend Change

- Register and login.
- Diagnostic load and submit.
- Adaptive load and submit.
- Result reload by URL.
- Dashboard load with AI providers enabled and disabled.
- Admin subjects CRUD.
- Admin questions CRUD.
- Scraper start and import.
- Syllabus upload and import.
- Feedback submit and history load.

## Exit Criteria For “Ready To Demo”

- No open `P0`.
- No open `P1` on auth, quiz, dashboard, admin CRUD, scraper, or syllabus upload.
- At least 3 seeded personas complete the full student journey without manual DB fixes.
- Metrics endpoint returns believable numbers for demo users.
- Demo script can be run without explaining away broken states.
