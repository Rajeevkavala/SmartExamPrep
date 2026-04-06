# 15 File By File Changelog

## How To Read This Document

This is the engineering change map for adding Smart Onboarding 2.0, roadmap generation, daily planning, enhanced dashboard, PYQ browsing, and the AI study chatbot without rebuilding SmartExamPrep.

Edit size definitions used below:

- `small edit`: localized shape/field/UI adjustment
- `medium edit`: meaningful feature extension, but existing structure remains
- `major rewrite`: file remains in place, but a large portion of its logic/UI contract changes

## Existing Backend Files That Should Change

| File Path | Why It Must Change | What Exactly Must Change | Edit Size | Feature Dependencies |
| --- | --- | --- | --- | --- |
| `backend/models/models.py` | All new product features need new persisted entities. | Add onboarding profile fields on `User`; add `UserSubjectConfidence`, `UserTopicBaseline`, `StudyRoadmap`, `RoadmapWeek`, `RoadmapWeekTopic`, `DailyStudyPlan`, `DailyStudyTask`, `StudyActivityLog`, `StudyChatSession`, `StudyChatMessage`; add indexes and relationships. | major rewrite | Onboarding 2.0, Roadmap, Planner, Dashboard, Chat |
| `backend/main.py` | New routers must be registered centrally. | Register `roadmap`, `planner`, `pyq`, and `study_chat` routers; keep existing router order stable. | medium edit | Roadmap, Planner, PYQ, Chat |
| `backend/schemas/auth_schemas.py` | Current profile schema only supports study minutes and experience level. | Expand `UpdateProfileRequest` and `UserResponse`; add nested onboarding DTOs for subject confidence and known topics. | medium edit | Onboarding 2.0 |
| `backend/schemas/analysis_schemas.py` | Dashboard contract is currently too narrow for execution metrics. | Extend `DashboardResponse`; optionally add richer topic progress and planner summary models; keep current metric fields additive. | medium edit | Enhanced Dashboard |
| `backend/schemas/quiz_schemas.py` | Existing quiz contract does not explicitly cover new attempt contexts. | Allow clean support for `pyq_practice`; optionally add context or source metadata for planner/PYQ-originated sessions. | small edit | Planner, PYQ |
| `backend/routers/auth.py` | Current `PUT /me` writes only two fields directly. | Route profile updates through a dedicated profile service and return enriched onboarding data from `GET /me`. | medium edit | Onboarding 2.0 |
| `backend/routers/analysis.py` | Dashboard endpoint must return richer metrics after planner/roadmap exist. | Expand `GET /dashboard`; optionally extend `GET /metrics` filters or response fields without breaking current consumers. | medium edit | Enhanced Dashboard |
| `backend/routers/quiz.py` | Planner and PYQ practice will reuse quiz submission flow. | Accept new `quiz_type` values and optional planner/PYQ context cleanly while preserving diagnostic/adaptive behavior. | small edit | Planner, PYQ |
| `backend/routers/revision.py` | Planner needs revision completions to feed activity tracking. | Keep current topic-based completion route, but add activity logging and possibly better completion semantics later. | small edit | Planner, Dashboard |
| `backend/routers/admin_questions.py` | PYQ browser quality depends on high-quality question metadata. | Tighten validation, filtering, or list support around `source_type`, `year`, and `source_url` if needed for admin maintenance. | small edit | PYQ |
| `backend/schemas/admin_schemas.py` | PYQ quality is only as good as question metadata validation. | Ensure `year`, `source_type`, and any future PYQ metadata remain strongly validated. | small edit | PYQ |
| `backend/services/auth_service.py` | User serialization and auth-adjacent profile helpers may need to be shared. | Keep auth narrow, but add helper(s) only if needed to serialize enriched user profile or support `auth.py` cleanly. | small edit | Onboarding 2.0 |
| `backend/services/weakness_service.py` | Roadmap and dashboard will depend heavily on weakness outputs. | Expose clean helper behavior for roadmap consumers; remove brittle `from main import weakness_detector` coupling if touched. | medium edit | Roadmap, Dashboard |
| `backend/services/recommendation_service.py` | Planner and chat should reuse practice recommendations instead of reinventing them. | Add planner-friendly recommendation hooks or context handling; keep adaptive recommendation logic intact. | medium edit | Planner, Chat |
| `backend/services/quiz_service.py` | It is the durable scoring/mastery path for all practice flows. | Preserve scoring, add activity logging, and support planner/PYQ context without forking result-snapshot logic. | medium edit | Planner, PYQ, Dashboard |
| `backend/services/dashboard_service.py` | Current dashboard is readiness-heavy and execution-light. | Aggregate streak, hours, solved questions, roadmap progress, planner progress, and optional AI focus hint. | major rewrite | Enhanced Dashboard |
| `backend/services/metrics_service.py` | More feature depth requires more reliable analytics rollups. | Add planner/roadmap-aware metrics carefully and keep current research-facing outputs stable. | medium edit | Enhanced Dashboard |
| `backend/services/ai_service.py` | Chatbot and optional dashboard hints need a shared AI layer. | Add grounded chat reply generation, optional dashboard focus hint, stronger fallback behavior, and explicit timeout handling. | medium edit | Dashboard, Chat |
| `backend/ml/nlp_pipeline.py` | Chat may need lightweight topic matching from freeform prompts. | Add or expose topic/keyword matching helpers without forcing embeddings into every request path. | small edit | Chat |
| `backend/test_api_flow.py` | Manual smoke script should reflect newly added core routes. | Extend smoke flow to cover enriched profile, roadmap, planner, PYQ, and chat entrypoints. | medium edit | All new features |
| `backend/run_ai_validation.py` | AI validation currently covers explanations and model fallbacks, not chat grounding. | Add validation scenarios for grounded chat and any new AI helper behavior. | medium edit | Chat, Dashboard |
| `backend/seed.py` | Current base seed is too thin for realistic roadmap and PYQ behavior. | Expand or adjust seed strategy for onboarding/profile defaults and enough content structure to exercise new features. | medium edit | Onboarding, Roadmap, PYQ |
| `backend/seed_demo.py` | Demo personas should cover roadmap/planner/dashboard usage. | Add richer sample users, subject confidences, known topics, roadmaps, plans, and activity logs. | medium edit | Roadmap, Planner, Dashboard, Chat |

