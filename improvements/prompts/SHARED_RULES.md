# Shared Audit Rules

## Required Context

Read these before using any prompt in this folder:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/01_EXISTING_SYSTEM_MAP.md`
- `improvements/16_DEPENDENCY_AND_RISK_MAP.md`
- `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Force the AI to behave like a code auditor first and an implementer second.

## Depends On

- The current repo contents, not only the improvement docs
- The "fully implemented" definition from `00_MASTER_CONTEXT.md`

## Expected Code Areas

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

Every audit or implementation prompt should return:

- status classification first
- evidence second
- missing or broken links third
- minimal safe action plan last

## Non-Negotiable Rules

### 1. Inspect before implementing

- Always read the relevant improvement docs first.
- Always inspect the real code next.
- Never jump directly to rewriting or generating code.

### 2. Do not rewrite unrelated files

- Touch only files needed for the verified gap.
- Do not refactor broad areas unless the audit proves the change is necessary.
- Do not replace existing working flows just because a different design is possible.

### 3. Do not regenerate already working features

- If a feature is already complete, say so.
- If a feature is already correct but styled differently than expected, do not rewrite it.
- If docs describe a planned feature but code already implements it, treat the docs as stale, not the code as missing.

### 4. Always classify feature status first

Use exactly one primary verdict per feature:

- `✅ Fully Implemented`
- `🟡 Partially Implemented`
- `🔴 Missing`
- `⚠️ Implemented but Broken`
- `🔵 Exists but Not Integrated End-to-End`

### 5. Always verify end-to-end completeness

Check all applicable layers:

- database
- models
- migrations
- services
- routers
- API contracts
- frontend pages or components
- frontend API calls and stores
- ML or AI hooks
- admin dependencies
- tests and validation

### 6. Use evidence, not assumptions

Acceptable evidence includes:

- model definitions
- migration files
- route registration
- request and response schemas
- service logic
- frontend routes
- frontend components
- API client calls
- Zustand or other store integration
- tests
- validation scripts

Unacceptable evidence on its own:

- roadmap documents
- TODO comments
- placeholder files
- page links with no working data flow
- mocked data that is not connected to the real backend

### 7. Mark layers as `N/A` only with justification

If a feature does not require a layer, explicitly say why it is not applicable.

Example:

- a pure backend maintenance task may not need frontend work
- a student-facing feature normally does need frontend integration

### 8. Suggest only minimal safe changes

After auditing:

- list only missing pieces
- list only broken links
- list only required contract fixes
- list only necessary tests

Do not suggest rewriting healthy code without a specific defect.

### 9. Protect existing working flows

Before proposing changes, consider whether they could break:

- auth and protected routes
- diagnostic quiz
- adaptive quiz
- result reload
- revision flow
- dashboard load
- admin content flows

### 10. Prefer additive implementation

- add migrations instead of mutating history
- add routes instead of overloading unrelated ones
- extend schemas carefully
- keep backward compatibility where possible

## Required Audit Sequence

Use this exact order:

1. Read the relevant docs.
2. Inspect the actual files.
3. Map the feature across layers.
4. Classify the status.
5. Explain the evidence.
6. Identify missing, broken, or disconnected pieces.
7. Propose the minimal safe implementation plan.
8. Define tests and validation steps.

## Required Output Format Rules

At minimum, every response should include these sections:

## Feature Audit

- Feature Name
- Status
- Scope Audited
- Evidence Found
- Missing Pieces
- Broken Links
- End-to-End Verdict

## Layer Check

- DB and Models
- Backend Services
- Routers and API Contracts
- Frontend
- ML or AI
- Admin
- Testing and Validation

## Action Plan

- Files to Update
- Changes Required
- Tests to Run

If no code changes are required, say that explicitly.

## Decision Rules For Status Labels

### `✅ Fully Implemented`

Use only when the feature is present, connected, usable, and not obviously broken across all applicable layers.

### `🟡 Partially Implemented`

Use when part of the feature exists but meaningful parts are still missing.

Examples:

- backend exists but frontend is missing
- UI exists but no real persistence
- core flow works but major subfeatures are absent

### `🔴 Missing`

Use when the intended feature has no meaningful implementation in the codebase.

### `⚠️ Implemented but Broken`

Use when code exists but is clearly failing, inconsistent, or unusable.

Examples:

- wrong schema shape
- missing imports or router registration
- broken user flow
- endpoint exists but frontend contract is wrong

### `🔵 Exists but Not Integrated End-to-End`

Use when isolated pieces exist but the user cannot successfully complete the real flow.

Examples:

- DB and backend exist but no UI
- UI exists but no backend call
- service exists but router is not registered

## Evidence Threshold Before Declaring A Feature Complete

Do not declare `✅ Fully Implemented` unless you can point to all applicable evidence:

- persistence support where required
- live business logic
- reachable API surface
- correct schema or contract
- real frontend wiring
- actual user-flow integration
- at least smoke-level validation or strong direct code evidence

If evidence is incomplete, do not guess. Downgrade the status and explain the gap.
