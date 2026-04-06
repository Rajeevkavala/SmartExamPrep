# Generic Feature Audit Prompt

## Required Context

Read these first:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
- the most relevant phase doc for the named feature
- the actual implementation files that match the feature

## Audit Goal

Answer this question safely:

"Is this SmartExamPrep feature already fully implemented in the current codebase?"

## Depends On

- The current repository state
- The intended behavior described in the improvement docs
- All prerequisite systems needed by the feature

## Expected Code Areas

Identify and inspect the actual files for the feature across:

- `backend/models/`
- `backend/alembic/`
- `backend/schemas/`
- `backend/services/`
- `backend/routers/`
- `backend/ml/`
- `frontend/app/`
- `frontend/components/`
- `frontend/store/`
- `frontend/lib/`
- `frontend/tests/e2e/`

## Required Output

Produce:

- a direct implementation-status verdict
- code evidence by layer
- missing or broken pieces
- minimal safe next steps only if needed

## Prompt

```md
Audit the SmartExamPrep feature: [FEATURE_NAME]

Your role is code auditor first, implementer second.

Follow this exact workflow:

1. Read the feature intent from:
   - `improvements/prompts/00_MASTER_CONTEXT.md`
   - `improvements/prompts/SHARED_RULES.md`
   - `improvements/prompts/FILE_CONTEXT_MAP.md`
   - `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
   - [MOST_RELEVANT_PHASE_DOCS]

2. Inspect the actual implementation in the codebase.

3. Determine whether the feature is:
   - `✅ Fully Implemented`
   - `🟡 Partially Implemented`
   - `🔴 Missing`
   - `⚠️ Implemented but Broken`
   - `🔵 Exists but Not Integrated End-to-End`

4. Verify end-to-end completeness across all applicable layers:
   - DB or model support
   - migrations
   - backend service logic
   - router or API endpoints
   - request and response schemas
   - frontend pages or components
   - frontend calls to the real backend
   - user-flow integration
   - ML or AI hooks if the feature depends on them
   - admin support if the feature depends on content or verification
   - testing or strong validation evidence

5. Do not propose code changes until the audit is complete.

6. Do not rewrite already-working features.

7. If the feature is already complete, say so clearly and recommend no implementation changes.

Use this response format:

## Feature Audit
- Feature Name:
- Intended Behavior:
- Status:
- Scope Audited:
- Evidence Found:
- Missing Pieces:
- Broken Links:
- End-to-End Verdict:

## Layer Evidence Matrix
- DB and Models:
- Migrations:
- Backend Services:
- Routers and API Contracts:
- Frontend:
- ML or AI:
- Admin:
- Testing and Validation:

## Minimal Safe Changes
- Files to Update:
- Required Changes:
- Risks to Watch:
- Tests to Run:

## Recommendation
- Is this feature already fully implemented?
- If not, what is the smallest safe path to completion?
```

## Example Uses

- "Check if adaptive quiz is fully implemented"
- "Check if revision scheduler is fully implemented"
- "Check if admin question verification is fully implemented"
- "Check if roadmap generation is fully implemented"

## Decision Reminder

A feature is not fully implemented just because one layer exists. UI-only, backend-only, or DB-only work is not enough. The verdict must reflect real end-to-end availability.
