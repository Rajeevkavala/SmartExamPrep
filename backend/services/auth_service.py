from datetime import datetime, timedelta

from jose import jwt
from passlib.exc import UnknownHashError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import settings
from models.models import RoleEnum, User
from schemas.auth_schemas import RegisterRequest


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ACCESS_TOKEN_TTL = timedelta(hours=24)


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
    payload["exp"] = datetime.utcnow() + ACCESS_TOKEN_TTL
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def get_access_token_expiry(issued_at: datetime | None = None) -> datetime:
    base = issued_at or datetime.utcnow()
    return base + ACCESS_TOKEN_TTL
