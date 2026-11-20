from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.orm import Session, joinedload

from .auth import (
    auth_router,
    decode_access_token,
    get_current_user,
    hash_password,
    users_router,
)
from .database import Base, SessionLocal, engine, get_db
from .models import Game, Lot, Message, Order, OrderStatus, Review, User
from .schemas import (
    GameOut,
    LotCreate,
    LotPublicOut,
    MessageCreate,
    OrderActionRequest,
    OrderCreate,
    ReviewCreate,
    SellerShortOut,
)
from .ws_manager import ws_manager


def seed_initial_data() -> None:
    db = SessionLocal()
    try:
        if db.query(Game).count() > 0:
            return
        pwd = hash_password("demo12345")
        seller = User(
            username="vortex_boost",
            email="vortex@payloot.ru",
            password_hash=pwd,
            balance=Decimal("48900.00"),
            avatar="VB",
            rating=Decimal("5.00"),
            reviews_count=1,
            is_online=True,
        )
        buyer = User(
            username="alex_trader",
            email="alex@payloot.ru",
            password_hash=pwd,
            balance=Decimal("15400.00"),
            avatar="AT",
            rating=Decimal("5.00"),
            reviews_count=0,
            is_online=True,
        )
        db.add_all([seller, buyer])
        db.flush()

        cs2 = Game(
            name="Counter-Strike 2",
            slug="counter-strike-2",
            icon="CS2",
            categories=["Аккаунты", "Валюта", "Услуги", "Предметы"],
        )
        wow = Game(
            name="World of Warcraft",
            slug="world-of-warcraft",
            icon="WoW",
            categories=["Аккаунты", "Валюта", "Услуги", "Предметы"],
        )
        db.add_all([cs2, wow])
        db.flush()

        lot1 = Lot(
            seller_id=seller.id,
            game_id=cs2.id,
            category="Аккаунты",
            title="CS2 Prime • 18 500 Premier Elo • Родная почта + Автовыдача",
            description="Чистый личный аккаунт с родной почтой Firstmail и зелёным траст-фактором.",
            price=Decimal("2490.00"),
            stock_count=4,
            is_active=True,
            auto_delivery_text="STEAM: cs2_prime_94 | PASS: K9#mP2vL8 | MAIL: cs2_prime_94@firstmail.ltd",
        )
        lot2 = Lot(
            seller_id=seller.id,
            game_id=wow.id,
            category="Валюта",
            title="500 000 Золота WoW EU Гордунни — доставка за 5 минут",
            description="Ручной фарм гильдии, передача через обмен или гильдбанк.",
            price=Decimal("1850.00"),
            stock_count=20,
            is_active=True,
        )
        db.add_all([lot1, lot2])
        db.flush()

        completed_order = Order(
            buyer_id=buyer.id,
            seller_id=seller.id,
            lot_id=lot1.id,
            amount=Decimal("2490.00"),
            status=OrderStatus.COMPLETED,
            delivered_data=lot1.auto_delivery_text,
        )
        db.add(completed_order)
        db.flush()

        db.add(
            Review(
                order_id=completed_order.id,
                author_id=buyer.id,
                target_user_id=seller.id,
                rating=5,
                text="Моментальная автовыдача, данные подошли с первой секунды!",
            )
        )
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_initial_data()
    yield


app = FastAPI(
    title="PayLoot — Биржа игровых ценностей",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)


@app.get("/api/games", response_model=list[GameOut])
def list_games(db: Session = Depends(get_db)):
    return db.query(Game).order_by(Game.name).all()


@app.get("/api/lots", response_model=list[LotPublicOut])
def list_lots(
    game_slug: Optional[str] = None,
    category: Optional[str] = None,
    online_only: bool = False,
    db: Session = Depends(get_db),
):
    query = (
        db.query(Lot)
        .options(joinedload(Lot.seller), joinedload(Lot.game))
        .filter(Lot.is_active.is_(True), Lot.stock_count > 0)
    )
    if game_slug:
        query = query.join(Lot.game).filter(Game.slug == game_slug)
    if category:
        query = query.filter(Lot.category == category)
    if online_only:
        query = query.join(Lot.seller).filter(User.is_online.is_(True))

    rows = query.order_by(desc(Lot.created_at)).all()
    return [
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
            seller=SellerShortOut.model_validate(lot.seller),
        )
        for lot in rows
    ]


