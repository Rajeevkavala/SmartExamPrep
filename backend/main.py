from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from config import settings
from database import engine
from ml.nlp_pipeline import load_nlp_models
from models.models import Base
from routers import (
    admin_content,
    admin_questions,
    ai,
    analysis,
    auth,
    content,
    quiz,
    revision,
    scraper,
    syllabus,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Ensure core tables exist for local/dev bootstrapping.
    Base.metadata.create_all(bind=engine)

    # Ensure upload directories exist on startup.
    upload_root = Path(settings.upload_dir)
    (upload_root / "syllabi").mkdir(parents=True, exist_ok=True)

    # Warm NLP singletons once at startup for low-latency first use.
    try:
        load_nlp_models()
    except Exception:
        pass

    yield


def _mock_from_schema(
    schema: dict[str, Any],
    components: dict[str, dict[str, Any]],
    seen: set[str] | None = None,
) -> Any:
    seen = seen or set()

    ref = schema.get("$ref")
    if isinstance(ref, str):
        ref_name = ref.split("/")[-1]
        if ref_name in seen:
            return {}
        resolved = components.get(ref_name, {})
        return _mock_from_schema(resolved, components, seen | {ref_name})

    if "allOf" in schema:
        merged: dict[str, Any] = {}
        for item in schema.get("allOf", []):
            value = _mock_from_schema(item, components, seen)
            if isinstance(value, dict):
                merged.update(value)
        return merged

    if "oneOf" in schema and schema["oneOf"]:
        return _mock_from_schema(schema["oneOf"][0], components, seen)

    if "anyOf" in schema and schema["anyOf"]:
        return _mock_from_schema(schema["anyOf"][0], components, seen)

    if "enum" in schema and schema["enum"]:
        return schema["enum"][0]

    if "const" in schema:
        return schema["const"]

    if "default" in schema:
        return schema["default"]

    schema_type = schema.get("type")
    if not schema_type:
        if "properties" in schema:
            schema_type = "object"
        elif "items" in schema:
            schema_type = "array"

    if schema_type == "object":
        properties = schema.get("properties", {})
        result: dict[str, Any] = {}
        for prop_name, prop_schema in properties.items():
            if isinstance(prop_schema, dict):
                result[prop_name] = _mock_from_schema(prop_schema, components, seen)
        return result

    if schema_type == "array":
        items = schema.get("items", {})
        if isinstance(items, dict):
            return [_mock_from_schema(items, components, seen)]
        return []

    if schema_type == "string":
        fmt = schema.get("format")
        if fmt == "email":
            return "student@example.com"
        if fmt == "uuid":
            return "3f54d88f-6342-421b-b2f8-2755ee9f66c7"
        if fmt == "date-time":
            return "2026-04-02T12:00:00Z"
        if fmt == "date":
            return "2026-04-02"
        if fmt in {"uri", "url"}:
            return "https://example.com"

        min_length = schema.get("minLength")
        if isinstance(min_length, int) and min_length > 0:
            return "x" * min_length
        return "string"

    if schema_type == "integer":
        minimum = schema.get("minimum")
        if isinstance(minimum, (int, float)):
            return int(minimum)
        return 1

    if schema_type == "number":
        minimum = schema.get("minimum")
        if isinstance(minimum, (int, float)):
            return float(minimum)
        return 1.0

    if schema_type == "boolean":
        return True

    return "value"


def _inject_openapi_examples(openapi_schema: dict[str, Any]) -> None:
    components = openapi_schema.get("components", {}).get("schemas", {})

    if isinstance(components, dict):
        for schema in components.values():
            if not isinstance(schema, dict):
                continue
            if "example" in schema or "examples" in schema:
                continue
            schema["example"] = _mock_from_schema(schema, components)

    paths = openapi_schema.get("paths", {})
    if not isinstance(paths, dict):
        return

    for path_item in paths.values():
        if not isinstance(path_item, dict):
            continue

        for method, operation in path_item.items():
            if method not in {
                "get",
                "post",
                "put",
                "patch",
                "delete",
                "options",
                "head",
            }:
                continue
            if not isinstance(operation, dict):
                continue

            request_body = operation.get("requestBody", {})
            if not isinstance(request_body, dict):
                continue

            content = request_body.get("content", {})
            if not isinstance(content, dict):
                continue

            for media_type in content.values():
                if not isinstance(media_type, dict):
                    continue
                if "example" in media_type or "examples" in media_type:
                    continue

                body_schema = media_type.get("schema")
                if isinstance(body_schema, dict):
                    media_type["example"] = _mock_from_schema(body_schema, components)


app = FastAPI(
    title="SmartExamPrep API",
    description="Backend API for SmartExamPrep MVP",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={
        "displayRequestDuration": True,
        "tryItOutEnabled": True,
        "persistAuthorization": True,
    },
)


def custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    _inject_openapi_examples(openapi_schema)
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["System"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(revision.router, prefix="/api/revision", tags=["Revision"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(admin_content.router, prefix="/api/admin/content", tags=["Admin Content"])
app.include_router(admin_questions.router, prefix="/api/admin/questions", tags=["Admin Questions"])
app.include_router(scraper.router, prefix="/api/admin/scraper", tags=["Admin Scraper"])
app.include_router(syllabus.router, prefix="/api/admin/syllabus", tags=["Admin Syllabus"])
