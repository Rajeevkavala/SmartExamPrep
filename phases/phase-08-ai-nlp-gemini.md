# PHASE 8 â€” AI / NLP / GEMINI INTEGRATION

> **Goal:** Detail the complete AI/NLP integration â€” where each model is used, full AI prompt designs, fallback strategies, and caching â€” covering both student-facing and admin-facing AI use cases.

---

## 1. Where AI/NLP is Used (Full Map)

| Feature | Technology | Triggered When |
|---|---|---|
| Question keyword tagging | spaCy | On question insert (admin or seed) |
| Deduplication in recommendations | sentence-transformers | `GET /api/quiz/adaptive` |
| Weakness explanation | AI 1.5 Flash | `POST /api/ai/explain` |
| Scrape classification | AI 1.5 Flash | Background scrape job |
| Syllabus parsing | AI 1.5 Flash | PDF upload background task |
| Study advice generation | AI 1.5 Flash | `GET /api/analysis/dashboard` (optional) |

---

## 2. NLP: Question Tagging Pipeline

### When it runs:
- When admin manually creates a question (`POST /api/admin/questions/`)
- When admin imports scraped questions (after AI classification)
- On seed data insert (`seed.py`)

### Flow:
```
question_text
    â”‚
    â–¼
spaCy parse â†’ noun chunks + domain term match
    â”‚
    â–¼
tags: ["round robin", "CPU scheduling", "preemptive", "burst time"]
    â”‚
    â–¼
stored in Question.nlp_keyword_tags (JSON array)
```

### Code Reference:
See `backend/ml/nlp_pipeline.py â†’ extract_tags()`

---

## 3. NLP: Semantic Deduplication in Recommendations

### When it runs:
- Every time `GET /api/quiz/adaptive` is called

### Flow:
```
Candidate question pool
    â”‚
    â–¼
For each candidate q:
    embedding = embed_text(q.question_text)  # sentence-transformer
    â”‚
    â–¼
    Compare against recent 7-day question embeddings
    cosine_similarity(candidate_emb, recent_emb)
    â”‚
    â–¼
    If any similarity >= 0.85 threshold â†’ SKIP (near-duplicate)
    Else â†’ include in recommended set
```

### Code (`backend/services/recommendation_service.py`):

```python
from ml.nlp_pipeline import embed_text, is_near_duplicate
from ml.adaptive_recommender import AdaptiveRecommender
from models.models import TopicMastery, Question, QuizAttempt
from datetime import datetime, timedelta

recommender = AdaptiveRecommender()

def get_adaptive_questions(user, db) -> list[dict]:
    # Get topic masteries
    masteries = db.query(TopicMastery).filter_by(user_id=user.id).all()
    topic_mastery_data = [
        {
            "topic_id": m.topic_id,
            "topic_name": m.topic.name,
            "weakness_score": m.weakness_score,
            "last_attempted_at": m.last_attempted_at
        } for m in masteries
    ]

    # Get recent 7-day question embeddings (from QuizAttempt answers)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.started_at >= week_ago)
        .all()
    )
    recent_q_ids = {ans["question_id"] for a in recent_attempts for ans in a.answers}

    # Get candidate questions (verified, not in recent)
    candidates = (
        db.query(Question)
        .filter(
            Question.is_verified == True,
            ~Question.id.in_(recent_q_ids)
        )
        .limit(200)
        .all()
    )

    # Build candidate dicts with embeddings
    candidate_dicts = []
    for q in candidates:
        embedding = embed_text(q.question_text)
        candidate_dicts.append({
            "id": q.id,
            "topic_id": q.topic_id,
            "difficulty": q.difficulty,
            "question_text": q.question_text,
            "options": q.options,
            "correct_answer": q.correct_answer,
            "embedding": embedding
        })

    # Get embeddings of recent questions for dedup
    recent_q_objects = db.query(Question).filter(Question.id.in_(recent_q_ids)).all()
    recent_embeddings = [embed_text(q.question_text) for q in recent_q_objects]

    recommendations = recommender.recommend(
        topic_masteries=topic_mastery_data,
        recent_question_embeddings=recent_embeddings,
        candidate_questions=candidate_dicts,
        daily_study_minutes=user.daily_study_minutes
    )

    return recommendations
```

---

## 4. AI: Weakness Explanation

### Prompt Design (safe, structured):

```python
WEAKNESS_PROMPT = """
You are a GATE CSE exam coach. A student has these statistics for {topic} ({subject}):
- Weakness Score: {weakness_score:.0f}/100 (higher = weaker)
- Accuracy: {accuracy:.1f}%
- Repeated Mistakes: {repeated_mistakes}
- Avg Response Time: {avg_time:.0f} seconds per question

Write a 2â€“3 sentence personalized insight for the student explaining:
1. Why they are struggling in this topic
2. What specific sub-areas to focus on
3. One actionable next step

Use encouraging, student-friendly language. Be specific.
Do NOT make up statistics not given above.
Output plain text only, no markdown.
""".strip()
```

