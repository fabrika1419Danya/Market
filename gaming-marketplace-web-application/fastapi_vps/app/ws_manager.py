from collections import defaultdict
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """Менеджер живых WebSocket-соединений для мгновенного чата и уведомлений сделок."""

    def __init__(self) -> None:
        self.active_connections: Dict[int, Set[WebSocket]] = defaultdict(set)

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: int, websocket: WebSocket) -> bool:
        sockets = self.active_connections.get(user_id)
        if sockets and websocket in sockets:
            sockets.remove(websocket)
        if not sockets:
            self.active_connections.pop(user_id, None)
            return True  # больше нет активных вкладок пользователя
        return False

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        sockets = list(self.active_connections.get(user_id, set()))
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:
                self.disconnect(user_id, ws)


ws_manager = ConnectionManager()
