type Listener = (payload: {
  id: number;
  senderId: number;
  receiverId: number;
  orderId: number | null;
  isSystem: boolean;
  text: string;
  timestamp: string;
}) => void;

const globalBus = globalThis as typeof globalThis & {
  __paylootChatListeners?: Map<number, Set<Listener>>;
};

const listenersMap =
  globalBus.__paylootChatListeners ?? new Map<number, Set<Listener>>();

if (process.env.NODE_ENV !== "production") {
  globalBus.__paylootChatListeners = listenersMap;
}

export function subscribeUserChat(userId: number, fn: Listener): () => void {
  let set = listenersMap.get(userId);
  if (!set) {
    set = new Set();
    listenersMap.set(userId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) {
      listenersMap.delete(userId);
    }
  };
}

export function emitChatMessage(payload: {
  id: number;
  senderId: number;
  receiverId: number;
  orderId: number | null;
  isSystem: boolean;
  text: string;
  timestamp: string;
}): void {
  for (const uid of [payload.senderId, payload.receiverId]) {
    const subs = listenersMap.get(uid);
    if (subs) {
      for (const fn of subs) {
        try {
          fn(payload);
        } catch {
          // ignore closed stream
        }
      }
    }
  }
}
