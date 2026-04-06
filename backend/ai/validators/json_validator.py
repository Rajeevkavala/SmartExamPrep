from __future__ import annotations

import json
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from ai.types import AIResponseValidationError


T = TypeVar("T", bound=BaseModel)


def build_response_schema(model_class: type[BaseModel]) -> dict[str, Any]:
    raw_schema = model_class.model_json_schema()
    return _close_object_schemas(raw_schema)


def parse_and_validate_json(content: str, model_class: type[T]) -> T:
    if not content.strip():
        raise AIResponseValidationError("Empty structured response")

    candidates = [_strip_code_fences(content), _extract_first_json_value(content)]
    last_error: Exception | None = None

    for candidate in candidates:
        if not candidate:
            continue
        try:
            data = json.loads(candidate)
            return model_class.model_validate(data)
        except (json.JSONDecodeError, ValidationError) as exc:
            last_error = exc

    preview = " ".join(content.strip().split())[:220]
    raise AIResponseValidationError(
        "Structured response validation failed: "
        f"{last_error}; content_preview={preview!r}"
    )


def _close_object_schemas(node: Any) -> Any:
    if isinstance(node, dict):
        if node.get("type") == "object":
            node.setdefault("additionalProperties", False)
            properties = node.get("properties")
            if isinstance(properties, dict):
                node["required"] = sorted(properties.keys())
                for child in properties.values():
                    _close_object_schemas(child)

        items = node.get("items")
        if items is not None:
            _close_object_schemas(items)

        for key in ("$defs", "definitions"):
            nested = node.get(key)
            if isinstance(nested, dict):
                for child in nested.values():
                    _close_object_schemas(child)

        for key in ("anyOf", "oneOf", "allOf", "prefixItems"):
            nested = node.get(key)
            if isinstance(nested, list):
                for child in nested:
                    _close_object_schemas(child)

    elif isinstance(node, list):
        for child in node:
            _close_object_schemas(child)

    return node


def _strip_code_fences(content: str) -> str:
    text = content.strip()
    if text.startswith("```") and text.endswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return text


def _extract_first_json_value(content: str) -> str:
    text = _strip_code_fences(content)
    for opening, closing in (("{", "}"), ("[", "]")):
        start = text.find(opening)
        if start < 0:
            continue
        depth = 0
        in_string = False
        escape = False
        for index in range(start, len(text)):
            char = text[index]
            if in_string:
                if escape:
                    escape = False
                    continue
                if char == "\\":
                    escape = True
                    continue
                if char == "\"":
                    in_string = False
                continue

            if char == "\"":
                in_string = True
                continue
            if char == opening:
                depth += 1
            elif char == closing:
                depth -= 1
                if depth == 0:
                    return text[start : index + 1]
    return ""
