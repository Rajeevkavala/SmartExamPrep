# A. LEGACY PROVIDER REMOVAL MAP

- Removed the legacy single-provider AI runtime and replaced the feature surface with [backend/services/ai_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/ai_service.py).
- Added the new workload-aware AI subsystem under [backend/ai](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai).
- Updated these backend entry points to use the new AI layer:
  - [backend/routers/ai.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/routers/ai.py)
  - [backend/services/dashboard_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/dashboard_service.py)
  - [backend/services/metrics_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/metrics_service.py)
  - [backend/services/study_chat_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/study_chat_service.py)
  - [backend/services/roadmap_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/roadmap_service.py)
  - [backend/services/scraper_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/scraper_service.py)
  - [backend/services/syllabus_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/syllabus_service.py)
  - [backend/services/student_upload_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/student_upload_service.py)
  - [backend/run_ai_validation.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/run_ai_validation.py)
- Updated setup and dependency surfaces:
  - [backend/config.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/config.py)
  - [backend/requirements.txt](/d:/New%20folder%20(2)/SmartExamPrep/backend/requirements.txt)
  - [.env.example](/d:/New%20folder%20(2)/SmartExamPrep/.env.example)
  - [.env](/d:/New%20folder%20(2)/SmartExamPrep/.env)
  - [README.md](/d:/New%20folder%20(2)/SmartExamPrep/README.md)
- Frontend/admin surfaces that describe the AI pipeline were updated:
  - [frontend/app/admin/scraper/page.tsx](/d:/New%20folder%20(2)/SmartExamPrep/frontend/app/admin/scraper/page.tsx)
  - [frontend/app/admin/syllabus/page.tsx](/d:/New%20folder%20(2)/SmartExamPrep/frontend/app/admin/syllabus/page.tsx)
  - [frontend/tests/e2e/chunk15-admin-scraper.spec.ts](/d:/New%20folder%20(2)/SmartExamPrep/frontend/tests/e2e/chunk15-admin-scraper.spec.ts)

# B. AI WORKLOAD STRATEGY

## Weak-topic explanation
- Should use LLM: yes
- Workload type: personalized coaching copy
- Trust level: low; output is guidance only
- Latency sensitivity: medium
- Cost sensitivity: high
- Model strength needed: fast, instruction-following text model
- Runtime mode: real-time with cache

## Dashboard focus hint
- Should use LLM: yes
- Workload type: short next-step suggestion
- Trust level: low; hint only
- Latency sensitivity: high
- Cost sensitivity: high
- Model strength needed: very fast concise model
- Runtime mode: real-time with cache

## Study chat
- Should use LLM: yes
- Workload type: grounded tutoring chat
- Trust level: medium; answer must stay bounded by deterministic app context
- Latency sensitivity: high
- Cost sensitivity: medium
- Model strength needed: stronger reasoning chat model
- Runtime mode: real-time

## Roadmap month enrichment
- Should use LLM: yes
- Workload type: non-critical enrichment over deterministic roadmap allocations
- Trust level: assist-only; core roadmap stays deterministic
- Latency sensitivity: low
- Cost sensitivity: high
- Model strength needed: structured planner-style generation
- Runtime mode: async/background-style during roadmap generation

## Scraped question structuring
- Should use LLM: yes
- Workload type: structured extraction
- Trust level: medium; admin review remains mandatory
- Latency sensitivity: medium
- Cost sensitivity: medium
- Model strength needed: schema-reliable structured output model
- Runtime mode: async job

## Syllabus parsing
- Should use LLM: yes
- Workload type: hierarchical extraction
- Trust level: medium; admin review remains mandatory
- Latency sensitivity: low
- Cost sensitivity: medium
- Model strength needed: schema-reliable structured output model
- Runtime mode: async job with deterministic fallback parser

## Upload-to-MCQ generation
- Should use LLM: yes, but only after deterministic rule parsing fails
- Workload type: content transformation
- Trust level: medium; student still reviews output
- Latency sensitivity: low
- Cost sensitivity: medium
- Model strength needed: longer-context structured generation model
- Runtime mode: async job

# C. PROVIDER + MODEL ROUTING PLAN

## Weak-topic explanation
- Primary provider: Groq
- Primary model: `openai/gpt-oss-20b`
- Fallback provider: OpenRouter
- Fallback model: `stepfun/step-3.5-flash:free`
- Reasoning: this is short text, not trust-critical, and benefits more from low latency than from maximum reasoning depth.

