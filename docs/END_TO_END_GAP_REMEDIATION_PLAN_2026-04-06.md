# SmartExamPrep End-to-End Gap Analysis and Remediation Plan

Date: 2026-04-06
Scope: Full application (backend, frontend, AI, ML, runtime config, tests, deployment docs)

## 1. Audit Objective

This audit identifies what is currently not working properly end to end, with special focus on:

- AI features failing at runtime
- ML behavior quality and edge-case reliability
- Frontend integration gaps that make features appear broken
- Deployment and test-process gaps that let regressions escape

The goal of this document is not only to list defects, but to provide a concrete, prioritized fix plan.

## 2. How the Audit Was Performed

The analysis used a mixed approach:

- Parallel codebase exploration using subagents (backend AI/ML, frontend integration, infra/docs/test workflow)
- Direct source inspection of critical files
- Reproduction with local commands and tests
- Cross-check of docs/config against actual runtime behavior

### Commands run for evidence

1. Backend AI migration verification script
- `python backend/test_groq_migration.py`
- Result: static checks mostly pass, but live AI route call fails with `AttributeError` in `AIRouter.complete_text`.

2. AI validation harness
- `python backend/run_ai_validation.py`
- Result: fails with `AttributeError: 'AIRouter' object has no attribute '_should_skip_provider'`.

3. Backend tests (full)
- `pytest backend/tests -q`
- Result: test collection errors due stale OpenRouter references (`OPENROUTER_ALLOWED_MODELS` import failures).

4. ML component tests
- `pytest backend/tests/test_phase4_ml_components.py -q`
- Result: passes (56 passed), indicating base ML modules are mostly functional in isolation.

5. Frontend production build
- `npm run build` in `frontend/`
- Result: build succeeds; this indicates runtime/integration issues are not compile-time issues.

6. Targeted runtime probes
- Import `backend/main.py`: succeeds.
- Import `backend/ai/services/startup_health.py`: fails (stale OpenRouter imports).
- Direct call to `AIRouter.complete_text`: fails immediately with missing method.
- Direct call to `AdaptiveRecommender.recommend` with `weakness_score=None`: raises `TypeError`.

## 3. Current Health Snapshot

### Working

- Backend app import/startup path can load.
- Frontend builds successfully.
- Core ML unit tests pass in isolation.

### Not working or high-risk

- AI runtime path is broken for all workloads due a router-level method reference bug.
- Backend test suite is blocked by stale OpenRouter-era tests/modules.
- Production frontend deployment is fragile due placeholder rewrite config.
- Several frontend flows swallow errors or degrade silently.
- Important docs and env templates are inconsistent with current Groq-only provider state.

## 4. Confirmed P0/P1/P2 Gaps (With Fix Actions)

## P0 - Blocking defects (fix first)

### P0.1 AI router runtime crash blocks all AI workloads

What breaks:
- Any feature calling AI routes can fail before provider request execution.

Root cause:
- `backend/ai/services/ai_router.py` references undefined members:
  - `self._should_skip_provider(...)`
  - `is_model_allowed(...)`

Evidence:
- Reproduced in `python backend/run_ai_validation.py`
- Reproduced in direct inline call to `AIRouter.complete_text`

Fix tasks:
1. Remove or implement `_should_skip_provider` and `is_model_allowed` for the Groq-only architecture.
2. Add a router smoke test that invokes `complete_text` with mocked provider and asserts no `AttributeError`.
3. Make this test mandatory in CI.

Definition of done:
- `run_ai_validation.py` passes.
- Live AI call path no longer fails before provider invocation.

---

### P0.2 Stale OpenRouter modules and tests break backend test suite

What breaks:
- `pytest backend/tests -q` fails at collection stage.

Root cause:
- Stale files still import removed constants/settings:
  - `backend/ai/services/startup_health.py`
  - `backend/ai/providers/openrouter_client.py`
  - `backend/tests/test_ai_model_allowlist.py`
  - `backend/tests/test_openrouter_startup_health.py`
  - `backend/tests/test_ai_router_provider_skip.py`

Evidence:
- Import error for `OPENROUTER_ALLOWED_MODELS`
- Attribute error for removed enum member `AIProviderName.OPENROUTER`

Fix tasks:
1. Decide strategy:
   - Preferred: delete OpenRouter-only modules/tests from active code path.
   - Alternative: migrate tests/modules to Groq equivalents.
2. Ensure no active imports point to removed OpenRouter constants.
3. Add lint/test check for forbidden legacy symbols (`OPENROUTER_`, `AIProviderName.OPENROUTER`).

Definition of done:
- `pytest backend/tests -q` runs beyond collection with no OpenRouter import failures.

---

### P0.3 Production frontend routing can fail due placeholder rewrite

What breaks:
- API calls can 404 in production if `frontend/vercel.json` is not manually edited before deployment.