## Existing Frontend Files That Should Change

| File Path | Why It Must Change | What Exactly Must Change | Edit Size | Feature Dependencies |
| --- | --- | --- | --- | --- |
| `frontend/middleware.ts` | New protected student routes are being added. | Protect `/roadmap`, `/planner`, `/pyq`, and `/chat`; keep current auth checks stable. | medium edit | Roadmap, Planner, PYQ, Chat |
| `frontend/lib/api.ts` | More feature surfaces will depend on consistent auth and error handling. | Ensure larger payload handling and reliable API behavior for new student pages; avoid stale auth during longer submissions. | small edit | Onboarding, Planner, Chat |
| `frontend/lib/validations.ts` | Current Zod schemas do not cover onboarding profile or planner/chat inputs. | Add onboarding validation schemas and any new route-specific client-side validation. | medium edit | Onboarding 2.0 |
| `frontend/store/authStore.ts` | Roadmap and planner need richer user-profile state. | Replace weakly typed `AuthUser` with explicit onboarding fields and keep store refresh behavior correct after profile save. | medium edit | Onboarding 2.0, Roadmap |
| `frontend/store/dashboardStore.ts` | Dashboard store shape is currently limited to readiness-related fields. | Add KPI, streak, roadmap-progress, plan-summary, and richer quick-action state. | medium edit | Enhanced Dashboard |
| `frontend/store/quizStore.ts` | New attempt types may need extra result metadata. | Preserve current result snapshot behavior while allowing planner/PYQ session context if surfaced in UI. | small edit | Planner, PYQ |
| `frontend/app/(student)/onboarding/page.tsx` | Current onboarding is only two fields. | Refactor into multi-step Smart Onboarding 2.0 flow using existing content APIs and saving via `PUT /auth/me`. | major rewrite | Onboarding 2.0 |
| `frontend/app/(student)/dashboard/page.tsx` | Current dashboard cannot surface roadmap/planner execution data. | Add KPI row, roadmap progress, planner summary, improved quick actions, and optional integrated AI hint behavior. | major rewrite | Dashboard, Roadmap, Planner, PYQ, Chat |
| `frontend/app/(student)/revision/page.tsx` | Revision is now one input into planner and activity tracking. | Add light integration points, messaging, or navigation back to planner while preserving current standalone use. | small edit | Planner, Dashboard |
| `frontend/app/(student)/quiz/diagnostic/page.tsx` | Shared quiz behavior should stay aligned as new practice modes are added. | If needed, extract shared question-session behavior and fix current unanswered-default handling rather than duplicating logic. | medium edit | PYQ, Planner |
| `frontend/app/(student)/quiz/adaptive/page.tsx` | Same reason as diagnostic page. | Keep existing adaptive flow stable while converging any shared quiz-session improvements. | medium edit | PYQ, Planner |
| `frontend/app/(student)/quiz/result/[attemptId]/page.tsx` | Result UI will now serve more than diagnostic/adaptive sessions. | Support labels and metadata for `pyq_practice` and any planner-originated attempt context. | medium edit | PYQ, Planner |
| `frontend/app/admin/questions/page.tsx` | Admin metadata quality directly affects the PYQ browser. | Improve visibility and maintenance of `source_type`, `year`, and verification quality for PYQ content. | small edit | PYQ |
| `frontend/components/admin/QuestionFormModal.tsx` | PYQ content quality is entered here. | Strengthen UX and validation cues for year/source inputs so student PYQ browsing is reliable. | small edit | PYQ |
| `frontend/components/student/NLPInsightCard.tsx` | Dashboard AI presentation may evolve from one weak-topic explanation to richer focus hints. | Adjust content layout or semantics if `nlp_insight` becomes more structured. | small edit | Dashboard |
| `frontend/components/student/ReadinessGauge.tsx` | Enhanced dashboard may need visual integration with other KPI blocks. | Minor display refinement or prop extension only if needed; keep component reusable. | small edit | Dashboard |
| `frontend/components/student/RevisionItem.tsx` | Planner-linked revision tasks may need slightly richer status display. | Optional UI refinement for planner context, completion copy, or link-outs. | small edit | Planner |
| `frontend/tests/e2e/chunk11-student-pages.spec.ts` | Current student flow tests stop before roadmap/planner/chat features exist. | Extend or split tests to cover onboarding expansion, dashboard changes, and new route access. | medium edit | Onboarding, Dashboard, Chat |
| `frontend/tests/e2e/chunk12-quiz-revision.spec.ts` | Planner and PYQ will reuse quiz and revision flows. | Add coverage for shared regression points, especially quiz submit behavior and revision integration. | medium edit | Planner, PYQ |
| `frontend/tests/e2e/chunk14-admin-questions.spec.ts` | PYQ browser relies on clean admin question metadata. | Add assertions for year/source workflows and quality gates. | small edit | PYQ |

