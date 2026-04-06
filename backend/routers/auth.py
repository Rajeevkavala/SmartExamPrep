from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from config import settings
from dependencies import get_current_user, get_db
from models.models import User
from schemas.auth_schemas import (
	LoginRequest,
	RegisterRequest,
	TokenResponse,
	UpdateProfileRequest,
	UserResponse,
)
from services.auth_service import authenticate_user, create_token, create_user
from services.profile_service import serialize_user_profile, update_profile


router = APIRouter()


@router.post(
	"/register",
	response_model=UserResponse,
	status_code=status.HTTP_201_CREATED,
	summary="Register a new student",
	responses={
		400: {
			"description": "Email already registered.",
			"content": {
				"application/json": {
					"example": {"detail": "Email already registered."}
				}
			},
		},
	},
)
def register(
	req: RegisterRequest,
	db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
	existing_user = db.query(User).filter(User.email == req.email).first()
	if existing_user:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered.",
		)

	try:
		user = create_user(req, db)
	except IntegrityError as exc:
		db.rollback()
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered.",
		) from exc

	return serialize_user_profile(user)


@router.post(
	"/login",
	response_model=TokenResponse,
	summary="Authenticate user and return JWT",
	responses={
		401: {
			"description": "Invalid credentials.",
			"content": {
				"application/json": {
					"example": {"detail": "Invalid credentials."}
				}
			},
		},
	},
)
def login(
	req: LoginRequest,
	response: Response,
	db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
	user = authenticate_user(req.email, req.password, db)
	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid credentials.",
		)

	role_value = getattr(user.role, "value", user.role)
	token = create_token({"sub": user.id, "role": role_value})
	response.set_cookie(
		key="access_token",
		value=token,
		httponly=True,
		samesite=settings.cookie_samesite,
		secure=settings.cookie_secure,
		max_age=60 * 60 * 24,
		path="/",
	)
	return TokenResponse(access_token=token, role=role_value)


@router.post(
	"/logout",
	summary="Clear the active auth cookie",
)
def logout(response: Response) -> dict:
	response.delete_cookie(
		key="access_token",
		path="/",
		samesite=settings.cookie_samesite,
		secure=settings.cookie_secure,
	)
	return {"logged_out": True}


@router.get(
	"/me",
	response_model=UserResponse,
	summary="Get current authenticated user",
		description="Requires authentication. In Swagger, call /api/auth/login first; /me will work using the auth cookie automatically, or via Bearer token through Authorize.",
	responses={
		401: {
			"description": "Missing or invalid authentication token.",
			"content": {
				"application/json": {
					"examples": {
						"missing_token": {
							"summary": "No Authorization header",
							"value": {"detail": "Authentication credentials were not provided."},
						},
						"invalid_token": {
							"summary": "Invalid/expired token",
							"value": {"detail": "Token expired or invalid."},
						},
					},
				}
			},
		},
	},
)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserResponse:
	return serialize_user_profile(user)


@router.put(
	"/me",
	response_model=UserResponse,
	summary="Update current authenticated user profile",
	description="Update onboarding preferences such as daily study time and experience level.",
)
def update_me(
	req: UpdateProfileRequest,
	db: Annotated[Session, Depends(get_db)],
	user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
	updated_user = update_profile(db, user, req)
	return serialize_user_profile(updated_user)