### Safety design:
- Only uses data explicitly passed in (no DB queries in prompt)
- Limits response length: AI `max_output_tokens=200`
- Fallback: returns a pre-written template if AI call fails

### Caching (in-memory, per user per topic):

```python
# backend/services/ai_service.py

from functools import lru_cache
import hashlib

_explanation_cache: dict[str, str] = {}

def _cache_key(user_id: str, topic_id: str, weakness_score: float) -> str:
    raw = f"{user_id}:{topic_id}:{int(weakness_score // 5)}"  # cache by 5-point bracket
    return hashlib.md5(raw.encode()).hexdigest()

async def generate_weakness_explanation(
    topic_name: str, subject_name: str, weakness_score: float,
    accuracy: float, repeated_mistakes: int, avg_response_time_s: float,
    user_id: str = "", topic_id: str = ""
) -> str:
    cache_key = _cache_key(user_id, topic_id, weakness_score)
    if cache_key in _explanation_cache:
        return _explanation_cache[cache_key]

    prompt = WEAKNESS_PROMPT.format(
        topic=topic_name, subject=subject_name,
        weakness_score=weakness_score, accuracy=accuracy * 100,
        repeated_mistakes=repeated_mistakes, avg_time=avg_response_time_s
    )
    try:
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 200, "temperature": 0.3}
        )
        text = response.text.strip()
        _explanation_cache[cache_key] = text
        return text
    except Exception as e:
        return (
            f"You need more practice in {topic_name}. Focus on the foundational "
            f"concepts before attempting harder questions. Your accuracy is "
            f"{accuracy * 100:.0f}% â€” aim for 70%+ through consistent practice."
        )
```

---

## 5. AI: Scraper Question Classification

### Prompt Design:

```python
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
```

### Batch processing (to avoid API quota):

```python
async def classify_scraped_questions(raw_texts: list[str]) -> list[dict]:
    """Classify up to 20 questions, with 1 API call per question."""
    import asyncio
    results = []
    for raw in raw_texts[:20]:  # Hard cap at 20 per job
        result = await _classify_single(raw)
        if result:
            results.append(result)
        await asyncio.sleep(0.5)  # Rate limiting
    return results

async def _classify_single(raw_text: str) -> dict | None:
    import re, json
    prompt = SCRAPER_PROMPT.format(raw_text=raw_text[:1500])
    try:
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 500, "temperature": 0.1}
        )
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception:
        return None
```

---

## 6. AI: Syllabus PDF Parsing

### Prompt Design:

```python
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
- Keep subtopics concise (3â€“8 words max)
- Return ONLY the JSON, no other text

Syllabus text:
{raw_text}
""".strip()
```

### Chunked processing (for long PDFs):

```python
async def parse_syllabus(raw_text: str) -> dict:
    """
    Handles long PDFs by chunking if needed.
    AI 1.5 Flash context window: 1M tokens, so usually one shot.
    """
    # Trim to avoid token overruns (safety margin)
    truncated_text = raw_text[:8000]
    prompt = SYLLABUS_PROMPT.format(raw_text=truncated_text)
    try:
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 2000, "temperature": 0.1}
        )
        match = re.search(r'\{.*\}', response.text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        pass
    # Fallback: empty structure
    return {"subjects": []}
```

---

## 7. Fallback Templates (when AI is unavailable)

```python
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
    )
}

def get_fallback(mastery_level: str) -> str:
    return FALLBACK_EXPLANATIONS.get(mastery_level, FALLBACK_EXPLANATIONS["Moderate"])
```

---

## 8. `backend/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost/smartexamprep"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    OPENROUTER_API_KEY / GROQ_API_KEY: str = ""
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"

settings = Settings()
```

### `.env.example`

```env
DATABASE_URL=postgresql://postgres:password@localhost/smartexamprep
JWT_SECRET=your-super-secret-key-here
OPENROUTER_API_KEY / GROQ_API_KEY=your-openrouter-or-groq-api-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 9. Total AI/NLP Cost Estimation (MVP)

| Operation | Model | Avg tokens | Cost |
|---|---|---|---|
| Weakness explanation | AI Flash | ~300 in + 200 out | ~$0.0001 per call |
| Scrape classification (per Q) | AI Flash | ~400 in + 300 out | ~$0.0002 per Q |
| Syllabus parsing | AI Flash | ~2000 in + 1000 out | ~$0.001 per PDF |
| NLP tagging (spaCy) | Local | 0 | Free |
| Embeddings (sentence-transformer) | Local | 0 | Free |

> AI 1.5 Flash pricing (as of 2024): ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens. For MVP scale, total AI cost is < $1/month.

---

## 10. PYQ Image Support Addendum

- Extend AI scraper prompt output schema with `question_image_urls: []`.
- During scraping, include nearby image URLs with each raw question before classification.
- If OCR/caption text is available, include it in prompts to improve topic/difficulty classification.
- Ensure explanation generation can reference "diagram/image-based" context when present.


