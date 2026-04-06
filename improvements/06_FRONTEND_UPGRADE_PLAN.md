# Frontend Upgrade Plan

## Current Frontend Strategy To Preserve

The existing frontend is:

- Next.js 14 App Router
- mostly client components
- Axios-driven data fetching
- Zustand for a small amount of persistent client state

The safest upgrade path is to keep that mental model intact. Do not rebuild the frontend around server components or a new global architecture while delivering these features.

## Existing Pages That Should Be Extended

## 1. `frontend/app/(student)/onboarding/page.tsx`

### Current role

- captures `daily_study_minutes`
- captures `experience_level`
- saves via `PUT /api/auth/me`
- redirects to diagnostic quiz

### Planned extension

Turn it into a multi-step onboarding flow that captures:

- exam target date
- daily study target using the current `daily_study_minutes` field
- experience level using the current `experience_level` field
- subject-wise confidence
- known topics

### Recommended UI shape

- step 1: exam date + time target + level
- step 2: subject confidence matrix
- step 3: topic familiarity selection
- save and continue to roadmap generation or diagnostic quiz based on user state

## 2. `frontend/app/(student)/dashboard/page.tsx`

### Current role

- readiness gauge
- weakest topics
- strongest topics
- subject progress
- AI explanation
- quick links

### Planned extension

Keep the route and evolve the page into a richer command center that adds:

- streak card
- questions solved
- accuracy card
- hours studied
- roadmap progress summary
- today’s plan summary
- topic progress widget
- quick links to roadmap, planner, PYQ, and chat

### Important note

Do not replace the dashboard route. Build on top of it and refactor its sections into smaller components.

## 3. `frontend/app/(student)/revision/page.tsx`

### Current role

- shows due revision rows
- marks them complete

### Planned extension

- Keep the route.
- Integrate revision rows into the new planner language:
  - show schedule/task IDs
  - optionally show “open today’s planner” link
  - align completion action with planner task completion if a revision item came from today’s plan

## 4. `frontend/app/(student)/quiz/*`

### Current role

- diagnostic quiz
- adaptive quiz
- result page

### Planned extension

- Keep the current diagnostic and adaptive routes.
- Extend the result page to show:
  - links back into roadmap/planner
  - next recommended action
- Reuse the same question card/result components for PYQ practice mode.

## Existing Frontend State To Extend

## 1. `frontend/store/authStore.ts`

### Expand user profile shape with

- `exam_target_date`
- `onboarding_version`
- `onboarding_completed_at`
- `subject_confidences`
- `known_topic_ids`

### Why it matters

The onboarding page, roadmap page, and dashboard header all benefit from reading the same profile state.

## 2. `frontend/store/dashboardStore.ts`

### Expand to include

- `study_streak_days`
- `questions_solved`
- `average_accuracy_pct`
- `hours_studied`
- `roadmap_progress`
- `topic_progress`
- `today_plan_summary`

## 3. `frontend/store/quizStore.ts`

### Extend carefully

- keep `latestResult`
- optionally store `context_payload` if the result page needs to know whether the attempt came from:
  - adaptive quiz
  - PYQ practice
  - planner task

## New Stores To Add

## 1. `frontend/store/roadmapStore.ts`

Purpose:

- active roadmap summary
- selected week/month view state
- regenerate/loading state

## 2. `frontend/store/plannerStore.ts`

Purpose:

- today’s plan
- task completion state
- refresh/carry-forward state

## 3. `frontend/store/chatStore.ts`

Purpose:

- active chat session
- session list
- optimistic message state

## New Pages To Add

## 1. `frontend/app/(student)/roadmap/page.tsx`

### Purpose

Student-facing roadmap overview.

### Expected content

- roadmap summary hero
- next milestone
- month-by-month grouping
- week-by-week cards
- rationale panel for why specific topics are prioritized

## 2. `frontend/app/(student)/planner/page.tsx`

### Purpose

Student-facing daily execution page.

### Expected content

- today’s task list
- revision tasks
- practice targets
- carry-forward banner
- complete/skip actions