## Existing Files That Should Mostly Remain Unchanged

These files are important but should be reused, not rewritten, unless implementation details force a small local adjustment:

- `backend/database.py`
- `backend/config.py`
- `backend/routers/content.py`
- `backend/routers/feedback.py`
- `backend/routers/admin_content.py`
- `backend/routers/scraper.py`
- `backend/routers/syllabus.py`
- `backend/services/scraper_service.py`
- `backend/services/syllabus_service.py`
- `frontend/app/(auth)/login/page.tsx`
- `frontend/app/admin/scraper/page.tsx`
- `frontend/app/admin/syllabus/page.tsx`
- `frontend/components/admin/AdminGuard.tsx`
- `frontend/components/admin/AdminSidebar.tsx`

## New Backend Files To Create

| New File Path | Why It Is Needed | Primary Feature |
| --- | --- | --- |
| `backend/alembic/versions/<timestamp>_add_onboarding_profile_tables.py` | Add onboarding profile persistence safely through migration. | Onboarding 2.0 |
| `backend/alembic/versions/<timestamp>_add_roadmap_tables.py` | Persist roadmap structures and active/superseded generations. | Roadmap |
| `backend/alembic/versions/<timestamp>_add_daily_planner_tables.py` | Persist daily plans, tasks, and activity logs. | Planner, Dashboard |
| `backend/alembic/versions/<timestamp>_add_pyq_indexes_or_attempt_context.py` | Add PYQ-focused indexes or attempt context field if needed. | PYQ |
| `backend/alembic/versions/<timestamp>_add_study_chat_tables.py` | Persist chat sessions and chat messages. | Chat |
| `backend/services/profile_service.py` | Isolate onboarding/profile write logic from `auth.py`. | Onboarding 2.0 |
| `backend/services/roadmap_service.py` | Own roadmap generation, persistence, and retrieval. | Roadmap |
| `backend/services/planner_service.py` | Own daily plan generation and carry-forward logic. | Planner |
| `backend/services/study_activity_service.py` | Centralize activity logging for planner, revision, and quiz events. | Planner, Dashboard |
| `backend/services/pyq_service.py` | Own PYQ filter construction, browsing, and practice-session launch. | PYQ |
| `backend/services/study_chat_service.py` | Assemble grounded context and manage conversational state. | Chat |
| `backend/routers/roadmap.py` | Expose roadmap endpoints cleanly. | Roadmap |
| `backend/routers/planner.py` | Expose daily-plan endpoints cleanly. | Planner |
| `backend/routers/pyq.py` | Expose PYQ browse and practice endpoints. | PYQ |
| `backend/routers/study_chat.py` | Expose chat session and messaging endpoints. | Chat |
| `backend/schemas/roadmap_schemas.py` | Typed roadmap API contracts. | Roadmap |
| `backend/schemas/planner_schemas.py` | Typed planner API contracts. | Planner |
| `backend/schemas/pyq_schemas.py` | Typed PYQ browser and practice contracts. | PYQ |
| `backend/schemas/study_chat_schemas.py` | Typed chat session and message contracts. | Chat |
| `backend/tests/test_profile_onboarding.py` | Protect richer profile read/write behavior. | Onboarding 2.0 |
| `backend/tests/test_roadmap_service.py` | Validate roadmap sequencing deterministically. | Roadmap |
| `backend/tests/test_roadmap_router.py` | Cover roadmap API behavior. | Roadmap |
| `backend/tests/test_planner_service.py` | Validate daily plan generation and carry-forward behavior. | Planner |
| `backend/tests/test_planner_router.py` | Cover planner API behavior. | Planner |
| `backend/tests/test_dashboard_metrics.py` | Protect new dashboard aggregate logic. | Dashboard |
| `backend/tests/test_pyq_router.py` | Cover PYQ browser and practice endpoints. | PYQ |
| `backend/tests/test_study_chat_router.py` | Cover chat authorization, session flow, and fallback behavior. | Chat |

