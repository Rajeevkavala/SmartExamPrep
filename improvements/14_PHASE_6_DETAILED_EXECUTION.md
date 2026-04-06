# 14 Phase 6 Detailed Execution

## Phase Goal

Phase 6 adds the AI study chatbot after the platform has enough grounded data to make the assistant useful. That sequence matters. Right now the project has AI integration through `backend/services/ai_service.py`, an `/api/ai/explain` route, weak-topic analysis, roadmap data from Phase 2, and planner data from Phase 3. That is sufficient to build a grounded tutoring assistant without introducing a full retrieval stack on day one.

The phase outcome should be:

- students can ask study questions inside the product
- answers are grounded in their own profile, weak topics, roadmap, planner, and question history
- chatbot guidance is helpful for doubts, planning, and weak-topic support
- AI failure does not block the rest of the product

## Features Included

- AI study chatbot
- concept help
- roadmap guidance
- weak-topic help
- study planning help
- grounded context assembly from current system data

## Exact Files To Read First

1. `backend/routers/ai.py`
2. `backend/services/ai_service.py`
3. `backend/services/dashboard_service.py`
4. `backend/services/weakness_service.py`
5. `backend/services/recommendation_service.py`
6. `backend/ml/nlp_pipeline.py`
7. `backend/models/models.py`
8. `frontend/app/(student)/dashboard/page.tsx`
9. `frontend/components/student/NLPInsightCard.tsx`
10. `frontend/lib/api.ts`
11. `frontend/store/authStore.ts`
12. `frontend/store/dashboardStore.ts`

## Existing Files To Modify

### Backend

- `backend/models/models.py`
- `backend/main.py`
- `backend/routers/ai.py`
- `backend/services/ai_service.py`
- `backend/services/dashboard_service.py`
- `backend/services/recommendation_service.py`
- `backend/ml/nlp_pipeline.py`

### Frontend

