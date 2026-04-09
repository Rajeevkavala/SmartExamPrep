from pydantic import BaseModel, Field


class TopicWeaknessItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    weakness_score: float = Field(example=64.2)
    mastery_level: str = Field(example="Weak")
    accuracy: float = Field(example=0.42)
    total_attempts: int = Field(example=12)
    updated_at: str | None = Field(default=None, example="2026-04-07T14:20:00Z")


class SubjectProgressItem(BaseModel):
    subject_name: str = Field(example="Operating Systems")
    accuracy: float = Field(example=0.58)


class DataFreshnessSummary(BaseModel):
    generated_at: str | None = Field(default=None, example="2026-04-07T14:20:00Z")
    last_activity_at: str | None = Field(default=None, example="2026-04-07T13:45:00Z")
    freshness_label: str = Field(default="Fresh today", example="Fresh today")


class RecentScoreItem(BaseModel):
    score: float = Field(example=72.5)
    date: str = Field(example="2026-04-02T10:30:00")


class PlannerDashboardSummary(BaseModel):
    has_plan: bool = Field(default=False, example=True)
    plan_id: str | None = Field(default=None, example="b43ca713-70ca-45d2-a513-4acf0174fef5")
    status: str = Field(default="missing", example="active")
    total_tasks: int = Field(default=0, example=5)
    completed_tasks: int = Field(default=0, example=2)
    pending_tasks: int = Field(default=0, example=3)
    completion_pct: float = Field(default=0.0, example=40.0)
    total_planned_minutes: int = Field(default=0, example=240)
    total_completed_minutes: int = Field(default=0, example=95)
    roadmap_week_number: int | None = Field(default=None, example=4)
    roadmap_focus_label: str | None = Field(default=None, example="Close weak OS topics")
    has_carry_forward: bool = Field(default=False, example=True)


class RoadmapProgressSummary(BaseModel):
    has_roadmap: bool = Field(default=False, example=True)
    progress_pct: float = Field(default=0.0, example=37.5)
    current_week: int | None = Field(default=None, example=6)
    total_weeks: int = Field(default=0, example=16)
    completed_weeks: int = Field(default=0, example=6)
    planned_minutes_total: int = Field(default=0, example=1920)
    completed_minutes_total: int = Field(default=0, example=720)


class TopicProgressItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    mastery_level: str = Field(example="Moderate")
    weakness_score: float = Field(example=52.1)
    accuracy_pct: float = Field(example=58.0)
    total_attempts: int = Field(example=12)
    planned_minutes: int = Field(default=0, example=120)
    completed_minutes: int = Field(default=0, example=45)


class DashboardQuickActionItem(BaseModel):
    label: str = Field(example="Open Daily Planner")
    href: str = Field(example="/planner")
    description: str = Field(example="Complete today's scheduled study tasks.")
    variant: str = Field(example="primary")


