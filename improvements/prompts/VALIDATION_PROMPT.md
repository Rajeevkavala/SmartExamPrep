# Post-Implementation Validation Prompt

## Required Context

Read these first:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- the relevant feature or phase doc from `improvements/`
- `improvements/17_TESTING_AND_VALIDATION_PLAN.md`
- the actual files changed for the feature

## Audit Goal

Verify whether a feature that was just implemented is now truly complete, integrated, and usable by a real SmartExamPrep user.

## Depends On

- a concrete feature or phase name
- the actual implemented files
- the real current repo state after the implementation

## Expected Code Areas

Inspect the changed files plus nearby integration points across:

- `backend/models/`
- `backend/alembic/`
- `backend/schemas/`
- `backend/services/`
- `backend/routers/`
- `backend/main.py`
- `backend/ml/`
- `frontend/app/`
- `frontend/components/`
- `frontend/store/`
- `frontend/lib/`
- `frontend/middleware.ts`
- `backend/tests/`
- `frontend/tests/e2e/`

## Required Output

Produce:

- a post-implementation verdict
- layer-by-layer validation findings
- a direct answer to whether a real user can use the feature now
- remaining issues, if any

## Prompt

```md
Validate the SmartExamPrep feature: [FEATURE_NAME]

This is a post-implementation verification pass.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- [RELEVANT_FEATURE_OR_PHASE_DOCS]
- `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

Then inspect the actual implementation files and adjacent integration points.

Your job is to verify whether the feature is now truly complete.

You must audit:
- imports and broken references
- model and migration support
- router registration in `backend/main.py`
- request and response schemas
- backend service logic
- DB usage and persistence behavior
- frontend/backend contract alignment
- frontend route availability
- store integration and refresh behavior
- middleware or access-control impact
- edge cases and obvious failure paths
- test presence or missing coverage

Do not assume the feature is complete just because code was added.

Answer this question explicitly:

`Can this feature actually be used successfully by a real user right now?`

Your answer to that question must be one of:
- `Yes`
- `No`
- `Only Partially`

If the answer is not `Yes`, explain exactly what blocks full usability.

Use this response format:

## Validation Audit
- Feature Name:
- Validation Verdict:
- Can a real user use this successfully right now?:
- End-to-End Status:

## Validation Findings
- Working Evidence:
- Missing Pieces:
- Broken Links:
- Edge Cases:
- Regression Risks:

## Layer Check
- Imports and Wiring:
- DB and Migrations:
- Schemas and Contracts:
- Backend Services and Routers:
- Frontend and Store Integration:
- ML or AI Integration:
- Admin Impact:
- Testing and Validation:

## Final Call
- Ready to Use / Not Ready / Partially Ready
- Required Follow-Up:
- Tests to Run Next:
```

## Validation Rule

If a real user cannot complete the intended flow without hidden assumptions, mock data, missing routes, broken contracts, or missing persistence, the feature is not complete yet.
