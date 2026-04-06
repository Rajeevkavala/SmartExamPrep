# Research Paper Package

## IEEE-Style Title Ideas

- SmartExamPrep: An Adaptive Exam Preparation Platform for GATE CSE Using Weakness Detection and Performance-Aware Revision
- A Performance-Aware Adaptive Learning System for GATE CSE Preparation
- Topic-Level Weakness Detection and Adaptive Revision Scheduling for Competitive Exam Preparation
- An AI-Assisted Adaptive Preparation Framework for GATE CSE with Learning Analytics

## Abstract

This work presents SmartExamPrep, an adaptive exam preparation platform designed for GATE CSE. The system combines diagnostic assessment, topic-level weakness detection, adaptive quiz recommendation, spaced revision scheduling, and AI-generated weakness explanations to support personalized learning. Unlike static preparation systems, SmartExamPrep updates student state after each attempt and generates measurable indicators such as readiness score, topic recovery, and revision compliance. The platform is implemented using a Next.js frontend, a FastAPI and PostgreSQL backend, Python-based ML modules, and a workload-aware OpenRouter and Groq AI layer for explanation and syllabus/question parsing. The evaluation focuses on whether adaptive practice and revision scheduling lead to measurable improvement over baseline diagnostic performance.

## Novelty Statement

The novelty of SmartExamPrep is not a new foundation model. The novelty is the integration of:

- topic-level weakness scoring from performance features
- adaptive question recommendation driven by weakness and recency
- spaced revision scheduling tied to performance quality
- durable learning analytics for readiness and recovery tracking
- AI-generated weakness explanations grounded in current student performance

## Problem Statement

Most exam preparation platforms provide static practice without a structured feedback loop that identifies weak concepts, prioritizes the next action, and tracks measurable improvement. Students often receive too much content, too little personalization, and no reliable readiness estimate. This work addresses that gap by building a system that converts quiz interaction data into targeted practice and revision decisions.

## Methodology

1. Collect diagnostic quiz performance.
2. Compute topic-level weakness from accuracy, repeated mistakes, response-time behavior, trend, and difficulty sensitivity.
3. Generate adaptive question sets prioritizing weak and stale topics while avoiding recent duplicates.
4. Update revision schedules using a performance-aware spaced repetition policy.
5. Persist result snapshots and learning analytics after each attempt.
6. Collect student feedback on usefulness of diagnosis, recommendation, revision, and UI.

## Architecture Summary

- Frontend: Next.js 14, TypeScript, Tailwind CSS, ShadCN UI
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- ML/NLP: weakness detection, adaptive recommendation, spaced revision, NLP tagging
- AI layer: OpenRouter and Groq for explanation and syllabus/question parsing
- Admin tooling: subject/topic/question CRUD, scraper, syllabus upload

## Research Contribution Points

- A practical adaptive learning architecture for competitive exam preparation
- A topic-level weakness representation derived from multiple performance signals
- A combined practice-plus-revision workflow rather than isolated recommendation only
- A measurable analytics layer that supports readiness and topic recovery reporting

## Evaluation Plan

- Record first diagnostic score as baseline.
- Track adaptive attempts over a fixed usage window.
- Measure topic recovery from before/after comparisons.
- Measure revision compliance from completed schedules.
- Measure readiness change across persisted attempt snapshots.
- Compare objective improvement with user-rated usefulness.

## Metrics To Report

- diagnostic baseline score
- adaptive average score
- adaptive improvement percentage
- readiness score delta
- topic recovery percentage
- revision compliance percentage
- average usefulness ratings from feedback

## Future Research Scope

- larger controlled user study
- comparison with non-adaptive baselines
- richer item-response modeling
- explanation quality evaluation with blinded human raters
- long-term retention analysis beyond short practice windows
