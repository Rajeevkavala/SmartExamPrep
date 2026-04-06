# SmartExamPrep Frontend Full Redesign Blueprint

## 1. Goal and Scope

This document defines a complete redesign plan for the SmartExamPrep frontend so that:

1. The public landing page visually matches the provided `smartexamprep-landing-new.html` exactly.
2. All application pages are redesigned to match the visual direction shown in the provided screenshots.
3. Existing functionality and API contracts are preserved while the UI/UX is modernized and unified.

Scope includes:

- Public pages (`/`, `/login`)
- Student application shell and student pages
- Admin pages
- Shared components, design tokens, and styling architecture

Out of scope for this phase:

- Backend API contract changes
- Business logic changes unrelated to UI interaction clarity
- Feature removals

---

## 2. Source Inputs Analyzed

### 2.1 Primary Visual Source of Truth

- `smartexamprep-landing-new.html` (full HTML/CSS/JS analyzed)

### 2.2 Screenshot Targets Analyzed

Screens were analyzed for these target interfaces:

1. Dashboard
2. Exams catalog
3. AI Predictor
4. My Roadmap
5. PYQ Bank (filter/list/detail split layout)
6. Mock Tests setup page
7. Mock Test live session page (timer + question navigator)
8. PDF Upload + Upload History
9. AI Assistant chat page
10. Progress analytics page
11. Settings page
12. Profile page

### 2.3 Existing Frontend Codebase Analyzed

- App routes under `frontend/app`
- Shared/student/admin components under `frontend/components`
- Global style/token setup in `frontend/app/globals.css`
- Layout shell in `frontend/components/layout/AppShell.tsx`
- State stores under `frontend/store`

---

## 3. Visual DNA to Replicate

The redesign must preserve this visual DNA across all pages.

## 3.1 Color System

Canonical colors (from landing HTML):

- `--fire: #e8520a`
- `--fire2: #ff6b1a`
- `--ember: #c43d00`
- `--ice: #00d4ff`
- `--ice2: #00a8cc`
- `--cream: #f0e8da`
- `--paper: #0d0d12`
- `--ink: #c2bab0`
- `--muted: #5a5550`
- `--border: #1e1c18`
- `--bg: #06060a`
- semantic support colors: green (`#22c55e`), amber (`#f59e0b`), red (`#ef4444`)

### Visual rules

- Black-heavy base (`#06060a`) with subtle card elevation and border lines.
- Accent hierarchy:
  - Fire orange = primary CTA and important emphasis
  - Cyan/ice = secondary accent and data context
  - Green/amber/red = state/status semantics
- Avoid bright flat fills for large surfaces; use layered gradients and translucent panels.

## 3.2 Typography

Font stack (must remain):

- Display: Bebas Neue
- Body: Outfit
- Serif accent: Instrument Serif
- Mono labels: IBM Plex Mono

Typography usage pattern:

- Large all-caps display headings with tight leading and wide tracking
- Mono uppercase micro-labels for metadata
- Serif italic for strategic narrative text
- Body copy in lightweight Outfit with generous line-height

## 3.3 Surface Language

- 1px low-contrast borders for structure
- Rounded but not overly soft corners
- Noise and grid overlays at low opacity
- Subtle radial glows behind key blocks
- Dense dashboard-like cards with explicit section framing

## 3.4 Motion Language

- Reveal-on-scroll (small translate + fade)
- Counter and progress animations (purposeful, not decorative overload)
- Hover states with slight lift and border emphasis
- No heavy spring animations on every element

## 3.5 Interaction Signature

- Distinct status badges for every state
- Quick-action buttons are always visible in context
- Tables and cards should provide immediate scan value
- Forms should be dense, practical, and exam-console-like

---

## 4. Current Frontend Architecture Audit

## 4.1 Existing Route Inventory

### Public/Auth

- `/` (landing)
- `/login`

### Student

