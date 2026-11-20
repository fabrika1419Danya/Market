from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    login: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)


class UserMeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    balance: Decimal
    avatar: str
    rating: Decimal
    reviews_count: int
    is_online: bool
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserMeOut


class SellerShortOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    avatar: str
    rating: Decimal
    reviews_count: int
    is_online: bool
    created_at: datetime


class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    icon: str
    categories: List[str]


class LotCreate(BaseModel):
    game_id: int
    category: str
    title: str = Field(..., min_length=6, max_length=220)
    description: str = Field(..., min_length=10, max_length=4000)
    price: Decimal = Field(..., gt=Decimal("0"))
    stock_count: int = Field(default=1, ge=1)
    auto_delivery_text: Optional[str] = None


class LotPublicOut(BaseModel):
    id: int
    seller_id: int
    game_id: int
    game_name: str
    game_slug: str
    category: str
    title: str
    description: str
    price: Decimal
    stock_count: int
    is_active: bool
    has_auto_delivery: bool
    seller: SellerShortOut


class ReviewCreate(BaseModel):
    order_id: int
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=3, max_length=600)


class ReviewPublicOut(BaseModel):
    id: int
    order_id: int
    author_username: str
    author_avatar: str
    rating: int
    text: str
    created_at: datetime


class PublicProfileOut(BaseModel):
    id: int
    username: str
    avatar: str
    rating: Decimal
    reviews_count: int
    is_online: bool
    created_at: datetime
    active_lots: List[LotPublicOut]
    reviews: List[ReviewPublicOut]


class OrderCreate(BaseModel):
    lot_id: int


class OrderActionRequest(BaseModel):
    action: str = Field(..., pattern=r"^(complete|dispute|refund)$")


class MessageCreate(BaseModel):
    receiver_id: int
    order_id: Optional[int] = None
    text: str = Field(..., min_length=1, max_length=2000)
