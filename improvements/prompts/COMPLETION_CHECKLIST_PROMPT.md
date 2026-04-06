# Feature Completion Checklist Prompt

## Required Context

Read these first:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- the relevant feature or phase docs from `improvements/`
- the actual implementation files for the feature

## Audit Goal

Generate a practical feature-completion checklist that can be used to verify SmartExamPrep features manually and through code review.

## Depends On

- a named feature or phase
- the intended feature behavior from the improvement docs
- the current codebase state

## Expected Code Areas

Inspect the real feature files across:

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

Produce a checklist across:

- DB
- backend
- API
- frontend
- ML or AI
- admin
- testing
- UX
- integration

## Prompt

```md
Create a SmartExamPrep feature completion checklist for: [FEATURE_NAME]

First:
- read `improvements/prompts/00_MASTER_CONTEXT.md`
- read `improvements/prompts/SHARED_RULES.md`
- read `improvements/prompts/FILE_CONTEXT_MAP.md`
- read the relevant feature or phase docs

Then inspect the real code for the feature before generating the checklist.

The checklist must be verification-first, not generic.

Rules:
- base the checklist on the intended SmartExamPrep feature behavior
- use the actual repo structure and current implementation patterns
- do not mark items complete without code evidence
- include `N/A` only when justified
- include manual verification steps where code inspection alone is not enough

Generate a checklist for these layers:
- DB
- Backend
- API Contracts
- Frontend
- ML or AI
- Admin
- Testing
- UX
- Integration

Use this response format:

## Feature Completion Checklist
- Feature Name:
- Intended Outcome:

## Checklist
- [ ] DB or model support exists
- [ ] migration support exists if persistence changed
- [ ] backend service logic exists
- [ ] router or endpoint exists
- [ ] schema or contract is correct
- [ ] frontend UI exists
- [ ] frontend calls the real backend
- [ ] feature appears in a real user flow
- [ ] ML or AI hook exists if required
- [ ] admin support exists if required
- [ ] tests exist or validation steps are defined
- [ ] no obvious broken path remains

## Layer-Specific Checks
- DB:
- Backend:
- API Contracts:
- Frontend:
- ML or AI:
- Admin:
- Testing:
- UX:
- Integration:

## Manual Verification Steps
- Step 1:
- Step 2:
- Step 3:

## Current Assessment
- Likely Complete / Needs Audit / Clearly Incomplete
- Highest-Risk Gaps:
```

## Checklist Rule

This checklist is only useful if it reflects the real SmartExamPrep architecture. Avoid abstract checklist items that cannot be tied back to actual files or flows.