- `/dashboard`
- `/roadmap`
- `/planner`
- `/quiz`
- `/quiz/diagnostic`
- `/quiz/adaptive`
- `/quiz/result/[attemptId]`
- `/pyq`
- `/revision`
- `/chat`
- `/onboarding`
- `/feedback`

### Admin

- `/admin`
- `/admin/subjects`
- `/admin/questions`
- `/admin/questions/[id]`
- `/admin/scraper`
- `/admin/syllabus`

## 4.2 Shared Layout and Design System Baseline

Good foundations already present:

- Tokenized CSS variables in `globals.css`
- Shared visual primitives in `components/shared/brand-ui.tsx`
- Student shell with sidebar and contextual header in `components/layout/AppShell.tsx`
- Reusable cards/inputs/buttons in `components/ui`

Current mismatch:

- Student shell structure and navigation do not yet match screenshot IA.
- Admin area uses a separate slate/indigo visual language that diverges from main brand.
- Some pages are card-centric while screenshots require denser dashboard/table/list layouts.

## 4.3 Component Audit by Domain

### Student dashboard family

- `DashboardKpiCard`
- `ReadinessGauge`
- `WeaknessBar`
- `TopicProgressTable`
- `NLPInsightCard`
- `DashboardQuickActions`

### Roadmap/planner family

- `RoadmapHero`
- `RoadmapMonthSection`
- `RoadmapWeekCard`
- `RoadmapTopicList`
- `DailyPlanHero`
- `DailyTaskCard`
- `PlannerSummary`
- `CarryForwardBanner`

### Quiz/PYQ/revision family

- `QuizCard`
- `PYQFilterBar`
- `PYQQuestionTable`
- `PYQPracticeLauncher`
- `RevisionItem`

### Chat family

- `StudyChatMessageList`
- `StudyChatComposer`
- `StudyChatStarterPrompts`
- `ChatSidebarContext`

### Onboarding family

- `OnboardingExamTargets`
- `OnboardingSubjectConfidence`
- `OnboardingKnownTopics`

### Admin family

- `AdminSidebar`
- `QuestionFormModal`
- `ScrapeJobCard`
- `SyllabusTreeViewer`
- `SubtopicChipEditor`

## 4.4 State/Data Layer Audit

Zustand stores are cleanly separated:

- `authStore`, `dashboardStore`, `plannerStore`, `quizStore`, `roadmapStore`, `chatStore`

No redesign should break these contracts. UI refactors should consume existing selectors and payload shapes.

---

## 5. Gap Analysis vs Target Screens

## 5.1 Global Navigation and Shell Gaps

Target screenshots show a shell with:

- Exam Track selector in sidebar
- Left nav items:
  - Dashboard
  - Exams
  - AI Predictor
  - My Roadmap
  - PYQ Bank
  - Mock Tests
  - PDF Upload
  - AI Assistant
  - Progress
  - Settings
- Top utility row with exam dropdown, search, theme toggle, notifications, user menu

Current shell has:

- Dashboard, Roadmap, Planner, Quiz, PYQ, Revision, Study Chat

Conclusion:

- Navigation IA requires a full update and route expansion.

## 5.2 Landing Page Gap

Current `/` is stylistically close but not exact to `smartexamprep-landing-new.html`.

Missing or divergent sections:

- Problem section parity
- Closed loop SVG architecture section parity
- Detailed feature rows with embedded mini visual modules
- Dashboard preview block parity
- PYQ and Study Chat section exact compositions
- Testimonials, Compare, Pricing, FAQ, CTA, Footer exact parity
- Cursor and marquee micro-interactions parity

Conclusion:

- Landing should be rebuilt section-for-section from the HTML source with React-safe interaction hooks.

## 5.3 Missing Student Pages (from screenshots)

The following screenshot pages are not present as dedicated routes and must be added:

- Exams catalog
- AI Predictor
- Mock Tests home/setup page
- PDF Upload page
- Progress analytics page
- Settings page
- Profile page

## 5.4 Existing Page Structural Differences

