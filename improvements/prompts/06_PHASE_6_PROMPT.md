# Phase 6 Prompt: AI Study Chatbot Audit

## Required Context

Read these first, in order:

1. `improvements/prompts/00_MASTER_CONTEXT.md`
2. `improvements/prompts/SHARED_RULES.md`
3. `improvements/prompts/FILE_CONTEXT_MAP.md`
4. `improvements/04_DATABASE_AND_MODEL_CHANGES.md`
5. `improvements/05_BACKEND_UPGRADE_PLAN.md`
6. `improvements/06_FRONTEND_UPGRADE_PLAN.md`
7. `improvements/07_ML_AI_UPGRADE_PLAN.md`
8. `improvements/08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`
9. `improvements/14_PHASE_6_DETAILED_EXECUTION.md`
10. `improvements/17_TESTING_AND_VALIDATION_PLAN.md`

## Audit Goal

Verify whether the AI study chatbot is already implemented as a grounded, usable student feature rather than as an isolated AI helper or partial UI.

## Depends On

- existing AI integration
- weakness analysis
- roadmap data
- planner data
- recent quiz and revision history
- frontend student route protection

## Expected Code Areas

- `backend/models/models.py`
- `backend/alembic/versions/`
- `backend/schemas/study_chat_schemas.py`
- `backend/services/study_chat_service.py`
- `backend/services/ai_service.py`
- `backend/services/dashboard_service.py`
- `backend/services/recommendation_service.py`
- `backend/services/weakness_service.py`
- `backend/ml/nlp_pipeline.py`
- `backend/routers/study_chat.py`
- `backend/routers/ai.py`
- `backend/main.py`
- `frontend/app/(student)/chat/page.tsx`
- `frontend/store/chatStore.ts`
- `frontend/components/student/ChatSidebarContext.tsx`
- `frontend/components/student/StudyChatComposer.tsx`
- `frontend/components/student/StudyChatMessageList.tsx`
- `frontend/components/student/StudyChatStarterPrompts.tsx`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/lib/api.ts`
- `frontend/middleware.ts`
- `backend/run_ai_validation.py`
- relevant backend and E2E tests

## Required Output

Produce:

- a grounded chatbot audit
- one status per chatbot capability
- minimal safe fixes only for the gaps proven by code evidence

## Prompt

```md
Audit SmartExamPrep Phase 6: AI Study Chatbot.

You must behave like a code auditor first.

Read first:
- `improvements/prompts/00_MASTER_CONTEXT.md`
- `improvements/prompts/SHARED_RULES.md`
- `improvements/prompts/FILE_CONTEXT_MAP.md`
- `improvements/14_PHASE_6_DETAILED_EXECUTION.md`
- supporting docs `04_DATABASE_AND_MODEL_CHANGES.md`, `05_BACKEND_UPGRADE_PLAN.md`, `06_FRONTEND_UPGRADE_PLAN.md`, `07_ML_AI_UPGRADE_PLAN.md`, and `08_FEATURE_BY_FEATURE_IMPLEMENTATION.md`

Then inspect the real code for:
- chat session and message persistence
- chat schemas
- chat grounding service
- AI helper support
- chat router and route registration
- frontend chat page and store
- dashboard or navigation entry points
- fallback behavior when AI is unavailable
- AI validation and tests

Audit these Phase 6 features individually:
- chat session persistence
- chat message persistence
- grounded context assembly from user data
- weak-topic guidance
- roadmap guidance
- planner guidance
- safe fallback behavior
- frontend chat UI and state
- student access to the feature

Classify each feature as:
- `âœ… Fully Implemented`
- `ðŸŸ¡ Partially Implemented`
- `ðŸ”´ Missing`
- `âš ï¸ Implemented but Broken`
- `ðŸ”µ Exists but Not Integrated End-to-End`

Treat Phase 6 as complete only if:
- chat data persistence exists where required
- backend chat service assembles real grounding context
- router and schemas exist
- frontend chat UI exists and calls the real backend
- the feature is protected and user-scoped correctly
- AI failure does not break the product
- the assistant is grounded in actual roadmap, planner, weakness, or quiz state
- tests or validation evidence exist

Do not mark the chatbot complete if only `/api/ai/explain` exists, or if there is only a chat UI without grounded backend support.

Use this response format:

## Phase 6 Audit
- Phase Status:
- Features Audited:
- Overall End-to-End Verdict:

## Feature Matrix
- Feature:
- Status:
- Evidence Found:
- Missing Pieces:
- Broken Links:
- Verdict:

## Dependency Check
- AI Dependency:
- Weakness and Mastery Dependency:
- Roadmap Dependency:
- Planner Dependency:
- Frontend Access Dependency:

## Layer Check
- DB and Models:
- Backend Services and Routers:
- Schemas and Contracts:
- ML or AI Grounding:
- Frontend and Store Integration:
- Fallback and Safety Behavior:
- Testing and Validation:

## Minimal Safe Action Plan
- Files to Update:
- Changes Required:
- Risks to Watch:
- Tests to Run:
```

## Phase 6 Reminder

An AI helper is not the same as a grounded study chatbot. If the assistant cannot reliably use real SmartExamPrep study context, do not mark the phase complete.

