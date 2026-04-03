from __future__ import annotations

import importlib
import re
from typing import Any, Optional

import numpy as np


_nlp: Optional[Any] = None
_embedder: Optional[Any] = None
_spacy_module: Optional[Any] = None
_spacy_unavailable = False
_sentence_transformer_cls: Optional[Any] = None
_sentence_transformer_unavailable = False


GATE_DOMAIN_TERMS = {
    "process",
    "thread",
    "semaphore",
    "mutex",
    "deadlock",
    "paging",
    "scheduling",
    "cache",
    "tcp",
    "udp",
    "sql",
    "normalization",
    "bfs",
    "dfs",
    "heap",
    "bst",
    "dp",
    "np",
    "automata",
    "grammar",
    "flip-flop",
    "pipeline",
    "interrupt",
    "dma",
    "recursion",
    "pointer",
    "fcfs",
    "sjf",
    "bcnf",
    "3nf",
    "kruskal",
    "dijkstra",
    "lcs",
    "lis",
    "knapsack",
    "turing",
    "pda",
    "dfa",
    "nfa",
    "cfg",
    "risc",
    "cisc",
    "ieee",
    "alu",
}


def load_nlp_models() -> None:
    """
    Load spaCy and sentence-transformer once at startup.
    """
    global _nlp

    spacy_module = _load_spacy_module()
    if _nlp is None and spacy_module is not None:
        try:
            _nlp = spacy_module.load("en_core_web_sm")
        except Exception:
            try:
                _nlp = spacy_module.blank("en")
                if "sentencizer" not in _nlp.pipe_names:
                    _nlp.add_pipe("sentencizer")
            except Exception:
                _nlp = None


def _load_spacy_module() -> Any | None:
    global _spacy_module, _spacy_unavailable
    if _spacy_unavailable:
        return None
    if _spacy_module is not None:
        return _spacy_module
    try:
        _spacy_module = importlib.import_module("spacy")
    except Exception:
        _spacy_unavailable = True
        _spacy_module = None
    return _spacy_module


def _load_embedder() -> Any | None:
    global _embedder, _sentence_transformer_cls, _sentence_transformer_unavailable

    if _embedder is not None:
        return _embedder
    if _sentence_transformer_unavailable:
        return None

    if _sentence_transformer_cls is None:
        try:
            sentence_transformers_module = importlib.import_module("sentence_transformers")
            _sentence_transformer_cls = getattr(
                sentence_transformers_module,
                "SentenceTransformer",
            )
        except Exception:
            _sentence_transformer_unavailable = True
            return None

    try:
        _embedder = _sentence_transformer_cls("all-MiniLM-L6-v2")
    except Exception:
        _sentence_transformer_unavailable = True
        _embedder = None
    return _embedder


def _ensure_nlp() -> Any | None:
    global _nlp
    if _nlp is None:
        load_nlp_models()
    return _nlp


def _fallback_embedding(text: str, dimensions: int = 384) -> list[float]:
    vec = np.zeros(dimensions, dtype=np.float32)
    for token in re.findall(r"[a-zA-Z0-9_]+", text.lower()):
        vec[hash(token) % dimensions] += 1.0
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


def extract_tags(text: str) -> list[str]:
    """
    Extract tags using noun chunks + domain term matching.
    """
    if not text:
        return []

    nlp = _ensure_nlp()
    lower_text = text.lower()
    doc = nlp(lower_text) if nlp is not None else None
    tags: set[str] = set()

    if doc is not None:
        try:
            for chunk in doc.noun_chunks:
                phrase = chunk.text.strip()
                if 2 < len(phrase) < 40:
                    tags.add(phrase)
        except Exception:
            for token in doc:
                if token.is_alpha and 3 <= len(token.text) <= 20:
                    tags.add(token.text)
    else:
        for token in re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,19}", lower_text):
            tags.add(token)

    for term in GATE_DOMAIN_TERMS:
        if term in lower_text:
            tags.add(term)

    return sorted(tags)[:12]


def embed_text(text: str) -> list[float]:
    """
    Return embedding from all-MiniLM-L6-v2.
    Falls back to deterministic hashed embedding when model is unavailable.
    """
    global _embedder
    if _embedder is None:
        _embedder = _load_embedder()

    if _embedder is None:
        return _fallback_embedding(text)

    vector = _embedder.encode(text, convert_to_numpy=True)
    return np.asarray(vector, dtype=np.float32).tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.asarray(a, dtype=np.float32)
    vb = np.asarray(b, dtype=np.float32)
    if va.size == 0 or vb.size == 0 or va.shape != vb.shape:
        return 0.0

    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    if denom <= 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


def is_near_duplicate(
    candidate_emb: list[float],
    existing_embs: list[list[float]],
    threshold: float = 0.85,
) -> bool:
    if not candidate_emb or not existing_embs:
        return False
    return any(cosine_similarity(candidate_emb, emb) >= threshold for emb in existing_embs)


def build_weakness_prompt(
    topic_name: str,
    subject_name: str,
    weakness_score: float,
    accuracy: float,
    repeated_mistakes: int = 0,
    avg_response_time_s: float = 0.0,
    recent_performance_slope: float | None = None,
    difficulty_sensitivity: float | None = None,
) -> str:
    extra_lines: list[str] = []
    if recent_performance_slope is not None:
        extra_lines.append(
            f"- Recent Performance Trend (slope): {recent_performance_slope:.3f}"
        )
    if difficulty_sensitivity is not None:
        extra_lines.append(
            f"- Difficulty Sensitivity (hard-easy error delta): {difficulty_sensitivity:.2f}"
        )

    extras = "\n".join(extra_lines)
    if extras:
        extras = f"\n{extras}"

    return (
        "You are a GATE CSE exam coach. A student has these statistics "
        f"for {topic_name} ({subject_name}):\n"
        f"- Weakness Score: {weakness_score:.0f}/100 (higher = weaker)\n"
        f"- Accuracy: {accuracy * 100:.1f}%\n"
        f"- Repeated Mistakes: {repeated_mistakes} questions answered wrong multiple times\n"
        f"- Average Response Time: {avg_response_time_s:.0f} seconds per question"
        f"{extras}\n\n"
        "Write a 2-3 sentence personalized insight for the student explaining:\n"
        "1. Why they are struggling in this topic\n"
        "2. What specific sub-areas to focus on\n"
        "3. One actionable next step\n\n"
        "Use encouraging, student-friendly language. Be specific. "
        "Do NOT make up statistics not given above. "
        "Output plain text only, no markdown."
    )
