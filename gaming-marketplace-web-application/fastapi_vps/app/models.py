from datetime import datetime, timezone
from decimal import Decimal
import enum
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OrderStatus(str, enum.Enum):
    PAID = "paid"
    COMPLETED = "completed"
    DISPUTED = "disputed"
    REFUNDED = "refunded"


class GameCategory(str, enum.Enum):
    ACCOUNTS = "Аккаунты"
    CURRENCY = "Валюта"
    SERVICES = "Услуги"
    ITEMS = "Предметы"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    avatar: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    rating: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), nullable=False, default=Decimal("5.00")
    )
    reviews_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    lots: Mapped[List["Lot"]] = relationship(
        "Lot", back_populates="seller", cascade="all, delete-orphan"
    )
    orders_bought: Mapped[List["Order"]] = relationship(
        "Order", foreign_keys="Order.buyer_id", back_populates="buyer"
    )
    orders_sold: Mapped[List["Order"]] = relationship(
        "Order", foreign_keys="Order.seller_id", back_populates="seller"
    )
    sent_messages: Mapped[List["Message"]] = relationship(
        "Message", foreign_keys="Message.sender_id", back_populates="sender"
    )
    received_messages: Mapped[List["Message"]] = relationship(
        "Message", foreign_keys="Message.receiver_id", back_populates="receiver"
    )
    reviews_authored: Mapped[List["Review"]] = relationship(
        "Review", foreign_keys="Review.author_id", back_populates="author"
    )
    reviews_received: Mapped[List["Review"]] = relationship(
        "Review", foreign_keys="Review.target_user_id", back_populates="target_user"
    )


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    icon: Mapped[str] = mapped_column(String(255), nullable=False)
    categories: Mapped[list] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: ["Аккаунты", "Валюта", "Услуги", "Предметы"],
    )

    lots: Mapped[List["Lot"]] = relationship(
        "Lot", back_populates="game", cascade="all, delete-orphan"
    )


class Lot(Base):
    __tablename__ = "lots"
    __table_args__ = (
        CheckConstraint("price >= 1", name="ck_lots_positive_price"),
        CheckConstraint("stock_count >= 0", name="ck_lots_non_negative_stock"),
        Index("ix_lots_game_category", "game_id", "category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    seller_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    stock_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_delivery_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    seller: Mapped["User"] = relationship("User", back_populates="lots")
    game: Mapped["Game"] = relationship("Game", back_populates="lots")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="lot")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    buyer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    seller_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    lot_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lots.id"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, native_enum=False),
        nullable=False,
        default=OrderStatus.PAID,
    )
    delivered_data: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    buyer: Mapped["User"] = relationship(
        "User", foreign_keys=[buyer_id], back_populates="orders_bought"
    )
    seller: Mapped["User"] = relationship(
        "User", foreign_keys=[seller_id], back_populates="orders_sold"
    )
    lot: Mapped["Lot"] = relationship("Lot", back_populates="orders")
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="order")
    review: Mapped[Optional["Review"]] = relationship(
        "Review", back_populates="order", uselist=False
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_dialog", "sender_id", "receiver_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sender_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    receiver_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    order_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    sender: Mapped["User"] = relationship(
        "User", foreign_keys=[sender_id], back_populates="sent_messages"
    )
    receiver: Mapped["User"] = relationship(
        "User", foreign_keys=[receiver_id], back_populates="received_messages"
    )
    order: Mapped[Optional["Order"]] = relationship("Order", back_populates="messages")


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_reviews_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    target_user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    order: Mapped["Order"] = relationship("Order", back_populates="review")
    author: Mapped["User"] = relationship(
        "User", foreign_keys=[author_id], back_populates="reviews_authored"
    )
    target_user: Mapped["User"] = relationship(
        "User", foreign_keys=[target_user_id], back_populates="reviews_received"
    )
