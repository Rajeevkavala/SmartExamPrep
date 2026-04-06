# 18 Future Scope

## What Should Not Be Built Now

These ideas are attractive, but they should stay out of the first upgrade program because they would increase complexity faster than product value.

### 1. Full vector database retrieval stack

Why not now:

- the current codebase does not yet need it
- the chatbot can be grounded effectively from relational data first
- adding embeddings infrastructure before planner/roadmap stabilize would create extra moving parts

### 2. Real-time collaborative study rooms or social features

Why not now:

- there is no collaboration model in the current product
- it does not strengthen the core adaptive-prep workflow yet

### 3. Major auth-system rewrite

Why not now:

- there is a real token/cookie mismatch concern today, but a full auth rewrite would derail feature delivery
- fix only the issues that block rollout, then revisit auth cleanup as a separate hardening stream

### 4. Background job infrastructure for every workflow

Why not now:

- roadmap, planner, and chat can start synchronously
- scraper and syllabus background tasks already exist, even if they are lightweight
- queue infrastructure is valuable later, not mandatory for first delivery

### 5. Per-subtopic mastery and hyper-granular planner tasks

Why not now:

- the current mastery model is topic-based
- moving immediately to subtopic-level planning would create noisy UX and heavier data-maintenance burden

## What Can Be A Later Phase

### Product extensions

- roadmap regeneration triggers after meaningful quiz milestones
- weekly review summaries emailed or surfaced in-app
- admin analytics page for cohort-level student progress
- CSV or PDF export for research/reporting packages
- reminder system for revision and planner tasks

### Content extensions

- richer PYQ metadata such as exam shift, paper code, question source quality score
- concept-note attachments or curated resource links per topic
- admin bulk actions for topic difficulty and syllabus alignment

### Learning extensions

- confidence recalibration prompts after quizzes
- goal-based planner modes like crash course, revision sprint, or weekend-only prep
- topic completion gates before roadmap advancement

## Advanced AI Ideas For Later

### 1. Retrieval-augmented study help

After the first grounded chatbot stabilizes, you can add retrieval over:

- question explanations
- verified PYQ content
- syllabus documents
- curated notes/resources

### 2. Automatic concept decomposition

The chatbot could break a weak topic into:

- prerequisite concepts
- common mistakes
- practice ladder
- revision checkpoints

This should come only after roadmap/planner logic is trusted.

### 3. Adaptive explanation styles

Use user profile and quiz history to vary explanation style:

- beginner simplification
- fast revision bullets
- exam-trick focused explanation

### 4. Study-plan negotiation

Later the chatbot can become a planner copilot that:

- rebalances weekly load
- responds to missed days
- adjusts plan intensity before the exam

That should happen only once the rule-based planner is reliable.

## Scale-Up Ideas

### Backend and data

- move scraper and syllabus jobs to a real queue worker
- add structured request/event logging
- precompute dashboard aggregates for heavy users
- cache roadmap summaries and filter options
- precompute question embeddings instead of generating them on demand

### Frontend

- add server-side prefetching where useful for dashboard or roadmap landing pages
- introduce a student shell layout once roadmap/planner/chat pages all exist
- add richer mobile navigation for the growing student surface

### ML and experimentation

- compare multiple roadmap heuristics on demo users
- run offline evaluation on planner recommendations
- track answer-quality feedback for chatbot responses

## Product And Startup Ideas

These are not implementation priorities now, but they are realistic growth directions once the core upgrade lands.

### B2C growth ideas

- premium AI mentor tier
- exam-specific roadmap packs
- streak and accountability programs
- paid PYQ practice collections or mock-test bundles

### B2B or institutional ideas

- coaching-center dashboard for student cohorts
- educator review workflows for question verification
- institutional syllabus imports and curriculum mapping

### Research and credibility ideas

- exportable improvement reports for demo and investor use
- anonymized analytics dashboards for learning-outcome studies
- benchmark packs comparing diagnostic versus adaptive improvement

## Future Hardening Work

These are not feature ideas, but they are worth planning after the upgrade program:

- resolve the frontend `token` cookie versus backend `access_token` split
- remove `Base.metadata.create_all()` from production startup and rely on migrations cleanly
- decouple `weakness_service.py` from importing the detector instance from `main.py`
- tighten revision completion semantics around schedule-row identity
- improve verified content volume beyond the current sparse base seed

## Recommended Principle For Future Scope

Keep the next wave of work aligned to one rule:

build depth on the current learning loop before adding unrelated breadth

The strongest next-generation SmartExamPrep loop is:

- better profile capture
- better plan generation
- better daily execution
- better feedback and analytics
- better grounded AI help

That loop is already supported by the current codebase direction, so future work should amplify it instead of diluting it.
