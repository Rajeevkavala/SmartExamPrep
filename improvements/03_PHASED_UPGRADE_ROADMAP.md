# Phased Upgrade Roadmap

## Recommended Implementation Order

The safest order is:

1. enrich learner profile inputs
2. persist roadmap structures
3. generate daily plans from roadmap + revision
4. surface new progress metrics on the dashboard
5. add a student-facing PYQ exploration path
6. add a grounded chatbot after roadmap/planner context exists

That order minimizes rework because every later feature depends on richer state created by the earlier phases.

## Phase Overview

| Phase | Goal | Features Covered | Dependencies | Risk | Complexity |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | Upgrade learner profile foundations | Smart Onboarding 2.0, planning inputs | Existing auth/profile/content flows | Medium | Medium |
| Phase 2 | Add persistent roadmap generation | 52-week/month/week roadmap | Phase 1 inputs, current mastery/syllabus graph | Medium | High |
| Phase 3 | Add operational daily planning | Daily Study Planner, carry-forward, activity logging | Active roadmap, revision schedules | High | High |
| Phase 4 | Lift analytics and dashboard | Enhanced Dashboard, topic/roadmap progress, today summary | Planner/activity data | Medium | Medium/High |
| Phase 5 | Open the PYQ practice surface | PYQ Browser and practice mode | Existing question bank, quiz pipeline | Medium | Medium |
| Phase 6 | Add grounded conversational support | AI Study Chatbot | Roadmap + planner + mastery + PYQ context | High | High |

## Phase 1: Smart Onboarding 2.0 Foundation

### Goal

Turn the current two-field onboarding step into a real learner profile that can drive planning.

### Scope

- add exam target date
- capture subject-wise confidence
- capture known topics
- keep reusing `daily_study_minutes` and `experience_level`
- persist onboarding completeness/version

### Why it comes first

Roadmap quality depends on knowing the studentâ€™s time horizon and self-reported starting point. Without that, roadmap generation becomes guesswork.

## Phase 2: Roadmap Generator

### Goal

Generate and persist a roadmap that translates syllabus coverage, learner profile, and current weaknesses into a long-range plan.

### Scope

- active roadmap record per user
- 52-week roadmap generation
- month grouping and week entries
- adaptive topic sequencing
- roadmap API and first student roadmap page

### Why it comes second

The daily planner and enhanced dashboard both need a persistent plan source. The roadmap becomes the backbone for those later layers.

## Phase 3: Daily Planner

### Goal

Turn roadmap intent into day-level executable tasks, while combining:

- roadmap focus topics
- due revision items
- practice targets
- carry-forward from unfinished work

### Scope

- daily plan generation
- daily tasks with completion state
- carry-forward logic
- planner APIs and planner page
- activity logging for future dashboard metrics

### Why it comes third

This is the first phase that needs persistent â€œtask stateâ€, so it should only begin after roadmap persistence exists.

## Phase 4: Enhanced Dashboard

### Goal

Use the new roadmap and planner data to make the dashboard operational, not just diagnostic.

### Scope

- study streak
- questions solved
- average accuracy
- hours studied
- roadmap progress
- topic progress
- todayâ€™s plan summary
- stronger quick actions

### Why it comes fourth

Most requested dashboard KPIs are downstream metrics. Building them earlier would force duplicate temporary logic.

## Phase 5: PYQ Browser

### Goal

Expose the existing PYQ-tagged question bank to students through a structured browse and practice surface.

### Scope

- student PYQ filtering API
- browse UI
- practice mode using current quiz components
- results tracked via current quiz analytics pipeline

### Why it comes fifth

This feature is more self-contained and does not need to block roadmap/planner/dashboard progress.

## Phase 6: AI Study Chatbot

### Goal

Add grounded conversational guidance that can answer:

- concept doubts
- roadmap questions
- planner questions
- weak-topic study advice
- PYQ prep guidance

### Scope

- chat session/message persistence
- grounded context builder
- AI prompt templates and fallback behavior
- chat UI

### Why it comes last

The chatbot becomes dramatically more useful once roadmap, planner, and PYQ surfaces already exist. Otherwise it can only give generic advice.

## Dependency Graph

```text
Phase 1 (onboarding/profile)
  -> Phase 2 (roadmap)
  -> Phase 3 (planner)
  -> Phase 4 (dashboard enhancement)

Existing question bank + quiz pipeline
  -> Phase 5 (PYQ browser)

Phase 2 + Phase 3 + Phase 5
  -> Phase 6 (chatbot grounding)
```

## Safest Engineering Sequence Inside The Repo

### Backend-first sequence

1. additive schema migrations
2. model updates
3. schema DTO updates
4. service logic
5. router contracts
6. backend tests

### Frontend sequence

1. extend stores/types
2. add new APIs
3. create new components
4. upgrade pages
5. update route protection
6. add/update Playwright coverage

## Rollout Guidance

### Deployable checkpoints

- After Phase 1: onboarding becomes richer, but existing quiz/revision/dashboard still work.
- After Phase 2: roadmap page is additive; no existing student workflow must change yet.
- After Phase 3: planner becomes the operational entry point for study.
- After Phase 4: dashboard can pivot to the richer summary surface.
- After Phase 5: PYQ adds a new practice surface without disturbing adaptive flow.
- After Phase 6: chatbot becomes a guided layer over already-stable product state.

### What not to do

- Do not combine roadmap, planner, and chatbot into one migration wave.
- Do not refactor quiz submission heavily during Phase 1.
- Do not move the whole frontend to a new app-shell architecture before the new student pages exist.

## Practical Complexity Notes

### Highest-complexity areas

- planner carry-forward semantics
- dashboard activity aggregation
- chatbot grounding and fallback behavior

### Highest-regression-risk areas

- auth/profile shape changes
- quiz submission contract changes
- revision completion semantics
- dashboard state shape changes

### Lowest-risk/high-value additions

- onboarding profile tables
- roadmap persistence tables
- PYQ filter APIs backed by existing question fields