## Dashboard focus hint
- Primary provider: Groq
- Primary model: `openai/gpt-oss-20b`
- Fallback provider: OpenRouter
- Fallback model: `stepfun/step-3.5-flash:free`
- Reasoning: same shape as explanation, but even more latency-sensitive because it appears on dashboard loads.

## Study chat
- Primary provider: Groq
- Primary model: `openai/gpt-oss-120b`
- Fallback provider: OpenRouter
- Fallback model: `qwen/qwen3.6-plus:free`
- Reasoning: chat quality matters more here, but the answer is still bounded by app grounding, so Groq gives low-latency interaction while OpenRouter gives cheap overflow capacity.

## Roadmap month enrichment
- Primary provider: OpenRouter
- Primary model: `qwen/qwen3.6-plus:free`
- Fallback provider: Groq
- Fallback model: `openai/gpt-oss-120b`
- Reasoning: this is non-critical enrichment, so cost matters more than absolute latency. The deterministic roadmap remains the source of truth.

## Scraped question structuring
- Primary provider: Groq
- Primary model: `openai/gpt-oss-120b`
- Fallback provider: OpenRouter
- Fallback model: `openai/gpt-oss-120b:free`
- Reasoning: this workload needs the strongest schema adherence. Groq strict structured outputs are the best fit; OpenRouter provides a cheaper recovery path with response healing.

## Syllabus parsing
- Primary provider: Groq
- Primary model: `openai/gpt-oss-120b`
- Fallback provider: OpenRouter
- Fallback model: `qwen/qwen3.6-plus:free`
- Reasoning: syllabus parsing is hierarchical JSON extraction, so structured reliability matters more than style.

## Upload-to-MCQ generation
- Primary provider: Groq
- Primary model: `openai/gpt-oss-120b`
- Fallback provider: OpenRouter
- Fallback model: `qwen/qwen3.6-plus:free`
- Reasoning: generation is long-context and structured, but not real-time. Groq handles strict output; OpenRouter covers fallback capacity.

## Provider policy
- Use Groq first for latency-sensitive chat and strict structured outputs.
- Use OpenRouter first for cheap non-critical enrichment and as overflow capacity.
- Fall back when the primary provider is missing, rate-limited, times out, or fails schema validation.
- Avoid LLMs completely for scoring, scheduling, recommendation ranking, roadmap allocation, planner state, and prediction math.

# D. NEW AI ARCHITECTURE

## File and folder plan
- Provider clients:
  - [backend/ai/providers/base_client.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/providers/base_client.py)
  - [backend/ai/providers/openrouter_client.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/providers/openrouter_client.py)
  - [backend/ai/providers/groq_client.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/providers/groq_client.py)
- Routing and registry:
  - [backend/ai/models/model_registry.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/models/model_registry.py)
  - [backend/ai/models/routing_policy.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/models/routing_policy.py)
  - [backend/ai/services/ai_router.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/services/ai_router.py)
- Prompt modules:
  - [backend/ai/prompts/weak_explanation.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/weak_explanation.py)
  - [backend/ai/prompts/dashboard_hint.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/dashboard_hint.py)
  - [backend/ai/prompts/study_chat.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/study_chat.py)
  - [backend/ai/prompts/roadmap_enrichment.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/roadmap_enrichment.py)
  - [backend/ai/prompts/scraper_structuring.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/scraper_structuring.py)
  - [backend/ai/prompts/syllabus_parsing.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/syllabus_parsing.py)
  - [backend/ai/prompts/mcq_generation.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/prompts/mcq_generation.py)
- Validation and safety:
  - [backend/ai/validators/json_validator.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/validators/json_validator.py)
  - [backend/ai/validators/response_safety.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/validators/response_safety.py)
- Task orchestration and compatibility layer:
  - [backend/ai/services/ai_tasks.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai/services/ai_tasks.py)
  - [backend/services/ai_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/ai_service.py)

## Provider abstraction design
- Both providers use an OpenAI-compatible HTTP surface to keep the code simple and maintainable.
- OpenRouter adds response-healing for best-effort JSON fallback requests.
- Groq is used directly for strict structured outputs where supported.

## Router design
- Each workload has an explicit profile in the registry.
- Each profile defines:
  - trust and latency characteristics
  - cache TTL
  - primary route
  - fallback route
- The router tries routes in order and skips unconfigured providers automatically.

## Prompt organization
- Each workload owns its own prompt builder and, where needed, its own structured output schema.
- Prompt logic is no longer bundled into one giant provider file.