- `frontend/middleware.ts`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/lib/api.ts`

### Tests

- `backend/run_ai_validation.py`
- `frontend/tests/e2e/chunk11-student-pages.spec.ts`

## New Files To Create

### Backend

- `backend/alembic/versions/<timestamp>_add_study_chat_tables.py`
- `backend/routers/study_chat.py`
- `backend/services/study_chat_service.py`
- `backend/schemas/study_chat_schemas.py`
- `backend/tests/test_study_chat_router.py`

### Frontend

- `frontend/app/(student)/chat/page.tsx`
- `frontend/store/chatStore.ts`
- `frontend/components/student/ChatSidebarContext.tsx`
- `frontend/components/student/StudyChatComposer.tsx`
- `frontend/components/student/StudyChatMessageList.tsx`
- `frontend/components/student/StudyChatStarterPrompts.tsx`

## Exact DB Changes

### Add `study_chat_sessions`

Suggested columns:

- `id`
- `user_id`
- `title`
- `session_type`
- `created_at`
- `updated_at`
- `last_used_at`
- `metadata_json`

Indexes:

- `(user_id, last_used_at)`

### Add `study_chat_messages`

Suggested columns:

- `id`
- `session_id`
- `role` with values `user`, `assistant`, `system`
- `message_text`
- `grounding_snapshot_json`
- `token_usage_json` optional
- `created_at`

Indexes:

- `(session_id, created_at)`

### No Vector DB Table Yet

The current codebase does not have a retrieval infrastructure. Do not force one into Phase 6. Use structured grounding from relational data first.

## Exact Backend Changes

### 1. Chat schemas in `backend/schemas/study_chat_schemas.py`

Create:

- `CreateChatSessionRequest`
- `ChatMessageRequest`
- `ChatMessageResponse`
- `ChatSessionSummary`
- `ChatSessionResponse`

### 2. Grounding service in `backend/services/study_chat_service.py`

This service should assemble context from:

- current user profile and onboarding fields
- weakest topics from `topic_masteries`
- active roadmap week and upcoming roadmap topics
- today's planner tasks and overdue carry-forwards
- recent revisions
- recent quiz attempts and `result_snapshot`

The service should then:

1. classify the user prompt into one of a few buckets:
   - concept doubt
   - roadmap guidance
   - planner help
   - weak-topic help
   - general motivation or study advice
2. build a bounded structured context payload
3. call AI through a focused prompt template
4. persist message history and grounding snapshot

### 3. Router in `backend/routers/study_chat.py`

Recommended endpoints:

- `POST /api/study-chat/sessions`
- `GET /api/study-chat/sessions`
- `GET /api/study-chat/sessions/{session_id}`
- `POST /api/study-chat/sessions/{session_id}/messages`

Behavior notes:

- session creation can be implicit if you prefer one-click chat startup
- history responses should be paginated later if threads become large

### 4. Keep `backend/routers/ai.py` narrow

Do not overload the current `/api/ai/explain` route with conversational behavior.

Keep:

- `/api/ai/explain` for single-shot weak-topic explanations

Add:

- a dedicated study chat router for conversational state

### 5. Extend `backend/services/ai_service.py`

Add helpers such as:

- `generate_study_chat_reply(...)`
- `summarize_chat_session_title(...)` optional

Requirements:

- explicit timeout handling
- clean fallback reply when AI is unavailable
- prompt templates that discourage hallucinated syllabus or schedule claims

### 6. Use `backend/ml/nlp_pipeline.py` only where it helps

Possible uses:

- keyword extraction from the user message
- lightweight topic matching against existing topic names/tags

Do not force embeddings into the critical path if the relational grounding already gives enough context.

## Exact Frontend Changes

### 1. New page at `frontend/app/(student)/chat/page.tsx`

The chat page should include:

- message list
- composer
- visible context panel or summary
- starter prompts tied to actual product use cases

Suggested starter prompts:

- "Help me understand my weakest topic."
- "What should I study today?"
- "Why is this topic in my roadmap this week?"
- "Give me a 30-minute plan for today."

### 2. Add `frontend/store/chatStore.ts`

Store:

- active session
- session list
- message history
- send state
- optimistic assistant placeholder if desired

### 3. Dashboard entry point

`frontend/app/(student)/dashboard/page.tsx` should add a chat quick action once the feature exists.

### 4. Middleware update in `frontend/middleware.ts`

Protect `/chat`.

## Exact ML / AI Changes

### Rule-based vs AI-based split

Rule-based:

- prompt classification fallback
- context assembly
- roadmap/planner fact selection
- topic matching from known data

AI-based:

- natural language explanation
- personalized study guidance phrasing
- concept simplification

### Grounding strategy

The chatbot should not answer from AI alone. Each response should have access to a compact snapshot that includes:

- exam target date
- daily study target
- current roadmap week
- today's pending tasks
- top weak topics
- recent quiz outcomes

### Fallback strategy

If AI fails:

- return a structured fallback reply built from the same context
- encourage the student toward available product actions like planner, revision, or adaptive quiz

## Exact APIs To Add Or Change

### New

- `POST /api/study-chat/sessions`
- `GET /api/study-chat/sessions`
- `GET /api/study-chat/sessions/{session_id}`
- `POST /api/study-chat/sessions/{session_id}/messages`

### Reused

- `POST /api/ai/explain` remains available for narrow explanation use

## Exact Data Flow Changes

```text
student asks chat question
  -> study_chat_service collects profile + weakness + roadmap + planner + quiz context
  -> ai_service receives bounded grounded prompt
  -> assistant reply + grounding snapshot persisted
  -> frontend chat page renders conversation and keeps session history
```

## Implementation Order Inside Phase 6

1. create chat session/message migration
2. add ORM models
3. build chat schemas
4. implement context assembly service
5. extend AI helper methods and fallback logic
6. add study-chat router and register it in `backend/main.py`
7. extend AI validation harness for chat-specific tests
8. build chat store and UI
9. add dashboard quick action and middleware protection
10. manually test grounded replies across multiple student states

## Likely Bugs And Risks

### Ungrounded replies

If the prompt is too open-ended, AI may hallucinate study plans or roadmap facts that do not exist in the database.

### Oversized context

Dumping too much roadmap, planner, and quiz history into the prompt will increase latency and reduce answer quality.

### Session growth

Long message histories can become slow or expensive if every turn resends the whole conversation.

### Product inconsistency

If the chatbot recommends actions that are not actually available in the UI, trust will drop quickly.

## Phase 6 Testing Checklist

### Backend

- session creation and retrieval work
- replies include fallback behavior when AI fails
- grounding snapshot contains expected profile and plan fields
- no unauthorized cross-user session access is possible

### Frontend

- chat page loads existing sessions
- sending a message appends both user and assistant messages
- loading and error states are clear
- starter prompts submit correctly

### Regression

- `/api/ai/explain` still works
- dashboard remains functional even if chat services are unavailable

## Definition Of Done

Phase 6 is complete when:

- students can use a grounded study chatbot in-product
- responses are anchored to their real roadmap, planner, and weakness data
- AI failure degrades gracefully instead of breaking the feature