- Current dashboard is richer in data cards but does not yet match screenshot composition hierarchy.
- Current PYQ page supports practice and table listing; screenshots require split pane with answer reveal and AI explain CTA styling.
- Current quiz pages are functional but do not include screenshot-style timed full-session interface with numbered navigator grid.
- Current chat page is close functionally but needs exact panel layout and action strips shown in screenshots.

## 5.5 Admin Theme Divergence

- Admin pages currently use slate/indigo colors and separate visual grammar.
- If "all pages" includes admin, admin should either:
  - be intentionally branded in the same dark-fire/ice system, or
  - be documented as separate mode.

Recommendation: unify admin theme tokens with shared brand to reduce maintenance and visual fragmentation.

---

## 6. Target Information Architecture (IA)

## 6.1 Student Route Map (Target)

Keep existing:

- `/dashboard`
- `/roadmap`
- `/pyq`
- `/chat` (label as AI Assistant)

Add new routes:

- `/exams`
- `/predictor`
- `/mock-tests`
- `/mock-tests/session/[sessionId]`
- `/pdf-upload`
- `/progress`
- `/settings`
- `/profile`

Deprecate/reframe:

- `/planner` and `/revision` should remain, but be integrated as subflows surfaced through Dashboard/Progress and not primary nav if screenshots are strict.

## 6.2 Navigation Label Mapping

- `Roadmap` -> `My Roadmap`
- `Quiz` -> `Mock Tests`
- `Study Chat` -> `AI Assistant`

---

## 7. Page-by-Page Redesign Specification

Each section below defines mandatory layout and behavior to match screenshot direction.

## 7.1 Landing (`/`)

### Objective

Match `smartexamprep-landing-new.html` with visual fidelity.

### Required sections (exact order)

1. Hero
2. Problem
3. Closed learning loop
4. Core features
5. Dashboard preview
6. PYQ bank preview
7. Study chat preview
8. Testimonials
9. Compare
10. Pricing
11. FAQ
12. CTA
13. Footer

### Implementation notes

- Port section IDs and class naming hierarchy.
- Move static CSS into modularized structure while preserving values.
- Replace inline JS behaviors with React hooks and event handlers.
- Preserve animation timings, counters, and FAQ accordion behavior.

### Acceptance criteria

- Visual side-by-side with HTML: at least 95% structural and styling parity.
- No missing section from source HTML.
- Mobile breakpoints match source behavior.

## 7.2 Dashboard (`/dashboard`)

### Required composition

- Welcome heading block + user name accent
- KPI row (streak, questions today, accuracy, hours this week)
- Main area split:
  - Topic progress chart/list
  - Quick actions vertical panel

### Keep from existing

- readiness and weakness insights
- roadmap/planner status signals

### Adjustments

- Increase visual density and alignment to screenshot block proportions.
- Move non-critical cards into secondary sections.

## 7.3 Exams (`/exams`) [New]

### Required composition

- Category tabs (All/Engineering/Management/Civil Services/etc)
- Sort dropdown (e.g., Popular)
- Exam cards grid
- Pagination/footer note

### Data strategy

- Start with static mocked exam categories then wire to backend content service.

## 7.4 AI Predictor (`/predictor`) [New]

### Required composition

- Header with year selector and update action
- Insight strip
- Prediction filters
- Predictions table (topic/probability/trend/priority/expected questions/reasoning/action)
- 7+ year repeat topics list

### Data strategy

- Derive initial data from analytics endpoint and roadmap signals.

## 7.5 My Roadmap (`/roadmap`)

### Required composition

- Week cards arranged in compact grid
- Day cells with study/revise controls and completion status
- "Mark week complete" CTA

### Current reuse

- Reuse roadmap data model and day status patch APIs.
- Refactor `RoadmapWeekCard` visual style to screenshot layout.

## 7.6 PYQ Bank (`/pyq`)

### Required composition

- 3-column layout:
  - Left: filter panel
  - Middle: question list
  - Right: question detail with answer reveal and AI explain

### Behavior

