import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

import bcrypt
from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from jose import JWTError, jwt
from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session, joinedload

from .database import get_db
from .models import Lot, Review, User
from .schemas import (
    AuthResponse,
    LoginRequest,
    LotPublicOut,
    PublicProfileOut,
    RegisterRequest,
    ReviewPublicOut,
    SellerShortOut,
    UserMeOut,
)

JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production-vps-secret-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 суток
COOKIE_NAME = "access_token"

auth_router = APIRouter(prefix="/api/auth", tags=["Авторизация"])
users_router = APIRouter(prefix="/api/users", tags=["Публичные профили"])


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def create_access_token(user_id: int, username: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


def extract_token(
    authorization: Optional[str] = Header(default=None),
    cookie_token: Optional[str] = Cookie(default=None, alias=COOKIE_NAME),
) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    if cookie_token:
        return cookie_token
    return None


def get_current_user(
    token: Optional[str] = Depends(extract_token),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация",
        )
    user_id = decode_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный JWT-токен",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )
    return user


def _set_jwt_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=os.getenv("HTTPS", "false").lower() == "true",
        path="/",
    )


@auth_router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    email_clean = payload.email.lower().strip()
    username_clean = payload.username.strip()

    existing = (
        db.query(User)
        .filter(or_(User.username == username_clean, User.email == email_clean))
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким именем или email уже существует",
        )

    new_user = User(
        username=username_clean,
        email=email_clean,
        password_hash=hash_password(payload.password),
        balance=Decimal("2500.00"),
        avatar=username_clean[:2].upper(),
        rating=Decimal("5.00"),
        reviews_count=0,
        is_online=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id, new_user.username)
    _set_jwt_cookie(response, token)
    return AuthResponse(access_token=token, user=UserMeOut.model_validate(new_user))


@auth_router.post("/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    login_clean = payload.login.strip()
    user = (
        db.query(User)
        .filter(
            or_(
                User.username == login_clean,
                User.email == login_clean.lower(),
            )
        )
        .first()
    )
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный логин или пароль",
        )

    user.is_online = True
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.username)
    _set_jwt_cookie(response, token)
    return AuthResponse(access_token=token, user=UserMeOut.model_validate(user))


@auth_router.post("/logout")
def logout_user(
    response: Response,
    token: Optional[str] = Depends(extract_token),
    db: Session = Depends(get_db),
):
    if token:
        uid = decode_access_token(token)
        if uid:
            user = db.query(User).filter(User.id == uid).first()
            if user:
                user.is_online = False
                db.commit()
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@auth_router.get("/me", response_model=UserMeOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserMeOut.model_validate(current_user)


@users_router.get("/{username}", response_model=PublicProfileOut)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    profile_user = db.query(User).filter(User.username == username).first()
    if not profile_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Профиль пользователя не найден",
        )

    active_lots = (
        db.query(Lot)
        .options(joinedload(Lot.game))
        .filter(
            and_(
                Lot.seller_id == profile_user.id,
                Lot.is_active.is_(True),
                Lot.stock_count > 0,
            )
        )
        .order_by(desc(Lot.created_at))
        .all()
    )

    reviews_rows = (
        db.query(Review)
        .options(joinedload(Review.author))
        .filter(Review.target_user_id == profile_user.id)
        .order_by(desc(Review.created_at))
        .all()
    )

    seller_short = SellerShortOut.model_validate(profile_user)

    return PublicProfileOut(
        id=profile_user.id,
        username=profile_user.username,
        avatar=profile_user.avatar,
        rating=profile_user.rating,
        reviews_count=profile_user.reviews_count,
        is_online=profile_user.is_online,
        created_at=profile_user.created_at,
        active_lots=[
            LotPublicOut(
                id=lot.id,
                seller_id=lot.seller_id,
                game_id=lot.game_id,
                game_name=lot.game.name,
                game_slug=lot.game.slug,
                category=lot.category,
                title=lot.title,
                description=lot.description,
                price=lot.price,
                stock_count=lot.stock_count,
                is_active=lot.is_active,
                has_auto_delivery=bool(
                    lot.auto_delivery_text and lot.auto_delivery_text.strip()
                ),
                seller=seller_short,
            )
            for lot in active_lots
        ],
        reviews=[
            ReviewPublicOut(
                id=rev.id,
                order_id=rev.order_id,
                author_username=rev.author.username,
                author_avatar=rev.author.avatar,
                rating=rev.rating,
                text=rev.text,
                created_at=rev.created_at,
            )
            for rev in reviews_rows
        ],
    )
