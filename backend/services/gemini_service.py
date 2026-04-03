from __future__ import annotations

import asyncio
from hashlib import md5
import importlib
import json
import re
from typing import Any

from config import settings


genai: Any | None = None
model: Any | None = None
try:
    genai = importlib.import_module("google.generativeai")
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
except Exception:  # pragma: no cover - optional dependency runtime fallback
    genai = None
    model = None


WEAKNESS_PROMPT = """
You are a GATE CSE exam coach. A student has these statistics for {topic} ({subject}):
- Weakness Score: {weakness_score:.0f}/100 (higher = weaker)
- Accuracy: {accuracy:.1f}%
- Repeated Mistakes: {repeated_mistakes}
- Avg Response Time: {avg_time:.0f} seconds per question

Write a 2–3 sentence personalized insight for the student explaining:
1. Why they are struggling in this topic
2. What specific sub-areas to focus on
3. One actionable next step

Use encouraging, student-friendly language. Be specific.
Do NOT make up statistics not given above.
Output plain text only, no markdown.
""".strip()


SCRAPER_PROMPT = """
You are a GATE CSE question classifier. Given the following raw text scraped from a webpage,
extract the question and return ONLY a valid JSON object with EXACTLY these fields:
{{
  "question_text": "the clean question text",
    "question_image_urls": ["https://example.com/pyq/image-1.png"],
  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
  "correct_answer": "A",
  "explanation": "a detailed step-by-step explanation",
  "subject": "one of: Data Structures, Algorithms, Operating Systems, DBMS, Computer Networks, Theory of Computation, Compiler Design, Digital Logic, Computer Organization, Discrete Mathematics, Aptitude",
  "topic": "the specific topic within the subject",
  "subtopic": "the specific subtopic",
  "difficulty": "easy OR medium OR hard",
  "year": null,
  "source_type": "PYQ OR practice"
}}
Return ONLY the JSON. No explanation, no markdown, no extra text.
Raw text:
{raw_text}
""".strip()


SYLLABUS_PROMPT = """
You are a university syllabus parser for GATE CSE.
Given this text from a syllabus PDF, extract the subject-topic-subtopic structure.
Return ONLY a valid JSON object with this EXACT structure:
{{
  "subjects": [
    {{
      "name": "Subject Name",
      "topics": [
        {{
          "name": "Topic Name",
          "subtopics": ["Subtopic 1", "Subtopic 2", "Subtopic 3"]
        }}
      ]
    }}
  ]
}}
Rules:
- Only include academic subjects (no admin/logistics text)
- Group related items into the nearest subject
- Keep subtopics concise (3–8 words max)
- Return ONLY the JSON, no other text

Syllabus text:
{raw_text}
""".strip()


FALLBACK_EXPLANATIONS = {
    "Weak": (
        "This topic requires immediate attention. Your accuracy is below 40%. "
        "Start from basics: watch a video lecture, then solve 10 easy questions."
    ),
    "Moderate": (
        "You have a moderate understanding but need refinement. "
        "Focus on question patterns you get wrong repeatedly."
    ),
    "Strong": (
        "You're doing well here! Keep it up with occasional practice "
        "to maintain your mastery."
    ),
}


_explanation_cache: dict[str, str] = {}


def _cache_key(user_id: str, topic_id: str, weakness_score: float) -> str:
    bounded_score = max(0.0, min(100.0, weakness_score))
    raw = f"{user_id or 'anon'}:{topic_id or 'topic'}:{int(bounded_score // 5)}"
    return md5(raw.encode("utf-8")).hexdigest()


def _mastery_level_from_score(weakness_score: float) -> str:
    if weakness_score >= 60:
        return "Weak"
    if weakness_score >= 30:
        return "Moderate"
    return "Strong"


def _as_percentage(accuracy: float) -> float:
    if accuracy <= 1.0:
        return accuracy * 100.0
    return accuracy


async def _generate_content_text(prompt: str, generation_config: dict[str, Any]) -> str:
    if model is None:
        raise RuntimeError("Gemini model is unavailable")
    response = await asyncio.to_thread(
        model.generate_content,
        prompt,
        generation_config=generation_config,
    )
    text = getattr(response, "text", "")
    if not isinstance(text, str):
        text = str(text or "")
    return text.strip()


async def generate_weakness_explanation(
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    accuracy: float,
    repeated_mistakes: int,
    avg_response_time_s: float,
    user_id: str,
    topic_id: str,
) -> str:
    cache_key = _cache_key(user_id, topic_id, weakness_score)
    cached = _explanation_cache.get(cache_key)
    if cached:
        return cached

    mastery_level = _mastery_level_from_score(weakness_score)
    fallback_text = FALLBACK_EXPLANATIONS.get(
        mastery_level,
        FALLBACK_EXPLANATIONS["Moderate"],
    )

    if model is None:
        _explanation_cache[cache_key] = fallback_text
        return fallback_text

    prompt = WEAKNESS_PROMPT.format(
        topic=topic_name,
        subject=subject_name,
        weakness_score=weakness_score,
        accuracy=_as_percentage(accuracy),
        repeated_mistakes=repeated_mistakes,
        avg_time=avg_response_time_s,
    )
    try:
        text = await _generate_content_text(
            prompt,
            generation_config={"max_output_tokens": 200, "temperature": 0.3},
        )
        if not text:
            raise ValueError("Gemini returned empty text")
        _explanation_cache[cache_key] = text
        return text
    except Exception:
        _explanation_cache[cache_key] = fallback_text
        return fallback_text


async def _classify_single(raw_text: str) -> dict[str, Any] | None:
    if model is None or not raw_text.strip():
        return None

    prompt = SCRAPER_PROMPT.format(raw_text=raw_text[:1500])
    try:
        response_text = await _generate_content_text(
            prompt,
            generation_config={"max_output_tokens": 500, "temperature": 0.1},
        )
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        return None
    return None


async def classify_questions_with_gemini(raw_texts: list[str]) -> list[dict]:
    results: list[dict] = []
    for raw_text in raw_texts[:20]:
        result = await _classify_single(raw_text)
        if result:
            results.append(result)
        await asyncio.sleep(0.5)
    return results


async def parse_syllabus_with_gemini(raw_text: str) -> dict:
    if model is None:
        return {"subjects": []}

    truncated_text = raw_text[:8000]
    prompt = SYLLABUS_PROMPT.format(raw_text=truncated_text)
    try:
        response_text = await _generate_content_text(
            prompt,
            generation_config={"max_output_tokens": 2000, "temperature": 0.1},
        )
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
            if isinstance(parsed, dict) and isinstance(parsed.get("subjects"), list):
                return parsed
    except Exception:
        pass
    return {"subjects": []}
