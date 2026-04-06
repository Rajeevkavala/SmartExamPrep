# Changelog Update Prompt

## Required Context

Read these first:

- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/15_FILE_BY_FILE_CHANGELOG.md`
- the relevant feature or phase docs
- the actual files audited or changed

## Audit Goal

Generate a precise changelog update that captures what was checked, what already existed, what was added, what was fixed, and what still remains incomplete.

## Depends On

- a concrete feature or phase scope
- the audit findings
- the actual code changes or verified non-changes

## Expected Code Areas

Summarize only the files actually checked or changed across:

- `backend/`
- `frontend/`
- `ml/`
- `docs/`
- `improvements/`

## Required Output

Produce a changelog-ready block that can be added to `improvements/15_FILE_BY_FILE_CHANGELOG.md`.

## Prompt

```md
Prepare a changelog update for SmartExamPrep covering: [FEATURE_OR_PHASE_NAME]

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/15_FILE_BY_FILE_CHANGELOG.md`
- [RELEVANT_FEATURE_OR_PHASE_DOCS]

Then inspect:
- the audit findings
- the actual files checked
- the actual files changed

Your job is to summarize:
- what was checked
- what was already implemented
- what was added
- what was fixed
- what remains incomplete

Rules:
- do not rewrite the whole changelog if only one feature changed
- do not claim changes that are not present in code
- distinguish "audited only" from "implemented"
- distinguish "already existed" from "newly added"
- mention remaining gaps honestly

Use this response format:

## Changelog Update
- Scope:
- Audit Date:
- Status Summary:

## Files Checked
- File:
- Why It Was Checked:
- Outcome:

## Already Implemented
- Item:
- Evidence:

## Added
- Item:
- Files:
- Reason:

## Fixed
- Item:
- Files:
- Why It Was Needed:

## Still Incomplete
- Item:
- Missing Pieces:
- Next Safe Step:

## Suggested Changelog Entry For `15_FILE_BY_FILE_CHANGELOG.md`
[Provide a concise markdown block that can be pasted into the changelog.]
```

## Changelog Rule

The changelog should document reality, not intention. If the audit shows no code changes were required because a feature was already complete, record that outcome explicitly.