Root cause:
- Rewrite destination contains placeholder:
  - `http://YOUR_BACKEND_URL/api/:path*`

Fix tasks:
1. Replace placeholder approach with a deployment-safe strategy:
   - either remove rewrite and call backend via `NEXT_PUBLIC_API_URL`
   - or maintain environment-specific rewrite templates outside committed file.
2. Add deployment check script validating rewrite target before release.

Definition of done:
- Frontend deployment works without manual file edits.

---

### P0.4 AI validation harness currently fails (regression gate broken)

What breaks:
- Team cannot trust AI readiness signal.

Root cause:
- Validation harness depends on router path that currently crashes.

Fix tasks:
1. Fix P0.1 first.
2. Convert `run_ai_validation.py` into CI job stage.
3. Ensure script exits non-zero for all AI route regressions.

Definition of done:
- `python backend/run_ai_validation.py` passes locally and in CI.

## P1 - High-impact reliability and quality gaps

### P1.1 Adaptive recommender crashes on nullable `weakness_score`

Root cause:
- `backend/ml/adaptive_recommender.py` uses `float(tm.get("weakness_score", 0.0))`.
- If value is `None`, `TypeError` is raised.

Evidence:
- Reproduced with direct runtime probe.

Fix tasks:
1. Replace with safe conversion:
   - `weakness_score = float((tm.get("weakness_score") or 0.0))`
2. Clamp to expected range (0..100).
3. Add unit test for `None`, string, NaN-like values.

---

### P1.2 Silent NLP startup degradation (no observability)

Root cause:
- `backend/main.py` catches NLP load exceptions with `except Exception: pass`.

Impact:
- System may silently run in degraded mode without operator visibility.

Fix tasks:
1. Log exception and degraded-mode warning.
2. Expose NLP readiness flags in a health/status endpoint.
3. Add startup diagnostics in logs and dashboard.

---

### P1.3 Frontend API client lacks explicit timeout and cancellation strategy

Root cause:
- `frontend/lib/api.ts` does not set timeout in axios instance.
- No global abort strategy for request teardown/logout/race flows.

Impact:
- User sees indefinite loading on slow AI calls.
- Potential stale updates when requests return out of order.

Fix tasks:
1. Set explicit timeout (for example 60s, with UI messaging at 30s+).
2. Use `AbortController` (or axios cancellation) for route changes and exam/session switches.
3. Add retry policy only where idempotent and safe.

---

### P1.4 Frontend chat flow swallows session-load failures and has unhandled create-session error path

Root cause:
- `frontend/app/(student)/chat/page.tsx`:
  - `loadSession` catch block clears messages without surfacing error.
  - `createSession` has no local try/catch.

Impact:
- UI can appear broken or empty with weak error feedback.

Fix tasks:
1. Introduce distinct state for session-load error vs send-message error.
2. Add explicit error handling for session creation.
3. Show retry CTA at session level (not only full-page empty state).

---

### P1.5 Adaptive quiz degrades silently and can submit fabricated defaults

Root cause:
- `frontend/app/(student)/quiz/adaptive/page.tsx`:
  - Weakness fetch failures are silently replaced with empty list.
  - Unanswered questions submit default `selected_answer: "A"`.

Impact:
- Quality metrics and comparisons can be misleading.
- Users can accidentally submit invalid answer state.

Fix tasks:
1. Require explicit unanswered-question handling before submit.
2. Display warning if weakness baseline unavailable.
3. Distinguish session-expired (404/410) from generic load failure.

---

### P1.6 Partial failure handling is weak in analytics/roadmap flows

Root cause:
- `frontend/app/(student)/progress/page.tsx` uses `Promise.all`; one failure drops whole page.
- `frontend/app/(student)/roadmap/page.tsx` week-complete executes many patches in parallel without partial-failure reconciliation.

Fix tasks:
1. Use `Promise.allSettled` for multi-source dashboards.
2. Add transactional backend endpoint for "mark full week complete".
3. Return operation summary for partially completed actions.

---

### P1.7 Legacy provider wording still present in user-facing errors

Root cause:
- `backend/services/student_upload_service.py` fallback message mentions "configure OpenRouter or Groq".

Impact:
- Confuses users and operators because architecture is now Groq-only.

Fix tasks:
1. Update message to current provider strategy.
2. Sweep user-visible strings for legacy provider references.

## P2 - Process, docs, and hardening gaps

### P2.1 Environment and deployment docs are inconsistent with code

Observed in:
- `.env.example` (still lists OpenRouter variables)
- `README.md` (states OpenRouter+Groq routing)
- `docs/DEPLOYMENT_CHECKLIST.md` (requires OpenRouter key)
- several docs in `docs/`, `phases/`, and guides still describe mixed-provider architecture

Fix tasks:
1. Define one source of truth for current AI provider strategy.
2. Update all docs/templates accordingly.
3. Add doc lint check for forbidden legacy terms in active docs.

---

