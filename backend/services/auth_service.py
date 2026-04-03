from datetime import datetime, timedelta

from jose import jwt
from passlib.exc import UnknownHashError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from models.models import RoleEnum, User
from schemas.auth_schemas import RegisterRequest


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except (UnknownHashError, ValueError):
        return False


def create_user(req: RegisterRequest, db: Session) -> User:
    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        full_name=req.full_name,
        role=RoleEnum.student,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(email: str, password: str, db: Session) -> User | None:
    user = db.query(User).filter(User.email == email, User.is_active.is_(True)).first()
    if not user:
        return None

    if not verify_password(password, user.hashed_password):
        return None

    return user


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