- Selecting list item updates detail pane
- "Show Answer" toggles answer explanation panel
- "Add to Mock" sends item into mock session builder

### Current reuse

- Existing filter/paging/question APIs
- Existing practice flow remains optional secondary CTA

## 7.7 Mock Tests (`/mock-tests`) [New + integrate existing quiz logic]

### Setup page

- Start session card with:
  - exam
  - mock type
  - time limit
  - question count
  - year filter
- CTAs: Start Mock Test, Quick Mock
- View History action

### Live session page

- Timer + progress + accuracy header
- Left question navigator grid (1..N)
- Main question panel with options and mark-for-review
- Prev/Next/Submit controls

### Current reuse

- Reuse diagnostic/adaptive submission payload models
- Add session state store for timer/nav/review flags

## 7.8 PDF Upload (`/pdf-upload`) [New]

### Required composition

- Drag-and-drop upload zone with plan limits text
- Upload history list with status badges and question counts
- Actions: Open/Delete per upload

### Data strategy

- Student-facing wrapper around existing upload/question generation backend flow.

## 7.9 AI Assistant (`/chat` with new presentation)

### Required composition

- Top utility actions: New Chat/Regenerate/Settings
- Main chat window with user/AI bubbles
- Suggested prompt chips below

### Current reuse

- Existing session/message endpoints and chat store
- Existing grounding snapshot panel can be folded into contextual assistant metadata UI

## 7.10 Progress (`/progress`) [New]

### Required composition

- KPI strip (mastery ring, streak, daily goal)
- Topic mastery list with % bars
- Streak heatmap
- Performance trend line chart
- Weak areas cards
- AI insight block

### Data strategy

- Reuse dashboard analytics and extend endpoint if necessary.

## 7.11 Settings (`/settings`) [New]

### Required composition

- Notification toggles
- Daily goal minutes field
- Save settings CTA

## 7.12 Profile (`/profile`) [New]

### Required composition

- Editable profile details (email/name/phone/language/timezone/level)
- Onboarding status and joined/last-active metadata
- Save profile CTA

## 7.13 Auth (`/login`)

### Keep

- Existing split-promo + auth card structure

### Adjust

- Align top navigation and page framing with global screenshot shell style
- Ensure same token usage and border style as app pages

## 7.14 Admin (`/admin/*`)

### Recommendation

- Keep admin functional structures
- Restyle admin from slate/indigo to brand token system
- Maintain high-density tables and forms

---

## 8. Design System Refactor Plan

## 8.1 Token Strategy

Single canonical token source in `globals.css`:

- Keep existing variables and normalize naming where duplicated.
- Add spacing/radius/elevation token groups.

## 8.2 Primitive Components to Standardize

Enhance `components/shared/brand-ui.tsx` with:

- `ConsolePanel`
- `KpiStat`
- `MicroLabel`
- `DataPill`
- `SplitPane`
- `TopUtilityBar`
- `SearchInput`

Keep compatibility wrappers for existing components during transition.

## 8.3 Page Template Patterns

Introduce two templates:

1. `StudentWorkspaceTemplate`
2. `AdminWorkspaceTemplate` (same tokens, different nav model)

---

## 9. File-Level Implementation Plan

## 9.1 Foundation

- `frontend/app/globals.css`
  - Normalize token palette and shared utility classes
  - Add shell/grid/noise helpers aligned with landing HTML

- `frontend/components/shared/brand-ui.tsx`
  - Add/adjust primitives for screenshot parity

- `frontend/components/layout/AppShell.tsx`
  - Replace nav model and top bar composition to match screenshot shell

## 9.2 Landing exactness

- `frontend/app/page.tsx`
  - Rebuild section-by-section from HTML source
  - Preserve IDs and interactions

## 9.3 New route scaffolding

Add:

- `frontend/app/(student)/exams/page.tsx`
- `frontend/app/(student)/predictor/page.tsx`
- `frontend/app/(student)/mock-tests/page.tsx`
- `frontend/app/(student)/mock-tests/session/[sessionId]/page.tsx`
- `frontend/app/(student)/pdf-upload/page.tsx`
- `frontend/app/(student)/progress/page.tsx`
- `frontend/app/(student)/settings/page.tsx`
- `frontend/app/(student)/profile/page.tsx`