## Validation design
- Structured tasks use Pydantic models plus generated JSON schema.
- Responses are parsed with brace-balanced JSON extraction instead of regex.
- Text responses are normalized and bounded before use.
- If validation fails, the router falls through to the next route.

# E. FEATURE-BY-FEATURE MIGRATION PLAN

## Weak-topic explanation
- Replaced provider call: [backend/routers/ai.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/routers/ai.py)
- New service path: [backend/services/ai_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/ai_service.py)
- Provider/model: Groq `openai/gpt-oss-20b`, fallback OpenRouter `stepfun/step-3.5-flash:free`
- Reliability controls: cache, prompt bounding, deterministic fallback text
- Execution: async real-time

## Dashboard focus hint
- Replaced provider call: [backend/services/dashboard_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/dashboard_service.py)
- Provider/model: Groq `openai/gpt-oss-20b`, fallback OpenRouter `stepfun/step-3.5-flash:free`
- Reliability controls: sync wrapper, cache, deterministic fallback hint
- Execution: sync wrapper over async router

## Study chat
- Replaced provider call: [backend/services/study_chat_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/study_chat_service.py)
- Provider/model: Groq `openai/gpt-oss-120b`, fallback OpenRouter `qwen/qwen3.6-plus:free`
- Reliability controls: grounded prompt, fallback reply, bounded output normalization
- Execution: async real-time

## Roadmap month enrichment
- Replaced provider call: [backend/services/roadmap_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/roadmap_service.py)
- Provider/model: OpenRouter `qwen/qwen3.6-plus:free`, fallback Groq `openai/gpt-oss-120b`
- Reliability controls: structured schema, cache, deterministic roadmap remains authoritative
- Execution: sync wrapper over async router

## Scraped question structuring
- Replaced provider call: [backend/services/scraper_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/scraper_service.py)
- Provider/model: Groq `openai/gpt-oss-120b`, fallback OpenRouter `openai/gpt-oss-120b:free`
- Reliability controls: Pydantic validation, concurrency limit, human review remains required
- Execution: async background job

## Syllabus parsing
- Replaced provider call: [backend/services/syllabus_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/syllabus_service.py)
- Provider/model: Groq `openai/gpt-oss-120b`, fallback OpenRouter `qwen/qwen3.6-plus:free`
- Reliability controls: structured validation plus deterministic rule parser fallback
- Execution: async background job

## Upload-to-MCQ generation
- Replaced provider call: [backend/services/student_upload_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/student_upload_service.py)
- Provider/model: Groq `openai/gpt-oss-120b`, fallback OpenRouter `qwen/qwen3.6-plus:free`
- Reliability controls: only used after deterministic parsing is insufficient, structured validation on generated questions
- Execution: async background job

# F. DETERMINISTIC VS AI BOUNDARY

## Remains deterministic
- Weakness scoring
- Spaced revision scheduling
- Adaptive recommendation ranking
- Planner state logic
- Roadmap core topic allocation
- Predictor math and analytics

## AI may augment
- Student-facing explanation copy
- Dashboard next-step hint copy
- Grounded chat phrasing
- Roadmap labels, resources, and day-plan enrichment
- Scraped question structuring before human review
- Syllabus hierarchy extraction before admin review
- MCQ generation from uploaded material when rule parsing is insufficient

## AI must never decide
- Final weakness score
- Revision interval or due date
- Recommendation priority score
- Whether a user is “ready”
- Which topic gets allocated by the roadmap core
- Planner completion state
- Predictor outputs or confidence math

# G. IMPLEMENTATION PLAN

## Exact engineering steps
1. Add provider settings and remove the legacy single-provider dependency.
2. Introduce `backend/ai` with provider clients, routing registry, prompts, validators, and task orchestration.
3. Add [backend/services/ai_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/ai_service.py) as the compatibility surface for existing services.
4. Swap all live backend imports to the new AI service.
5. Update runtime validation, setup docs, and admin UI wording.
6. Remove the obsolete legacy provider service file once the new layer is verified.

## Safest migration order
1. Config and provider clients
2. Router and validators
3. High-level task functions
4. Non-critical features first: dashboard hint, weak explanation
5. Structured async jobs: scraper, syllabus, upload-to-MCQ
6. Roadmap enrichment
7. Study chat
8. Docs, validation, cleanup

