# Feature Testing Prompt

## Required Context

Read these first:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/17_TESTING_AND_VALIDATION_PLAN.md`
- the relevant feature or phase docs
- the actual implementation files

## Audit Goal

Generate feature-specific testing and validation steps that prove whether a SmartExamPrep feature is truly complete and working.

## Depends On

- the feature definition from the improvement docs
- the current code implementation
- the current existing test assets in the repo

## Expected Code Areas

Inspect the feature implementation and existing tests across:

- `backend/tests/`
- `backend/test_api_flow.py`
- `backend/run_ai_validation.py`
- `frontend/tests/e2e/`
- the relevant backend and frontend feature files

## Required Output

Produce:

- feature-specific test steps
- missing tests
- validation scenarios
- edge cases
- a proof-oriented test plan

## Prompt

```md
Create a testing and validation plan for the SmartExamPrep feature: [FEATURE_NAME]

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/17_TESTING_AND_VALIDATION_PLAN.md`
- [RELEVANT_FEATURE_OR_PHASE_DOCS]

Then inspect the actual implementation and the current test suite.

Your goal is to prove or disprove this statement:

`This feature is truly complete and working.`

Focus on:
- backend validation steps
- frontend validation steps
- API contract checks
- manual end-to-end scenarios
- missing automated tests
- edge cases
- regression risk against existing product flows

Use the current repo assets when relevant, including:
- `backend/test_api_flow.py`
- `backend/run_ai_validation.py`
- existing backend tests under `backend/tests/`
- Playwright tests under `frontend/tests/e2e/`

Use this response format:

## Testing Plan
- Feature Name:
- Goal:
- Current Test Coverage Found:

## Backend Tests
- Test Case:
- Why It Matters:
- Expected Result:

## Frontend Tests
- Test Case:
- Why It Matters:
- Expected Result:

## End-to-End Validation Scenarios
- Scenario:
- Steps:
- Expected Outcome:

## Edge Cases
- Case:
- Risk:
- Expected Behavior:

## Missing Tests
- Missing Test:
- Recommended Location:
- Priority:

## Regression Checks
- Existing Flow to Re-Test:
- Why:

## Completion Proof
- What evidence would prove this feature is done?
- What would still block a "fully implemented" verdict?
```

## Testing Rule

The plan must be feature-specific and tied to real SmartExamPrep flows. Avoid generic test advice that cannot prove the feature works in this codebase.