## 9.4 Existing page restyles

- `frontend/app/(student)/dashboard/page.tsx`
- `frontend/app/(student)/roadmap/page.tsx`
- `frontend/app/(student)/pyq/page.tsx`
- `frontend/app/(student)/chat/page.tsx`
- `frontend/app/(student)/quiz/*` (mapped into mock-test flow)
- `frontend/app/(student)/planner/page.tsx`
- `frontend/app/(student)/revision/page.tsx`

## 9.5 Admin alignment

- `frontend/app/admin/layout.tsx`
- `frontend/components/admin/AdminSidebar.tsx`
- Admin pages under `frontend/app/admin/*`

---

## 10. Phased Delivery Plan

## Phase 0: Baseline and Guardrails

- Capture current screenshots for all routes
- Add visual regression baseline (Playwright screenshot tests)
- Freeze route API contracts

## Phase 1: Design Token and Shell Convergence

- Refactor `globals.css` tokens and shell utilities
- Rebuild student shell nav/topbar to screenshot IA

## Phase 2: Landing Page Exact Match

- Port `smartexamprep-landing-new.html` into `app/page.tsx`
- Verify section parity and responsive behavior

## Phase 3: Student Core Screens

- Dashboard
- Roadmap
- PYQ Bank
- AI Assistant
- Mock Tests (setup + session)

## Phase 4: New Utility Screens

- Exams
- AI Predictor
- PDF Upload
- Progress
- Settings
- Profile

## Phase 5: Admin Visual Convergence

- Keep workflows intact, align visual language

## Phase 6: QA, Accessibility, Performance

- WCAG contrast and keyboard navigation
- responsive QA
- build/perf checks

---

## 11. QA and Acceptance Checklist

## 11.1 Visual

- All pages use same token palette and typography hierarchy
- Sidebar/topbar visually match screenshot style
- Landing page section parity with source HTML

## 11.2 Functional

- Existing API calls and response handling unchanged
- Store persistence behavior unchanged
- No route guard regressions

## 11.3 Responsive

- Desktop (1366+, 1536)
- Laptop (1280)
- Tablet (768-1024)
- Mobile (390-430)

## 11.4 Accessibility

- Visible focus states
- Keyboard reachable controls
- Form labels and ARIA for dynamic controls

---

## 12. Risks and Mitigations

1. Risk: Scope explosion due to many new pages.
   Mitigation: Deliver via phased route-by-route rollout with screenshot signoff per phase.

2. Risk: Theme divergence between admin and student.
   Mitigation: Centralize tokens in `globals.css`; avoid page-local hardcoded palettes.

3. Risk: Regressions in quiz/planner logic during UI rewrite.
   Mitigation: Keep data/store contracts stable; isolate UI layer changes.

4. Risk: Landing page interaction mismatch with HTML source.
   Mitigation: Port interaction behaviors first, then refactor incrementally.

---

## 13. Definition of Done

Redesign is complete when:

1. Landing page is a faithful implementation of `smartexamprep-landing-new.html`.
2. Student shell and all screenshot-target pages are present and visually aligned.
3. Existing and newly added pages share one coherent design system.
4. No critical functional regressions exist in authentication, quiz flow, roadmap/planner, PYQ, chat, or admin workflows.
5. Visual and responsive QA checklist passes.

---

## 14. Recommended Immediate Next Execution Order

1. Rebuild `frontend/app/page.tsx` from the provided HTML (exact parity first).
2. Rework `frontend/components/layout/AppShell.tsx` to screenshot IA.
3. Implement new student routes: exams, predictor, mock-tests, pdf-upload, progress, settings, profile.
4. Restyle existing dashboard/roadmap/pyq/chat pages to the final composition.
5. Unify admin visual language using shared brand primitives.
