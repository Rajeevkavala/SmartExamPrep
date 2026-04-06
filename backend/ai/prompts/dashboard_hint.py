from __future__ import annotations

from ai.types import AIMessage


def build_messages(
    *,
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    roadmap_focus_label: str,
    today_plan_status: str,
) -> list[AIMessage]:
    return [
        AIMessage(
            role="system",
            content=(
                "You are SmartExamPrep's concise study coach. "
                "Return exactly two short plain-text sentences. "
                "Keep the advice practical, specific, and encouraging."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                f"Weak topic: {topic_name} ({subject_name})\n"
                f"Weakness score: {max(0, min(100, int(round(weakness_score))))}/100\n"
                f"Roadmap focus: {roadmap_focus_label or 'Not available'}\n"
                f"Today's planner status: {today_plan_status or 'missing'}\n\n"
                "Tell the student what to do next today. Mention one immediate action for the next study block."
            ),
        ),
    ]
