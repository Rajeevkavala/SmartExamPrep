from __future__ import annotations

import json

from ai.types import AIMessage


def build_messages(
    *,
    user_message: str,
    intent: str,
    grounding_context: dict,
    conversation_history: list[dict[str, str]] | None,
) -> list[AIMessage]:
    history_json = json.dumps(conversation_history or [], ensure_ascii=True)
    grounding_json = json.dumps(grounding_context or {}, ensure_ascii=True)
    return [
        AIMessage(
            role="system",
            content=(
                "You are SmartExamPrep's grounded GATE CSE study assistant. "
                "Use only the supplied grounding and recent conversation history. "
                "If the answer is not supported by the grounding, say so clearly and suggest the closest in-app next step. "
                "Never invent roadmap weeks, planner tasks, scores, or topic states. "
                "Return plain text only in 3 to 7 short sentences."
            ),
        ),
        AIMessage(
            role="user",
            content=(
                f"Intent: {intent}\n"
                f"Conversation history JSON:\n{history_json}\n\n"
                f"Grounding context JSON:\n{grounding_json}\n\n"
                f"Student message:\n{user_message.strip()}"
            ),
        ),
    ]
