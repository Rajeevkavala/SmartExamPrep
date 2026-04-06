from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from dependencies import get_db, require_student
from models.models import User
from schemas.planner_schemas import (
    CarryForwardRequest,
    DailyPlanResponse,
    GenerateTodayPlanRequest,
    PlannerStatusResponse,
    UpdatePlannerTaskRequest,
)
from services.planner_service import (
    carry_forward_tasks,
    generate_today_plan,
    get_today_plan,
    update_task_status,
)


router = APIRouter()


@router.get(
    "/today",
    response_model=DailyPlanResponse,
    summary="Get today's study planner",
)
def today_plan(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return get_today_plan(user_id=str(user.id), db=db, auto_generate=True)


@router.post(
    "/generate-today",
    response_model=DailyPlanResponse,
    summary="Generate or regenerate today's study planner",
)
def generate_plan(
    request: GenerateTodayPlanRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    return generate_today_plan(user_id=str(user.id), request=request, db=db)


@router.patch(
    "/tasks/{task_id}",
    response_model=PlannerStatusResponse,
    summary="Update status of a planner task",
)
def update_task(
    task_id: str,
    request: UpdatePlannerTaskRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    plan = update_task_status(
        user_id=str(user.id),
        task_id=task_id,
        status_value=request.status,
        db=db,
    )
    return {"success": True, "plan": plan}


@router.post(
    "/carry-forward",
    response_model=PlannerStatusResponse,
    summary="Carry unfinished tasks into today's planner",
)
def carry_forward(
    request: CarryForwardRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_student)],
) -> dict:
    plan = carry_forward_tasks(
        user_id=str(user.id),
        from_date=request.from_date,
        db=db,
    )
    return {"success": True, "plan": plan}
