# Demo Data Plan

The goal is not “more seed rows.” The goal is to create believable study journeys so the app feels alive in demos, QA, and portfolio screenshots.

## Strategy

- Keep the base content seed for subjects, topics, and verified starter questions.
- Layer realistic demo students on top using `backend/seed_demo.py`.
- Seed each student with different readiness, mastery, revision due states, and recent attempts.
- Seed at least one feedback entry per user so the feedback system is not empty.
- Use stable emails and passwords so demo prep does not depend on live registration every time.

## Demo Personas

### 1. Ananya Sharma

- Email: `ananya.diagnostic@example.com`
- Password: `student@1234`
- Story: Strong discipline, recently onboarded, diagnostic exposed OS and DBMS weakness.
- Dashboard should show: medium readiness, a few clear weak topics, active revision items.

### 2. Rohan Verma

- Email: `rohan.comeback@example.com`
- Password: `student@1234`
- Story: Low baseline, revision-heavy recovery profile, clear adaptive improvement.
- Dashboard should show: weak baseline, strong topic-recovery story, overdue revisions.

### 3. Meera Iyer

- Email: `meera.steady@example.com`
- Password: `student@1234`
- Story: Advanced student using adaptive practice for polishing.
- Dashboard should show: high readiness, only a few remaining weak areas.

### 4. Arjun Patel

- Email: `arjun.consistent@example.com`
- Password: `student@1234`
- Story: Balanced performer with algorithm and compiler gaps.
- Dashboard should show: mid-to-high readiness and strong before/after result deltas.

## What The Seed Should Produce

- 3 to 4 quiz attempts per persona.
- At least one diagnostic attempt and two adaptive attempts per persona.
- 5 or more topic mastery rows per persona.
- Due and completed revision schedules mixed together.
- Stored `result_snapshot` data so result URLs are demo-safe after refresh.
- At least one feedback entry per persona.

## Recommended Seed Logic

- Upsert student users by email.
- Clear previous demo-only attempts, masteries, revisions, and feedback for those users.
- Rebuild their current state deterministically.
- Keep content tables untouched so the script can be re-run safely.

## Existing Implementation

- `backend/seed_demo.py` now creates realistic demo users, masteries, revision schedules, attempts, and feedback.
- Use it after `backend/seed.py`.

## Suggested Next Expansion

- Increase verified question inventory so adaptive behavior has a larger realistic pool.
- Add 1 or 2 “almost exam-ready” personas if you want richer final screenshots.
