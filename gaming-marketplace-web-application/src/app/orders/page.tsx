"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Copy,
  Check,
  MessageSquare,
  Star,
  Lock,
} from "lucide-react";
import { useApp, formatRub } from "@/components/AppProvider";
import { StarRating } from "@/components/StarRating";

interface OrderItem {
  id: number;
  role: "buyer" | "seller";
  amount: number;
  status: "paid" | "completed" | "disputed" | "refunded";
  deliveredData: string | null;
  disputeReason: string | null;
  createdAt: string;
  completedAt: string | null;
  lot: {
    id: number;
    title: string;
    category: string;
    serverName: string;
    gameName: string;
    gameIcon: string;
    gameSlug: string;
  };
  buyer: {
    id: number;
    username: string;
    avatar: string;
    isOnline: boolean;
  };
  seller: {
    id: number;
    username: string;
    avatar: string;
    isOnline: boolean;
    rating: number;
  };
  review: {
    id: number;
    rating: number;
    text: string;
    createdAt: string;
  } | null;
}

function OrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = Number(searchParams.get("highlight") || 0);
  const { user, loadingUser, openAuthModal, refreshMe } = useApp();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "buyer" | "seller">("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<number | null>(null);

  // Dispute reason inline prompt state
  const [disputeOpenId, setDisputeOpenId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Review draft state per order
  const [reviewRating, setReviewRating] = useState<Record<number, number>>({});
  const [reviewText, setReviewText] = useState<Record<number, string>>({});
  const [submittingReviewId, setSubmittingReviewId] = useState<number | null>(
    null
  );

  const loadOrders = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loadingUser) {
      loadOrders();
    }
  }, [loadingUser, loadOrders]);

  async function runOrderAction(
    orderId: number,
    action: "complete" | "dispute" | "refund",
    reason?: string
  ) {
    setBusyOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Ошибка выполнения операции");
        return;
      }
      setDisputeOpenId(null);
      setDisputeReason("");
      await Promise.all([loadOrders(), refreshMe()]);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function submitReview(orderId: number) {
    const rating = reviewRating[orderId] || 5;
    const text = (reviewText[orderId] || "").trim();
    if (text.length < 3) {
      alert("Напишите хотя бы пару слов о сделке (минимум 3 символа)");
      return;
    }
    setSubmittingReviewId(orderId);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, rating, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Не удалось опубликовать отзыв");
        return;
      }
      await loadOrders();
    } finally {
      setSubmittingReviewId(null);
    }
  }

  if (!loadingUser && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Мои покупки и продажи с защитой гаранта
        </h1>
        <p className="text-sm text-slate-500">
          Войдите в аккаунт, чтобы управлять активными безопасными сделками,
          просматривать данные автовыдачи и оставлять отзывы.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="px-5 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer"
        >
          Войти в аккаунт
        </button>
      </div>
    );
  }

  const filtered = orders.filter((o) =>
    tab === "all" ? true : o.role === tab
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Безопасные сделки (Эскроу)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Деньги по оплаченным заказам хранятся на транзитном счёте биржи до
            подтверждения покупателя
          </p>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold">
          {[
            { id: "all", label: `Все (${orders.length})` },
            {
              id: "buyer",
              label: `Покупки (${orders.filter((o) => o.role === "buyer").length})`,
            },
            {
              id: "seller",
              label: `Продажи (${orders.filter((o) => o.role === "seller").length})`,
            },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as "all" | "buyer" | "seller")}
              className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                tab === t.id
                  ? "bg-blue-900 text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <div className="text-sm font-semibold text-slate-800">
            В этом разделе пока нет сделок
          </div>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold"
          >
            Перейти в каталог лотов
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order) => {
            const partner =
              order.role === "buyer" ? order.seller : order.buyer;
            const isHighlighted = highlightId === order.id;

            const statusMeta = {
              paid: {
                badge: "Оплачен • Средства в гаранте",
                cls: "bg-blue-50 text-blue-900 border-blue-200",
                icon: Lock,
              },
              completed: {
                badge: "Выполнен • Оплата переведена",
                cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
                icon: CheckCircle2,
              },
              disputed: {
                badge: "Арбитражный спор",
                cls: "bg-amber-50 text-amber-800 border-amber-200",
                icon: AlertTriangle,
              },
              refunded: {
                badge: "Отменён • Возврат покупателю",
                cls: "bg-slate-100 text-slate-700 border-slate-300",
                icon: RotateCcw,
              },
            }[order.status];

            const StatusIcon = statusMeta.icon;

            return (
              <div
                key={order.id}
                className={`bg-white border rounded-xl p-5 space-y-4 transition ${
                  isHighlighted
                    ? "border-blue-900 ring-2 ring-blue-900/15"
                    : "border-slate-200"
                }`}
              >
                {/* Top Row */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        Заказ #{order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          order.role === "buyer"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-indigo-50 text-indigo-900"
                        }`}
                      >
                        {order.role === "buyer" ? "Вы покупатель" : "Вы продавец"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.cls}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusMeta.badge}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.lot.gameName} • {order.lot.category} •{" "}
                      {new Date(order.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-lg text-slate-900 tabular-nums">
                      {formatRub(order.amount)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Контрагент:{" "}
                      <Link
                        href={`/users/${encodeURIComponent(partner.username)}`}
                        className="font-semibold text-blue-900 hover:underline"
                      >
                        {partner.username}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Lot Title */}
                <div className="text-sm font-semibold text-slate-900">
                  {order.lot.title}
                </div>

                {/* Escrow 3-Step Visual Progress */}
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-800">
                    1. Оплата заморожена гарантом ✓
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border font-medium ${
                      order.status === "paid"
                        ? "bg-blue-50/70 border-blue-200 text-blue-900"
                        : order.status === "disputed"
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    {order.status === "disputed"
                      ? "2. Идёт разбирательство спора"
                      : "2. Передача и проверка товара"}
                  </div>
                  <div
                    className={`p-2.5 rounded-lg border font-medium ${
                      order.status === "completed"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : order.status === "refunded"
                          ? "bg-slate-100 border-slate-300 text-slate-700"
                          : "bg-white border-dashed border-slate-200 text-slate-400"
                    }`}
                  >
                    {order.status === "completed"
                      ? "3. Средства выплачены продавцу ✓"
                      : order.status === "refunded"
                        ? "3. Средства возвращены покупателю ↩"
                        : "3. Ожидает подтверждения"}
                  </div>
                </div>

                {/* Auto-delivery Data Box */}
                {order.deliveredData && (
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5" />
                        Выданные данные товара (Автовыдача)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            order.deliveredData || ""
                          );
                          setCopiedId(order.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs cursor-pointer"
                      >
                        {copiedId === order.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Скопировано
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Копировать
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-all">
                      {order.deliveredData}
                    </div>
                  </div>
                )}

                {/* Dispute Reason Banner */}
                {order.status === "disputed" && order.disputeReason && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong>Причина спора:</strong> {order.disputeReason}
                  </div>
                )}

                {/* Interactive Escrow Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/chat?partnerId=${partner.id}`)
                    }
                    className="px-3.5 py-2 rounded-lg border border-slate-300 hover:border-blue-900 text-xs font-semibold text-slate-700 hover:text-blue-900 inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Открыть живой чат с {partner.username}
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.role === "buyer" &&
                      (order.status === "paid" ||
                        order.status === "disputed") && (
                        <button
                          type="button"
                          disabled={busyOrderId === order.id}
                          onClick={() => runOrderAction(order.id, "complete")}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Подтвердить выполнение заказа
                        </button>
                      )}

                    {order.status === "paid" && (
                      <button
                        type="button"
                        disabled={busyOrderId === order.id}
                        onClick={() =>
                          setDisputeOpenId(
                            disputeOpenId === order.id ? null : order.id
                          )
                        }
                        className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Открыть спор
                      </button>
                    )}

                    {((order.role === "seller" &&
                      (order.status === "paid" ||
                        order.status === "disputed")) ||
                      (order.role === "buyer" &&
                        order.status === "disputed")) && (
                      <button
                        type="button"
                        disabled={busyOrderId === order.id}
                        onClick={() => runOrderAction(order.id, "refund")}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {order.role === "seller"
                          ? "Вернуть деньги покупателю"
                          : "Возврат через арбитраж"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Dispute Form */}
                {disputeOpenId === order.id && (
                  <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Опишите проблему (например: неверные данные или продавец не выходит на связь)"
                      className="flex-1 px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={busyOrderId === order.id}
                      onClick={() =>
                        runOrderAction(order.id, "dispute", disputeReason)
                      }
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Подтвердить спор
                    </button>
                  </div>
                )}

                {/* Existing Review or Leave Review Form */}
                {order.review ? (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        Опубликованный отзыв по заказу:
                      </span>
                      <StarRating
                        rating={order.review.rating}
                        showCount={false}
                      />
                    </div>
                    <p className="text-slate-600">{order.review.text}</p>
                  </div>
                ) : (
                  order.role === "buyer" &&
                  order.status === "completed" && (
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Оцените работу продавца {order.seller.username}:
                        </span>
                        <div className="inline-flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((st) => {
                            const selected =
                              (reviewRating[order.id] || 5) >= st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() =>
                                  setReviewRating((prev) => ({
                                    ...prev,
                                    [order.id]: st,
                                  }))
                                }
                                className="p-0.5 cursor-pointer"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    selected
                                      ? "fill-amber-400 text-amber-500"
                                      : "fill-white text-slate-300"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={reviewText[order.id] || ""}
                          onChange={(e) =>
                            setReviewText((prev) => ({
                              ...prev,
                              [order.id]: e.target.value,
                            }))
                          }
                          placeholder="Напишите честный отзыв о скорости и качестве сделки..."
                          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-blue-900"
                        />
                        <button
                          type="button"
                          disabled={submittingReviewId === order.id}
                          onClick={() => submitReview(order.id)}
                          className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          {submittingReviewId === order.id
                            ? "Публикация..."
                            : "Оставить отзыв"}
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-44 rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