## 3. `frontend/app/(student)/pyq/page.tsx`

### Purpose

Student-facing previous-year-question browser.

### Expected content

- filters by subject/topic/year/difficulty
- list/table of PYQs
- “start practice” action from filtered set

## 4. `frontend/app/(student)/chat/page.tsx`

### Purpose

Grounded study assistant page.

### Expected content

- session list
- conversation thread
- suggestion chips:
  - explain this weak topic
  - help me adjust my roadmap
  - plan today for me
  - what PYQs should I solve next

## Student Navigation / Layout Recommendation

### Suggested addition

- `frontend/app/(student)/layout.tsx`
- `frontend/components/student/StudentShell.tsx`

### Why

Once roadmap, planner, PYQ, and chat are added, student navigation will be too fragmented if every page stays standalone.

### Risk level

Medium. This is a structural addition that affects all student routes, so it should be introduced after the new pages exist and the layout requirements are clear, likely in Phase 4.

## New Components To Add

## Onboarding components

- `frontend/components/student/OnboardingExamTargets.tsx`
- `frontend/components/student/OnboardingSubjectConfidence.tsx`
- `frontend/components/student/OnboardingKnownTopics.tsx`

## Roadmap components

- `frontend/components/student/RoadmapHero.tsx`
- `frontend/components/student/RoadmapTimeline.tsx`
- `frontend/components/student/RoadmapWeekCard.tsx`
- `frontend/components/student/RoadmapProgressCard.tsx`

## Planner components

- `frontend/components/student/PlannerSummaryCard.tsx`
- `frontend/components/student/PlannerTaskCard.tsx`
- `frontend/components/student/CarryForwardBanner.tsx`

## Dashboard components

- `frontend/components/student/DashboardStatCard.tsx`
- `frontend/components/student/TopicProgressTable.tsx`
- `frontend/components/student/TodayPlanPreview.tsx`

## PYQ components

- `frontend/components/student/PyqFilterBar.tsx`
- `frontend/components/student/PyqQuestionList.tsx`
- `frontend/components/student/PyqPracticeBanner.tsx`

## Chat components

- `frontend/components/student/StudyChatThread.tsx`
- `frontend/components/student/StudyChatComposer.tsx`
- `frontend/components/student/StudyChatSuggestions.tsx`

## Existing Frontend Files That Need Contract Updates

| File | Why |
| --- | --- |
| `frontend/lib/api.ts` | New endpoints, plus keep auth/error behavior stable |
| `frontend/lib/validations.ts` | New onboarding and planner/chat form validation |
| `frontend/middleware.ts` | Add `/roadmap`, `/planner`, `/pyq`, `/chat` to protected paths |

## Where Each New Feature Fits In The Frontend

## Smart Onboarding 2.0

- Extends the existing onboarding page.
- Uses current auth store update pattern.

## Roadmap Generator

- New `/roadmap` page.
- Accessible from dashboard and onboarding completion.

## Daily Study Planner

- New `/planner` page.
- Should become one of the main post-login destinations.

## Enhanced Dashboard

- Extends existing `/dashboard`.
- Should summarize, not replace, planner and roadmap detail pages.

## PYQ Browser

- New `/pyq` page.
- Should reuse `QuizCard` for practice sessions.

## AI Study Chatbot

- New `/chat` page.
- Quick-entry buttons can also live on the dashboard, roadmap, and planner pages.

## Frontend Risks

### 1. Middleware/auth coupling

Current route protection depends on the `token` cookie written by the client store, not only the backend cookie. Any auth refactor should be incremental.

### 2. Dashboard page size

The current dashboard page is already doing data fetch + AI explanation + multiple sections. New KPI and planner widgets should be extracted into child components early.

### 3. Student navigation sprawl

Without a shared student layout or shell, the UX will feel disconnected once four more student routes exist.

## Frontend Rule Of Thumb

Favor additive pages and smaller component extraction over architecture churn. The current frontend is good enough to evolve in place.