### P2.2 No CI pipeline in repository root

Observed:
- no `.github/workflows` directory in repo.

Impact:
- Critical regressions reached main branch without automated gates.

Fix tasks:
1. Add CI workflow stages:
   - backend unit tests
   - AI validation harness
   - frontend build
   - targeted e2e smoke
2. Fail build on stale legacy symbols.

---

### P2.3 Security hygiene gap in migration diagnostics script

Observed:
- `backend/test_groq_migration.py` prints part of API key in logs.

Fix tasks:
1. Remove key material from logs.
2. Replace with boolean/state indicator only.

## 5. End-to-End Edge Cases To Cover

## AI/LLM edge cases

- provider configured but remote API unavailable
- provider returns malformed/empty content
- structured response schema mismatch
- very long prompt/history exceeding token budgets
- timeout on first call after cold start
- fallback path must produce explicit degraded-mode metadata

## ML/recommendation edge cases

- `weakness_score = None` or missing
- zero/negative/very high study minutes
- no mastery rows (new user)
- no candidate questions after filters
- all candidates near-duplicate to recent attempts
- invalid/empty embeddings

## Quiz and analytics edge cases

- duplicate question IDs in submission
- unanswered questions on submit
- huge answer list payload (performance limit)
- missing topic linkage on answers
- partial update failures while marking weekly plan complete

## Upload/syllabus edge cases

- image-only PDF (no extractable text)
- valid text but unparseable structure
- AI parse failure with rules fallback success
- both AI and fallback fail (clear actionable error)

## Frontend UX and network edge cases

- chat session load fails mid-navigation
- send message while session creation fails
- exam switch while previous prediction call in flight
- 401 during in-flight request should cancel and redirect cleanly
- backend partial outage should still show partial data where possible

## 6. Phased Remediation Plan

## Phase 0 (Day 0-1): Stop-the-bleeding fixes

1. Fix AI router undefined method references.
2. Remove/migrate stale OpenRouter modules/tests causing collection errors.
3. Fix vercel rewrite strategy to remove hardcoded placeholder dependency.
4. Ensure `run_ai_validation.py` is green.

Exit criteria:
- AI runtime no longer crashes at router layer.
- backend tests run without import collection failures.
- basic AI endpoints callable in dev.

## Phase 1 (Day 1-3): Reliability hardening

1. Safe-convert nullable `weakness_score` in recommender.
2. Add NLP degraded-mode logging and readiness signal.
3. Add axios timeout + cancellation strategy.
4. Improve chat/adaptive quiz error surfaces and submission validation.
5. Replace `Promise.all` with resilient patterns where needed.

Exit criteria:
- no silent degradations for major student AI flows.
- major edge-case crashes covered by tests.

## Phase 2 (Day 3-5): Quality and consistency

1. Update all env/deployment/provider documentation to Groq-only reality.
2. Remove legacy provider wording from user-facing backend responses.
3. Add structured provider readiness info to `/api/ai/status`.
4. Add deterministic fallback quality checks for AI outputs.

Exit criteria:
- docs match runtime behavior.
- operator and user messaging is consistent and actionable.

## Phase 3 (Week 2): Regression prevention

1. Add CI pipeline for backend + frontend + AI harness.
2. Add targeted e2e tests for AI failure and fallback paths.
3. Add static legacy-symbol scan in CI.
4. Add deployment preflight checklist automation.

Exit criteria:
- future provider-migration or AI router regressions are caught before merge.

## 7. Test Plan After Fixes

### Mandatory backend gates

- `pytest backend/tests -q`
- `python backend/run_ai_validation.py`
- `python backend/test_groq_migration.py`

### Mandatory frontend gates

- `npm run build` in `frontend/`
- run targeted e2e suites covering chat, adaptive quiz, roadmap, planner, predictions

### Mandatory runtime smoke

- `GET /health`
- `GET /api/ai/status` (authenticated)
- `POST /api/ai/explain` for a known mastery topic
- Chat session create/load/send flow
- Adaptive quiz load/submit with fully answered and partially answered scenarios
- Syllabus upload with text PDF and image-only PDF

## 8. Ownership Suggestion

- Backend AI runtime and tests: backend owner
- Frontend integration/error handling: frontend owner
- Docs/env/deployment cleanup: platform/devops owner
- CI pipeline: shared backend/frontend + devops

## 9. Final Priority Order (Recommended)

1. P0.1 AI router crash
2. P0.2 stale OpenRouter test/module cleanup
3. P0.3 deployment rewrite hardening
4. P1.1 recommender null-safety
5. P1.3 frontend timeout/cancellation
6. P1.5 adaptive quiz submission and baseline handling
7. P1.4 chat error-state handling
8. P1.2 NLP readiness observability
9. P2 docs and CI hardening

---

This plan is designed to restore AI functionality first, then improve ML/UX reliability, and finally prevent recurrence through process and CI safeguards.