@app.post("/api/lots", response_model=LotPublicOut)
def create_lot(
    payload: LotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    game = db.query(Game).filter(Game.id == payload.game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Игра не найдена")

    lot = Lot(
        seller_id=current_user.id,
        game_id=game.id,
        category=payload.category,
        title=payload.title.strip(),
        description=payload.description.strip(),
        price=payload.price,
        stock_count=payload.stock_count,
        is_active=True,
        auto_delivery_text=(payload.auto_delivery_text or "").strip() or None,
    )
    db.add(lot)
    db.commit()
    db.refresh(lot)

    return LotPublicOut(
        id=lot.id,
        seller_id=lot.seller_id,
        game_id=lot.game_id,
        game_name=game.name,
        game_slug=game.slug,
        category=lot.category,
        title=lot.title,
        description=lot.description,
        price=lot.price,
        stock_count=lot.stock_count,
        is_active=lot.is_active,
        has_auto_delivery=bool(lot.auto_delivery_text),
        seller=SellerShortOut.model_validate(current_user),
    )


@app.post("/api/wallet/topup")
def topup_balance(
    amount: Decimal = Query(..., gt=Decimal("10"), le=Decimal("250000")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.balance = Decimal(current_user.balance) + amount
    db.commit()
    db.refresh(current_user)
    return {"balance": current_user.balance}


@app.post("/api/orders")
async def create_safe_order(
    payload: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lot = db.query(Lot).filter(Lot.id == payload.lot_id).with_for_update().first()
    if not lot or not lot.is_active or lot.stock_count <= 0:
        raise HTTPException(status_code=400, detail="Лот недоступен для покупки")
    if lot.seller_id == current_user.id:
        raise HTTPException(status_code=400, detail="Нельзя купить собственный лот")
    if Decimal(current_user.balance) < Decimal(lot.price):
        raise HTTPException(status_code=400, detail="Недостаточно средств на балансе")

    current_user.balance = Decimal(current_user.balance) - Decimal(lot.price)
    lot.stock_count -= 1
    if lot.stock_count == 0:
        lot.is_active = False

    delivered = (
        lot.auto_delivery_text.strip()
        if lot.auto_delivery_text and lot.auto_delivery_text.strip()
        else None
    )

    order = Order(
        buyer_id=current_user.id,
        seller_id=lot.seller_id,
        lot_id=lot.id,
        amount=lot.price,
        status=OrderStatus.PAID,
        delivered_data=delivered,
    )
    db.add(order)
    db.flush()

    sys_msg = Message(
        sender_id=current_user.id,
        receiver_id=lot.seller_id,
        order_id=order.id,
        text=f"[Система] Заказ #{order.id} оплачен ({lot.price} ₽). Средства заморожены гарантом."
        + (f" Автовыдача: {delivered}" if delivered else ""),
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(order)

    event_data = {
        "type": "order_event",
        "order_id": order.id,
        "status": order.status.value,
        "text": sys_msg.text,
    }
    await ws_manager.send_to_user(lot.seller_id, event_data)
    await ws_manager.send_to_user(current_user.id, event_data)

    return {
        "order_id": order.id,
        "status": order.status.value,
        "delivered_data": order.delivered_data,
        "new_balance": current_user.balance,
    }


@app.post("/api/orders/{order_id}/action")
async def process_order_action(
    order_id: int,
    payload: OrderActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    if current_user.id not in (order.buyer_id, order.seller_id):
        raise HTTPException(status_code=403, detail="Нет доступа к заказу")

    if payload.action == "complete":
        if current_user.id != order.buyer_id:
            raise HTTPException(
                status_code=403,
                detail="Только покупатель может подтвердить получение товара",
            )
        if order.status not in (OrderStatus.PAID, OrderStatus.DISPUTED):
            raise HTTPException(status_code=400, detail="Заказ уже завершён")

        seller = db.query(User).filter(User.id == order.seller_id).with_for_update().first()
        seller.balance = Decimal(seller.balance) + Decimal(order.amount)
        order.status = OrderStatus.COMPLETED

    elif payload.action == "dispute":
        if order.status != OrderStatus.PAID:
            raise HTTPException(status_code=400, detail="Спор невозможен для данного статуса")
        order.status = OrderStatus.DISPUTED

    elif payload.action == "refund":
        if order.status not in (OrderStatus.PAID, OrderStatus.DISPUTED):
            raise HTTPException(status_code=400, detail="Возврат невозможен")
        if current_user.id != order.seller_id and order.status != OrderStatus.DISPUTED:
            raise HTTPException(status_code=403, detail="Сначала откройте спор")

        buyer = db.query(User).filter(User.id == order.buyer_id).with_for_update().first()
        buyer.balance = Decimal(buyer.balance) + Decimal(order.amount)
        order.status = OrderStatus.REFUNDED

    db.commit()
    return {"order_id": order.id, "status": order.status.value}


@app.post("/api/reviews")
def create_review(
    payload: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == payload.order_id).first()
    if not order or order.buyer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Заказ не найден")
    if order.status != OrderStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Сначала подтвердите выполнение заказа")
    if db.query(Review).filter(Review.order_id == order.id).first():
        raise HTTPException(status_code=409, detail="Отзыв уже оставлен")

    rev = Review(
        order_id=order.id,
        author_id=current_user.id,
        target_user_id=order.seller_id,
        rating=payload.rating,
        text=payload.text.strip(),
    )
    db.add(rev)
    db.flush()

    avg_rating, cnt = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.target_user_id == order.seller_id)
        .one()
    )
    seller = db.query(User).filter(User.id == order.seller_id).first()
    seller.rating = Decimal(str(round(float(avg_rating or 5.0), 2)))
    seller.reviews_count = int(cnt or 0)
    db.commit()
    return {"ok": True, "rating": seller.rating, "reviews_count": seller.reviews_count}


@app.get("/api/messages/{partner_id}")
def get_dialog_messages(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.sender_id == current_user.id, Message.receiver_id == partner_id),
                and_(Message.sender_id == partner_id, Message.receiver_id == current_user.id),
            )
        )
        .order_by(asc(Message.timestamp))
        .all()
    )
    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "receiver_id": m.receiver_id,
            "order_id": m.order_id,
            "text": m.text,
            "timestamp": m.timestamp.isoformat(),
        }
        for m in rows
    ]


