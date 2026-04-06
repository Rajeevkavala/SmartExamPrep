from __future__ import annotations

import re


_WHITESPACE_RE = re.compile(r"\s+")
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def normalize_plain_text(text: str, *, max_sentences: int | None = None, max_chars: int = 1200) -> str:
    cleaned = text.replace("```", " ").replace("`", " ").strip()
    cleaned = _WHITESPACE_RE.sub(" ", cleaned).strip()
    if max_sentences is not None and cleaned:
        sentences = [item.strip() for item in _SENTENCE_SPLIT_RE.split(cleaned) if item.strip()]
        cleaned = " ".join(sentences[:max_sentences]).strip()
    if len(cleaned) > max_chars:
        cleaned = cleaned[: max_chars - 3].rstrip() + "..."
    return cleaned
