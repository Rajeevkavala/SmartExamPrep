# Verification-First Execution Template

## Required Context

Read in this order before using the template:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. Relevant phase or feature docs from `improvements/`
5. The actual implementation files in the repo

## Audit Goal

Audit whether a named SmartExamPrep feature or phase is already fully implemented before suggesting any code changes.

## Depends On

- The current codebase, not only the planning docs
- The feature definition from the selected improvement docs
- The "fully implemented" standard in `00_MASTER_CONTEXT.md`

## Expected Code Areas

Replace with the most relevant paths for the feature:

- `[DB_AND_MODELS]`
- `[SCHEMAS]`
- `[SERVICES]`
- `[ROUTERS]`
- `[FRONTEND_PAGES]`
- `[FRONTEND_COMPONENTS_OR_STORES]`
- `[ML_OR_AI]`
- `[TESTS]`

## Required Output

The response must include:

- a status verdict
- direct code evidence
- missing or broken pieces
- minimal safe implementation steps
- validation steps

## Template Prompt

Use and replace the placeholders below:

```md
You are auditing the SmartExamPrep feature or phase: [FEATURE_OR_PHASE_NAME].

Follow this exact order:

1. Read the relevant improvement docs:
   - [PRIMARY_DOCS]
   - `improvements/prompts/00_MASTER_CONTEXT.md`
   - `improvements/prompts/SHARED_RULES.md`
   - `improvements/prompts/FILE_CONTEXT_MAP.md`

2. Inspect the actual implementation files:
   - [DB_AND_MODELS]
   - [SCHEMAS]
   - [SERVICES]
   - [ROUTERS]
   - [FRONTEND_PAGES]
   - [FRONTEND_COMPONENTS_OR_STORES]
   - [ML_OR_AI]
   - [TESTS]

3. Determine whether the feature is:
   - `✅ Fully Implemented`
   - `🟡 Partially Implemented`
   - `🔴 Missing`
   - `⚠️ Implemented but Broken`
   - `🔵 Exists but Not Integrated End-to-End`

4. Do not suggest changes until after the audit is complete.

5. Treat the feature as fully implemented only if all applicable layers are connected:
   - DB or model support
   - backend service logic
   - router or API endpoint
   - schema or contract correctness
   - frontend UI
   - frontend/backend integration
   - real user-flow integration
   - ML or AI hook if required
   - admin support if required
   - testability
   - no obvious breakage

6. If a layer is not applicable, mark it `N/A` and explain why.

7. If the feature is already fully implemented, explicitly say that no implementation work should be done.

Use this response format:

## Feature Audit
- Feature Name: [FEATURE_OR_PHASE_NAME]
- Status:
- Scope Audited:
- Evidence Found:
- Missing Pieces:
- Broken Links:
- End-to-End Verdict:

## Layer Check
- DB and Models:
- Backend Services:
- Routers and API Contracts:
- Frontend:
- ML or AI:
- Admin:
- Testing and Validation:

## Action Plan
- Files to Update:
- Changes Required:
- Tests to Run:
- Safe Order of Work:

## Final Recommendation
- Implement Now / No Changes Needed / Fix Broken Integration First
```

## Usage Notes

- Use this template for single features, grouped features, or an entire phase.
- Keep the audit grounded in real files.
- Use planning docs only to understand intent.
- Use code evidence to determine reality.
- Prefer minimal additive fixes over broad rewrites.