@app.post("/api/messages")
async def send_chat_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    msg = Message(
        sender_id=current_user.id,
        receiver_id=payload.receiver_id,
        order_id=payload.order_id,
        text=payload.text.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    ws_payload = {
        "type": "chat_message",
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_username": current_user.username,
        "receiver_id": msg.receiver_id,
        "order_id": msg.order_id,
        "text": msg.text,
        "timestamp": msg.timestamp.isoformat(),
    }
    await ws_manager.send_to_user(payload.receiver_id, ws_payload)
    await ws_manager.send_to_user(current_user.id, ws_payload)
    return ws_payload


@app.websocket("/ws/chat")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    cookie_token = websocket.cookies.get("access_token")
    raw_token = token or cookie_token
    user_id = decode_access_token(raw_token) if raw_token else None
    if not user_id:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=4001)
            return
        user.is_online = True
        db.commit()
        username = user.username
    finally:
        db.close()

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            receiver_id = int(data.get("receiver_id", 0))
            text = str(data.get("text", "")).strip()
            order_id = data.get("order_id")
            if receiver_id <= 0 or not text:
                continue

            db_msg = SessionLocal()
            try:
                msg = Message(
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    order_id=int(order_id) if order_id else None,
                    text=text[:2000],
                )
                db_msg.add(msg)
                db_msg.commit()
                db_msg.refresh(msg)
                out = {
                    "type": "chat_message",
                    "id": msg.id,
                    "sender_id": user_id,
                    "sender_username": username,
                    "receiver_id": receiver_id,
                    "order_id": msg.order_id,
                    "text": msg.text,
                    "timestamp": msg.timestamp.isoformat(),
                }
            finally:
                db_msg.close()

            await ws_manager.send_to_user(receiver_id, out)
            await ws_manager.send_to_user(user_id, out)
    except WebSocketDisconnect:
        became_offline = ws_manager.disconnect(user_id, websocket)
        if became_offline:
            db_off = SessionLocal()
            try:
                u = db_off.query(User).filter(User.id == user_id).first()
                if u:
                    u.is_online = False
                    db_off.commit()
            finally:
                db_off.close()


STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_spa():
    return FileResponse(str(STATIC_DIR / "index.html"))
