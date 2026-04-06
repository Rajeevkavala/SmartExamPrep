from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.study_chat_schemas import (
    ChatMessageRequest,
    ChatSessionListResponse,
    ChatSessionResponse,
    CreateChatSessionRequest,
    SendChatMessageResponse,
)
from services.study_chat_service import (
    create_chat_session,
    get_chat_session,
    list_chat_sessions,
    send_chat_message,
)


router = APIRouter()


@router.get(
    "/sessions",
    response_model=ChatSessionListResponse,
    summary="List study chat sessions for the current student",
)
def sessions(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return list_chat_sessions(user_id=str(user.id), db=db)


@router.post(
    "/sessions",
    response_model=ChatSessionResponse,
    summary="Create a new study chat session",
)
def create_session(
    request: CreateChatSessionRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return create_chat_session(user_id=str(user.id), request=request, db=db)


@router.get(
    "/sessions/{session_id}",
    response_model=ChatSessionResponse,
    summary="Get a study chat session with messages",
)
def get_session(
    session_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return get_chat_session(user_id=str(user.id), session_id=session_id, db=db)


@router.post(
    "/sessions/{session_id}/messages",
    response_model=SendChatMessageResponse,
    summary="Send a chat message and get a grounded assistant reply",
)
async def send_message(
    session_id: str,
    request: ChatMessageRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return await send_chat_message(
        user_id=str(user.id),
        session_id=session_id,
        message_text=request.message,
        db=db,
    )