## Rollback safety
- Deterministic learning logic is untouched.
- If provider keys are missing, the system falls back rather than crashing.
- Roadmap generation still works without AI enrichment.
- Syllabus parsing still has a rule-based fallback.
- Upload parsing still tries deterministic extraction first.

# H. SMALL BUILD CHUNKS

## Chunk 1: Provider config
- Goal: add OpenRouter and Groq settings
- Create: none
- Modify: [backend/config.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/config.py), [.env.example](/d:/New%20folder%20(2)/SmartExamPrep/.env.example), [.env](/d:/New%20folder%20(2)/SmartExamPrep/.env)
- Test: app boots with one or both keys missing
- Definition of done: settings load without the legacy provider

## Chunk 2: Core AI package
- Goal: add provider clients, registry, router, prompts, validators
- Create: files under [backend/ai](/d:/New%20folder%20(2)/SmartExamPrep/backend/ai)
- Modify: none
- Test: import paths resolve and provider status reports correctly
- Definition of done: router can call either provider

## Chunk 3: Compatibility service
- Goal: expose stable service functions to the rest of the app
- Create: [backend/services/ai_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/ai_service.py)
- Modify: none
- Test: sync and async wrappers both work
- Definition of done: existing services can switch imports without signature changes

## Chunk 4: Student-facing copy features
- Goal: migrate weak-topic explanation and dashboard hint
- Create: none
- Modify: [backend/routers/ai.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/routers/ai.py), [backend/services/dashboard_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/dashboard_service.py), [backend/services/metrics_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/metrics_service.py)
- Test: dashboard and `/api/ai/explain` still return non-empty responses with provider keys missing
- Definition of done: fallback behavior is preserved

## Chunk 5: Structured admin jobs
- Goal: migrate scraper and syllabus flows
- Create: none
- Modify: [backend/services/scraper_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/scraper_service.py), [backend/services/syllabus_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/syllabus_service.py), [backend/routers/scraper.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/routers/scraper.py), [backend/routers/syllabus.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/routers/syllabus.py)
- Test: structured outputs validate and rule fallback still works for syllabus
- Definition of done: admin flows no longer depend on the legacy provider

## Chunk 6: Upload-to-MCQ generation
- Goal: migrate PDF upload generation fallback
- Create: none
- Modify: [backend/services/student_upload_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/student_upload_service.py)
- Test: rule-based parsing still wins when questions already exist; AI path returns validated questions
- Definition of done: upload flow works without the legacy provider

## Chunk 7: Roadmap enrichment
- Goal: keep roadmap allocation deterministic while swapping enrichment provider
- Create: none
- Modify: [backend/services/roadmap_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/roadmap_service.py)
- Test: roadmap generation still succeeds when AI enrichment fails
- Definition of done: roadmap month enrichment is optional and bounded

## Chunk 8: Study chat
- Goal: migrate grounded chat
- Create: none
- Modify: [backend/services/study_chat_service.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/services/study_chat_service.py)
- Test: fallback reply still works when providers are unavailable
- Definition of done: study chat uses the new router

## Chunk 9: Cleanup and docs
- Goal: remove legacy provider artifacts and document the new stack
- Create: [docs/AI_OPENROUTER_GROQ_MIGRATION_GUIDE.md](/d:/New%20folder%20(2)/SmartExamPrep/docs/AI_OPENROUTER_GROQ_MIGRATION_GUIDE.md)
- Modify: [README.md](/d:/New%20folder%20(2)/SmartExamPrep/README.md), [backend/run_ai_validation.py](/d:/New%20folder%20(2)/SmartExamPrep/backend/run_ai_validation.py), [backend/requirements.txt](/d:/New%20folder%20(2)/SmartExamPrep/backend/requirements.txt)
- Test: search confirms no live runtime legacy-provider dependency remains
- Definition of done: the project documents OpenRouter + Groq as the active AI layer

# Setup Guide

## Required environment variables
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_SITE_URL`
- `OPENROUTER_APP_NAME`
- `GROQ_API_KEY`
- `GROQ_BASE_URL`

## Recommended local setup
1. Copy [.env.example](/d:/New%20folder%20(2)/SmartExamPrep/.env.example) to `.env`.
2. Add at least one provider key.
3. Add both provider keys to enable primary plus fallback routing.
4. Restart the backend after changing env values.

## Key behavior notes
- If only Groq is configured, the system still works and structured tasks remain strong.
- If only OpenRouter is configured, the system still works, but structured tasks rely more on best-effort plus validation and may degrade more often.
- If neither is configured, deterministic features still work and AI features fall back gracefully.