## New Frontend Files To Create

| New File Path | Why It Is Needed | Primary Feature |
| --- | --- | --- |
| `frontend/app/(student)/roadmap/page.tsx` | Student roadmap surface. | Roadmap |
| `frontend/app/(student)/planner/page.tsx` | Student daily-plan surface. | Planner |
| `frontend/app/(student)/pyq/page.tsx` | Student PYQ browser and launcher. | PYQ |
| `frontend/app/(student)/chat/page.tsx` | Student chatbot surface. | Chat |
| `frontend/store/roadmapStore.ts` | Isolate roadmap state from dashboard/auth stores. | Roadmap |
| `frontend/store/plannerStore.ts` | Hold today's plan, task updates, and carry-forward state. | Planner |
| `frontend/store/chatStore.ts` | Hold sessions, messages, and sending state. | Chat |
| `frontend/components/student/OnboardingExamTargets.tsx` | Keep expanded onboarding flow modular. | Onboarding 2.0 |
| `frontend/components/student/OnboardingSubjectConfidence.tsx` | Capture subject-level confidence cleanly. | Onboarding 2.0 |
| `frontend/components/student/OnboardingKnownTopics.tsx` | Capture known-topic selections cleanly. | Onboarding 2.0 |
| `frontend/components/student/RoadmapHero.tsx` | Show roadmap summary and exam timeline. | Roadmap |
| `frontend/components/student/RoadmapMonthSection.tsx` | Render roadmap grouped month by month. | Roadmap |
| `frontend/components/student/RoadmapWeekCard.tsx` | Show per-week roadmap details. | Roadmap |
| `frontend/components/student/RoadmapTopicList.tsx` | Render topic-level weekly items. | Roadmap |
| `frontend/components/student/DailyPlanHero.tsx` | Summarize today's plan at the top of planner page. | Planner |
| `frontend/components/student/DailyTaskCard.tsx` | Render planner task rows with status actions. | Planner |
| `frontend/components/student/CarryForwardBanner.tsx` | Call out unfinished carried tasks. | Planner |
| `frontend/components/student/PlannerSummary.tsx` | Show plan progress and time budget. | Planner |
| `frontend/components/student/DashboardKpiCard.tsx` | Reusable dashboard metric card. | Dashboard |
| `frontend/components/student/DashboardQuickActions.tsx` | Centralize dashboard navigation actions. | Dashboard |
| `frontend/components/student/RoadmapProgressCard.tsx` | Show roadmap completion inside dashboard. | Dashboard |
| `frontend/components/student/TopicProgressTable.tsx` | Present topic progress beyond weakest/strongest lists. | Dashboard |
| `frontend/components/student/StudyStreakCard.tsx` | Visualize streak and continuity. | Dashboard |
| `frontend/components/student/PYQFilterBar.tsx` | Filter previous-year-question results. | PYQ |
| `frontend/components/student/PYQQuestionTable.tsx` | Render browsable PYQ inventory. | PYQ |
| `frontend/components/student/PYQPracticeLauncher.tsx` | Start filtered PYQ practice sessions. | PYQ |
| `frontend/components/student/ChatSidebarContext.tsx` | Show what the chatbot is grounded on. | Chat |
| `frontend/components/student/StudyChatComposer.tsx` | Message input and send controls. | Chat |
| `frontend/components/student/StudyChatMessageList.tsx` | Conversation timeline display. | Chat |
| `frontend/components/student/StudyChatStarterPrompts.tsx` | Fast entry into common study-chat use cases. | Chat |

## New Test Files To Create

| New File Path | Why It Is Needed |
| --- | --- |
| `frontend/tests/e2e/chunk17-roadmap.spec.ts` | End-to-end roadmap generation and rendering coverage. |
| `frontend/tests/e2e/chunk18-planner.spec.ts` | End-to-end planner generation, completion, and carry-forward coverage. |
| `frontend/tests/e2e/chunk19-pyq.spec.ts` | End-to-end PYQ browser and practice coverage. |
| `frontend/tests/e2e/chunk20-chat.spec.ts` | End-to-end chatbot surface and fallback coverage. |

## Recommended Order For Touching Existing Files

Use this order when implementing to minimize churn:

1. `backend/models/models.py`
2. migration file for the phase
3. new backend service(s)
4. new backend schema(s)
5. existing router(s) for that phase
6. `backend/main.py`
7. frontend store changes
8. new frontend page/components
9. existing frontend page integration
10. tests and smoke scripts

## High-Risk Existing Files

These files need extra care because regressions here can break large parts of the product:

- `backend/models/models.py`
- `backend/services/quiz_service.py`
- `backend/services/dashboard_service.py`
- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/onboarding/page.tsx`
- `frontend/middleware.ts`
- `frontend/lib/api.ts`

