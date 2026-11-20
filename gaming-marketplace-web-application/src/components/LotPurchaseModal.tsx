"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Zap,
  ShieldCheck,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { StarRating } from "./StarRating";
import { useApp, formatRub } from "./AppProvider";

interface LotDetailResponse {
  lot: {
    id: number;
    category: string;
    serverName: string;
    title: string;
    description: string;
    price: number;
    stockCount: number;
    isActive: boolean;
    hasAutoDelivery: boolean;
    createdAt: string;
    game: {
      id: number;
      name: string;
      slug: string;
      icon: string;
    };
    seller: {
      id: number;
      username: string;
      avatar: string;
      bio: string;
      rating: number;
      reviewsCount: number;
      isOnline: boolean;
      createdAt: string;
    };
  };
  sellerReviews: Array<{
    id: number;
    rating: number;
    text: string;
    authorUsername: string;
    createdAt: string;
  }>;
}

interface LotPurchaseModalProps {
  lotId: number | null;
  onClose: () => void;
  onPurchased?: () => void;
}

export function LotPurchaseModal({
  lotId,
  onClose,
  onPurchased,
}: LotPurchaseModalProps) {
  const router = useRouter();
  const { user, refreshMe, openAuthModal, openWalletModal } = useApp();

  const [data, setData] = useState<LotDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const [purchaseResult, setPurchaseResult] = useState<{
    orderId: number;
    deliveredData: string | null;
    sellerId: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!lotId) {
      setData(null);
      setPurchaseResult(null);
      setError("");
      setComment("");
      return;
    }
    setLoading(true);
    setError("");
    setPurchaseResult(null);
    fetch(`/api/lots/${lotId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lot) setData(d);
        else setError(d.error || "Лот не найден");
      })
      .catch(() => setError("Ошибка загрузки лота"))
      .finally(() => setLoading(false));
  }, [lotId]);

  if (!lotId) return null;

  async function handleBuy() {
    if (!data) return;
    if (!user) {
      openAuthModal("login");
      return;
    }
    setBuying(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lotId: data.lot.id,
          comment,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        setError(resData.error || "Ошибка оформления безопасной сделки");
        return;
      }
      await refreshMe();
      onPurchased?.();
      setPurchaseResult({
        orderId: resData.orderId,
        deliveredData: resData.deliveredData,
        sellerId: resData.sellerId,
      });
    } catch {
      setError("Сетевая ошибка при оплате заказа");
    } finally {
      setBuying(false);
    }
  }

  function copyDelivered() {
    if (!purchaseResult?.deliveredData) return;
    navigator.clipboard.writeText(purchaseResult.deliveredData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-blue-900" />
            <span>
              {purchaseResult
                ? `Заказ #${purchaseResult.orderId} успешно оплачен`
                : "Оформление безопасной сделки"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Загрузка параметров лота...
            </div>
          ) : purchaseResult && data ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="font-bold text-base mb-1">
                  Средства зарезервированы гарантом PayLoot!
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Сумма <strong>{formatRub(data.lot.price)}</strong> заморожена
                  на транзитном счёте биржи. Продавец{" "}
                  <strong>{data.lot.seller.username}</strong> получит выплату
                  только после того, как вы проверите товар и подтвердите
                  выполнение заказа.
                </p>
              </div>

              {purchaseResult.deliveredData ? (
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                      <Zap className="w-4 h-4" />
                      Мгновенная автовыдача товара
                    </span>
                    <button
                      type="button"
                      onClick={copyDelivered}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Скопировать
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 break-all">
                    {purchaseResult.deliveredData}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Эти данные также сохранены в разделе «Сделки» внутри
                    карточки заказа #{purchaseResult.orderId}.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-950">
                  Уведомление о вашей оплате уже отправлено продавцу в живой
                  чат! Перейдите в диалог или карточку сделки для получения
                  товара.
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/orders?highlight=${purchaseResult.orderId}`);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition cursor-pointer"
                >
                  Перейти к управлению заказом #{purchaseResult.orderId}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/chat?partnerId=${purchaseResult.sellerId}`);
                  }}
                  className="py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 font-medium text-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Открыть чат с продавцом
                </button>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Game & Category Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
                  {data.lot.game.name}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 font-medium">
                  {data.lot.category}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                  Сервер: {data.lot.serverName}
                </span>
                {data.lot.hasAutoDelivery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    Автовыдача 24/7
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-snug">
                  {data.lot.title}
                </h3>
                <p className="mt-2.5 text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
                  {data.lot.description}
                </p>
              </div>

              {/* Seller Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-blue-900/10 text-blue-900 font-bold text-sm flex items-center justify-center border border-blue-900/20">
                      {data.lot.seller.avatar ||
                        data.lot.seller.username.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                        data.lot.seller.isOnline
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${encodeURIComponent(data.lot.seller.username)}`}
                        onClick={onClose}
                        className="font-bold text-sm text-slate-900 hover:text-blue-900 inline-flex items-center gap-1"
                      >
                        {data.lot.seller.username}
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          data.lot.seller.isOnline
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {data.lot.seller.isOnline ? "Онлайн" : "Оффлайн"}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <StarRating
                        rating={data.lot.seller.rating}
                        reviewsCount={data.lot.seller.reviewsCount}
                      />
                      <span className="text-[11px] text-slate-400">
                        • с{" "}
                        {new Date(data.lot.seller.createdAt).toLocaleDateString(
                          "ru-RU",
                          { month: "short", year: "numeric" }
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {user?.id !== data.lot.seller.id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        openAuthModal("login");
                        return;
                      }
                      onClose();
                      router.push(`/chat?partnerId=${data.lot.seller.id}`);
                    }}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 hover:border-blue-900 hover:text-blue-900 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Написать продавцу
                  </button>
                )}
              </div>

              {/* Recent Reviews Preview */}
              {data.sellerReviews.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Последние отзывы о продавце
                  </div>
                  <div className="space-y-2">
                    {data.sellerReviews.slice(0, 2).map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800">
                            {rev.authorUsername}
                          </span>
                          <StarRating rating={rev.rating} showCount={false} />
                        </div>
                        <p className="text-slate-600">{rev.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buyer Comment Input */}
              {user?.id !== data.lot.seller.id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Комментарий для продавца (никнейм, UID, ссылка на обмен — по
                    желанию)
                  </label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Например: Мой UID 712948102 (Европа) / Готов принять трейд"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </span>
                  {user && user.balance < data.lot.price && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        openWalletModal();
                      }}
                      className="px-2.5 py-1 rounded bg-blue-900 text-white font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Пополнить счёт
                    </button>
                  )}
                </div>
              )}

              {/* Checkout Action Footer */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    К оплате с защитой сделки • В наличии:{" "}
                    <span className="font-mono font-semibold text-slate-700">
                      {data.lot.stockCount} шт.
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    {formatRub(data.lot.price)}
                  </div>
                </div>

                {user?.id === data.lot.seller.id ? (
                  <Link
                    href="/sell"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 text-center"
                  >
                    Это ваш лот • Редактировать
                  </Link>
                ) : user && user.balance < data.lot.price ? (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openWalletModal();
                    }}
                    className="px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Wallet className="w-4 h-4" />
                    Пополнить баланс (не хватает{" "}
                    {formatRub(data.lot.price - user.balance)})
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={buying || data.lot.stockCount <= 0}
                    onClick={handleBuy}
                    className="px-6 py-3 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {buying
                      ? "Резервирование средств..."
                      : `Купить безопасно за ${formatRub(data.lot.price)}`}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-rose-600">
              {error || "Не удалось загрузить лот"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
