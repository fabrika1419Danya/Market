"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Send,
  ShieldCheck,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Radio,
} from "lucide-react";
import { useApp, formatRub } from "@/components/AppProvider";
import { StarRating } from "@/components/StarRating";

interface ContactItem {
  id: number;
  username: string;
  avatar: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  lastMessage: {
    text: string;
    timestamp: string;
    isSystem: boolean;
  } | null;
}

interface ChatMessageItem {
  id: number;
  senderId: number;
  receiverId: number;
  orderId: number | null;
  isSystem: boolean;
  text: string;
  timestamp: string;
}

interface SharedOrderItem {
  id: number;
  amount: number;
  status: string;
  role: "buyer" | "seller";
  lotTitle: string;
  deliveredData: string | null;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialPartnerId = Number(searchParams.get("partnerId") || 0);
  const { user, loadingUser, openAuthModal, refreshMe } = useApp();

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [activePartnerId, setActivePartnerId] =
    useState<number>(initialPartnerId);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [sharedOrders, setSharedOrders] = useState<SharedOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamConnected, setStreamConnected] = useState(false);

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadChat = useCallback(
    async (targetPartnerId?: number, silent = false) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const pid =
          targetPartnerId !== undefined ? targetPartnerId : activePartnerId;
        const url =
          pid > 0 ? `/api/messages?partnerId=${pid}` : `/api/messages`;
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          setContacts(d.contacts || []);
          if (d.activePartnerId) {
            setActivePartnerId(d.activePartnerId);
          }
          setMessages(d.messages || []);
          setSharedOrders(d.sharedOrders || []);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, activePartnerId]
  );

  useEffect(() => {
    if (!loadingUser) {
      loadChat(initialPartnerId || undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingUser, user?.id, initialPartnerId]);

  // Real-time SSE connection + fallback sync interval
  useEffect(() => {
    if (!user) return;

    const es = new EventSource("/api/messages/stream");
    es.addEventListener("connected", () => {
      setStreamConnected(true);
    });
    es.addEventListener("message", (event) => {
      try {
        const incoming: ChatMessageItem = JSON.parse(event.data);
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          if (
            incoming.senderId === activePartnerId ||
            incoming.receiverId === activePartnerId
          ) {
            return [...prev, incoming];
          }
          return prev;
        });
        loadChat(activePartnerId, true);
      } catch {
        // ignore malformed event
      }
    });
    es.onerror = () => {
      setStreamConnected(false);
    };

    const interval = setInterval(() => {
      loadChat(activePartnerId, true);
    }, 3500);

    return () => {
      es.close();
      clearInterval(interval);
    };
  }, [user, activePartnerId, loadChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activePartnerId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || !activePartnerId || sending) return;

    const activePaidOrder = sharedOrders.find((o) => o.status === "paid");

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activePartnerId,
          orderId: activePaidOrder?.id || null,
          text: trimmed,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setInputText("");
        setMessages((prev) =>
          prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]
        );
        loadChat(activePartnerId, true);
      }
    } finally {
      setSending(false);
    }
  }

  async function quickConfirmOrder(orderId: number) {
    const res = await fetch(`/api/orders/${orderId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    if (res.ok) {
      await Promise.all([loadChat(activePartnerId, true), refreshMe()]);
    }
  }

  if (!loadingUser && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Живой чат покупателей и продавцов
        </h1>
        <p className="text-sm text-slate-500">
          Авторизуйтесь, чтобы общаться с продавцами в реальном времени и
          получать уведомления по безопасным сделкам.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="px-5 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-semibold cursor-pointer"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  const activePartner =
    contacts.find((c) => c.id === activePartnerId) || null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-140px)] min-h-[540px]">
        {/* Left Contacts Column */}
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/40">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
            <h1 className="font-bold text-sm text-slate-900">Диалоги</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Radio className="w-3 h-3" />
              {streamConnected ? "Live подключён" : "Онлайн-синхронизация"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70">
            {loading ? (
              <div className="p-4 text-xs text-slate-400">
                Загрузка списка собеседников...
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  У вас пока нет активных переписок.
                </p>
                <Link
                  href="/"
                  className="inline-block text-xs font-semibold text-blue-900 hover:underline"
                >
                  Выбрать лот в каталоге →
                </Link>
              </div>
            ) : (
              contacts.map((c) => {
                const selected = c.id === activePartnerId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActivePartnerId(c.id);
                      loadChat(c.id);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                      selected
                        ? "bg-blue-50/70 border-l-2 border-l-blue-900"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200">
                        {c.avatar || c.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                          c.isOnline ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {c.username}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(
                              c.lastMessage.timestamp
                            ).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5">
                        <StarRating
                          rating={c.rating}
                          reviewsCount={c.reviewsCount}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-1">
                        {c.lastMessage
                          ? c.lastMessage.text
                          : "Начните диалог с продавцом"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Chat Window */}
        <section className="md:col-span-8 flex flex-col bg-white min-h-0">
          {activePartner ? (
            <>
              {/* Partner Top Header */}
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-blue-900/10 text-blue-900 font-bold text-xs flex items-center justify-center">
                      {activePartner.avatar ||
                        activePartner.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                        activePartner.isOnline
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${encodeURIComponent(activePartner.username)}`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        {activePartner.username}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span className="text-[11px] text-slate-500">
                        {activePartner.isOnline ? "● Онлайн" : "Оффлайн"}
                      </span>
                    </div>
                    <StarRating
                      rating={activePartner.rating}
                      reviewsCount={activePartner.reviewsCount}
                      size="sm"
                    />
                  </div>
                </div>

                <Link
                  href="/orders"
                  className="text-xs font-semibold text-blue-900 hover:underline"
                >
                  Все мои сделки →
                </Link>
              </div>

              {/* Sticky Shared Escrow Deal Bar */}
              {sharedOrders.length > 0 && (
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-blue-900 shrink-0" />
                    <span className="font-mono font-bold text-slate-900">
                      Заказ #{sharedOrders[0].id}
                    </span>
                    <span className="text-slate-600 truncate max-w-xs">
                      {sharedOrders[0].lotTitle}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      ({formatRub(sharedOrders[0].amount)})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        sharedOrders[0].status === "paid"
                          ? "bg-blue-100 text-blue-900"
                          : sharedOrders[0].status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sharedOrders[0].status === "paid"
                        ? "В гаранте"
                        : sharedOrders[0].status === "completed"
                          ? "Выполнен"
                          : sharedOrders[0].status === "disputed"
                            ? "Спор"
                            : "Возврат"}
                    </span>
                  </div>

                  {sharedOrders[0].role === "buyer" &&
                    sharedOrders[0].status === "paid" && (
                      <button
                        type="button"
                        onClick={() => quickConfirmOrder(sharedOrders[0].id)}
                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Подтвердить получение
                      </button>
                    )}
                </div>
              )}

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/30">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-1">
                    <ShieldCheck className="w-7 h-7 text-slate-300 mb-1" />
                    <p className="font-medium text-slate-600">
                      Чат защищён системой безопасной сделки PayLoot
                    </p>
                    <p>
                      Никогда не переводите деньги напрямую вне заказа на бирже.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    if (m.isSystem) {
                      return (
                        <div
                          key={m.id}
                          className="mx-auto max-w-xl p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-950 text-center"
                        >
                          <div className="font-medium leading-relaxed">
                            {m.text}
                          </div>
                          <div className="text-[10px] text-blue-700/70 mt-1">
                            Гарант биржи •{" "}
                            {new Date(m.timestamp).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      );
                    }

                    const isMine = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`flex ${
                          isMine ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                            isMine
                              ? "bg-blue-900 text-white rounded-br-sm"
                              : "bg-white border border-slate-200 text-slate-900 rounded-bl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">
                            {m.text}
                          </p>
                          <div
                            className={`text-[10px] mt-1 text-right ${
                              isMine ? "text-blue-200" : "text-slate-400"
                            }`}
                          >
                            {m.orderId ? `Заказ #${m.orderId} • ` : ""}
                            {new Date(m.timestamp).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="p-3.5 border-t border-slate-200 bg-white flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Написать сообщение для ${activePartner.username}...`}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-900"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  className="px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Отправить</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-sm text-slate-500">
              Выберите диалог слева или нажмите «Написать продавцу» в карточке
              любого лота.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="h-[540px] rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