class DashboardResponse(BaseModel):
    readiness_score: float = Field(example=55.8)
    weakest_topics: list[TopicWeaknessItem]
    strongest_topics: list[TopicWeaknessItem]
    subjects_progress: list[SubjectProgressItem]
    recent_scores: list[RecentScoreItem] = []
    todays_quiz_ready: bool = Field(example=True)
    study_streak_days: int = Field(default=0, example=4)
    study_streak_delta_vs_last_week: int = Field(default=0, example=2)
    minutes_studied_today: int = Field(default=0, example=95)
    questions_solved_today: int = Field(default=0, example=18)
    questions_goal_today: int = Field(default=0, example=30)
    accuracy_delta_vs_yesterday: float = Field(default=0.0, example=5.0)
    activity_events_today: int = Field(default=0, example=3)
    questions_solved_total: int = Field(default=0, example=286)
    hours_studied_total: float = Field(default=0.0, example=42.7)
    status_badge_label: str = Field(default="Study plan active", example="Study plan active")
    roadmap_progress: RoadmapProgressSummary | None = None
    roadmap_progress_pct: float = Field(default=0.0, example=37.5)
    roadmap_current_week: int | None = Field(default=None, example=6)
    today_plan_status: str = Field(default="missing", example="active")
    topic_progress: list[TopicProgressItem] = Field(default_factory=list)
    quick_actions: list[DashboardQuickActionItem] = Field(default_factory=list)
    planner_summary: PlannerDashboardSummary | None = None
    nlp_insight: str | None
    freshness: DataFreshnessSummary | None = None
    next_best_action: str | None = Field(default=None, example="Complete your roadmap-linked planner task before taking another adaptive quiz.")
    explainability_summary: str | None = Field(default=None, example="CPU Scheduling is still your weakest topic, and today's planner is aligned to that gap.")

    model_config = {
        "json_schema_extra": {
            "example": {
                "readiness_score": 55.8,
                "weakest_topics": [
                    {
                        "topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a",
                        "topic_name": "CPU Scheduling",
                        "subject_name": "Operating Systems",
                        "weakness_score": 64.2,
                        "mastery_level": "Weak",
                        "accuracy": 0.42,
                        "total_attempts": 12,
                    }
                ],
                "strongest_topics": [
                    {
                        "topic_id": "a1bcf497-a25c-4f90-bf1a-fdd3702a3f0d",
                        "topic_name": "IP Addressing",
                        "subject_name": "Computer Networks",
                        "weakness_score": 21.5,
                        "mastery_level": "Strong",
                        "accuracy": 0.86,
                        "total_attempts": 14,
                    }
                ],
                "subjects_progress": [
                    {"subject_name": "Operating Systems", "accuracy": 0.58}
                ],
                "recent_scores": [
                    {"score": 72.5, "date": "2026-04-02T10:30:00"}
                ],
                "todays_quiz_ready": True,
                "study_streak_days": 4,
                "study_streak_delta_vs_last_week": 2,
                "minutes_studied_today": 95,
                "questions_solved_today": 18,
                "questions_goal_today": 30,
                "accuracy_delta_vs_yesterday": 5.0,
                "activity_events_today": 3,
                "questions_solved_total": 286,
                "hours_studied_total": 42.7,
                "status_badge_label": "Study plan active",
                "roadmap_progress": {
                    "has_roadmap": True,
                    "progress_pct": 37.5,
                    "current_week": 6,
                    "total_weeks": 16,
                    "completed_weeks": 6,
                    "planned_minutes_total": 1920,
                    "completed_minutes_total": 720,
                },
                "roadmap_progress_pct": 37.5,
                "roadmap_current_week": 6,
                "today_plan_status": "active",
                "topic_progress": [
                    {
                        "topic_id": "d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a",
                        "topic_name": "CPU Scheduling",
                        "subject_name": "Operating Systems",
                        "mastery_level": "Moderate",
                        "weakness_score": 52.1,
                        "accuracy_pct": 58.0,
                        "total_attempts": 12,
                        "planned_minutes": 120,
                        "completed_minutes": 45,
                    }
                ],
                "quick_actions": [
                    {
                        "label": "Open Daily Planner",
                        "href": "/planner",
                        "description": "Complete today's scheduled study tasks.",
                        "variant": "primary",
                    }
                ],
                "planner_summary": {
                    "has_plan": True,
                    "plan_id": "b43ca713-70ca-45d2-a513-4acf0174fef5",
                    "status": "active",
                    "total_tasks": 5,
                    "completed_tasks": 2,
                    "pending_tasks": 3,
                    "completion_pct": 40.0,
                    "total_planned_minutes": 240,
                    "total_completed_minutes": 95,
                    "roadmap_week_number": 4,
                    "roadmap_focus_label": "Close weak OS topics",
                    "has_carry_forward": True,
                },
                "nlp_insight": None,
            }
        }
    }


class AnalyticsTopicItem(BaseModel):
    topic_id: str = Field(example="d14f73f6-0071-4b2e-8ea0-aa8f64b9b43a")
    topic_name: str = Field(example="CPU Scheduling")
    subject_name: str = Field(example="Operating Systems")
    accuracy: float = Field(example=0.42)
    weakness_score: float = Field(example=64.2)


class ReadinessTrendPoint(BaseModel):
    label: str = Field(example="Attempt 1")
    readiness_score: float = Field(example=41.8)
    quiz_type: str = Field(example="diagnostic")
    recorded_at: str = Field(example="2026-04-04T12:30:00")


class ActivityHeatmapCell(BaseModel):
    date: str = Field(example="2026-04-05")
    minutes: int = Field(example=45)
    questions_solved: int = Field(example=12)
    intensity: float = Field(example=0.75)


class AnalyticsOverviewResponse(BaseModel):
    total_quizzes_attempted: int = Field(example=12)
    total_questions_solved: int = Field(example=126)
    average_accuracy_pct: float = Field(example=58.4)
    strongest_topic: AnalyticsTopicItem | None = None
    weakest_topic: AnalyticsTopicItem | None = None
    readiness_score_current: float = Field(example=55.8)
    readiness_score_delta_pct: float = Field(example=10.8)
    readiness_score_trend: list[ReadinessTrendPoint] = []
    revision_completion_rate_pct: float = Field(example=71.4)
    topic_recovery_pct: float = Field(example=44.4)
    diagnostic_baseline_score_pct: float | None = Field(default=None, example=36.0)
    adaptive_average_score_pct: float | None = Field(default=None, example=61.2)
    adaptive_improvement_pct: float | None = Field(default=None, example=25.2)
    study_streak_days: int = Field(default=0, example=4)
    longest_streak_days: int = Field(default=0, example=9)
    hours_studied_total: float = Field(default=0.0, example=42.7)
    daily_goal_minutes: int = Field(default=60, example=90)
    activity_heatmap: list[ActivityHeatmapCell] = []
    ai_insight: str | None = Field(default=None, example="Your strongest recovery pattern is on Operating Systems. Keep one timed OS set tomorrow.")
    roadmap_progress_pct: float = Field(default=0.0, example=37.5)
    planner_completion_pct_today: float = Field(default=0.0, example=40.0)
    freshness: DataFreshnessSummary | None = None
    recommended_next_step: str | None = Field(default=None, example="Carry your unfinished planner task into today's first study block.")
    strongest_recovery_signal: str | None = Field(default=None, example="Your adaptive scores are improving faster than your revision completion rate.")
