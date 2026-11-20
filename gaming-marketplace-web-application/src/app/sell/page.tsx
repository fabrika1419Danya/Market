"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  PlusCircle,
  Zap,
  CheckCircle2,
  Power,
  ShieldCheck,
} from "lucide-react";
import { useApp, formatRub } from "@/components/AppProvider";

interface GameOption {
  id: number;
  name: string;
  slug: string;
  categories: string[];
}

interface OwnLot {
  id: number;
  gameId: number;
  gameName: string;
  category: string;
  serverName: string;
  title: string;
  description: string;
  price: number;
  stockCount: number;
  isActive: boolean;
  autoDeliveryText: string;
  createdAt: string;
}

export default function SellLotsPage() {
  const { user, loadingUser, openAuthModal } = useApp();

  const [games, setGames] = useState<GameOption[]>([]);
  const [myLots, setMyLots] = useState<OwnLot[]>([]);
  const [loading, setLoading] = useState(true);

  const [gameId, setGameId] = useState<number>(1);
  const [category, setCategory] = useState<string>("Аккаунты");
  const [serverName, setServerName] = useState<string>("EU / СНГ");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [price, setPrice] = useState<string>("990");
  const [stockCount, setStockCount] = useState<string>("1");
  const [autoDeliveryText, setAutoDeliveryText] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mRes = await fetch("/api/marketplace");
      if (mRes.ok) {
        const mData = await mRes.json();
        setGames(mData.games || []);
        if (mData.games?.length > 0) {
          setGameId((prev) => prev || mData.games[0].id);
        }
      }
      if (user) {
        const lRes = await fetch("/api/lots", { cache: "no-store" });
        if (lRes.ok) {
          const lData = await lRes.json();
          setMyLots(lData.lots || []);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loadingUser) {
      loadData();
    }
  }, [loadingUser, loadData]);

  async function handleCreateLot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          category,
          serverName,
          title,
          description,
          price: Number(price),
          stockCount: Number(stockCount),
          autoDeliveryText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка публикации лота");
        return;
      }
      setTitle("");
      setDescription("");
      setAutoDeliveryText("");
      setSuccessMsg("Лот успешно опубликован в каталоге биржи!");
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLotStatus(lot: OwnLot) {
    const nextActive = !lot.isActive;
    const nextStock =
      nextActive && lot.stockCount === 0 ? 1 : lot.stockCount;

    const res = await fetch(`/api/lots/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: nextActive,
        stockCount: nextStock,
      }),
    });
    if (res.ok) {
      await loadData();
    }
  }

  if (!loadingUser && !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto">
          <PlusCircle className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          Выставить игровой товар или аккаунт на продажу
        </h1>
        <p className="text-sm text-slate-500">
          Зарегистрируйтесь или войдите в профиль, чтобы размещать предложения и
          настраивать круглосуточную автовыдачу.
        </p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="px-5 py-2.5 rounded-lg bg-blue-900 text-white text-sm font-semibold cursor-pointer"
        >
          Войти для публикации лота
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Create Lot Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Новое предложение на бирже
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Размещение лотов бесплатное • Выплата сразу после подтверждения
              заказа покупателем
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
            <ShieldCheck className="w-4 h-4 text-blue-900" />
            Безопасная сделка включена
          </span>
        </div>

        <form onSubmit={handleCreateLot} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Игра
              </label>
              <select
                value={gameId}
                onChange={(e) => setGameId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-blue-900"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:border-blue-900"
              >
                <option value="Аккаунты">Аккаунты</option>
                <option value="Валюта">Валюта</option>
                <option value="Услуги">Услуги</option>
                <option value="Предметы">Предметы</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Сервер / Регион
              </label>
              <input
                type="text"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder="EU / RU / Steam"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Краткое название в таблице лотов
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: CS2 Prime • 17 000 Premier • Родная почта + Первое письмо"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
              Подробное описание и условия передачи
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Укажите комплектацию аккаунта, способ передачи валюты или время выполнения услуги..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-blue-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Цена за 1 шт. (в рублях ₽)
              </label>
              <input
                type="number"
                required
                min={10}
                max={500000}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Количество в наличии (шт.)
              </label>
              <input
                type="number"
                required
                min={1}
                max={9999}
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-900"
              />
            </div>
          </div>

          {/* Secret Auto-Delivery Field */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Zap className="w-4 h-4 text-amber-600" />
              Данные для мгновенной автовыдачи после оплаты (необязательно)
            </div>
            <p className="text-xs text-amber-800/90">
              Скрыты от всех посетителей! Автоматически отправляются покупателю
              только после успешного замораживания полной суммы на счёте
              гаранта.
            </p>
            <input
              type="text"
              value={autoDeliveryText}
              onChange={(e) => setAutoDeliveryText(e.target.value)}
              placeholder="LOGIN: example_acc | PASS: Secret123 | КОД АКТИВАЦИИ: XXXX-YYYY-ZZZZ"
              className="w-full px-3.5 py-2 rounded-lg border border-amber-300 bg-white text-xs font-mono focus:outline-none focus:border-amber-600"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold transition cursor-pointer"
          >
            {submitting ? "Сохранение..." : "Опубликовать лот в каталоге"}
          </button>
        </form>
      </section>

      {/* Seller's Existing Lots */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-slate-900">
          Мои размещённые лоты ({myLots.length})
        </h2>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-xs text-slate-400">Загрузка лотов...</div>
          ) : myLots.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Вы ещё не создали ни одного лота.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4">Игра / Категория</th>
                    <th className="py-3 px-4">Заголовок</th>
                    <th className="py-3 px-4 text-right">Остаток</th>
                    <th className="py-3 px-4 text-right">Цена</th>
                    <th className="py-3 px-4 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {myLots.map((lot) => (
                    <tr key={lot.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {lot.gameName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lot.category} • {lot.serverName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-900">
                          {lot.autoDeliveryText && (
                            <span className="inline-flex items-center gap-0.5 mr-1.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                              <Zap className="w-3 h-3" />
                              Автовыдача
                            </span>
                          )}
                          {lot.title}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600">
                        {lot.stockCount} шт.
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRub(lot.price)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleLotStatus(lot)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition cursor-pointer ${
                            lot.isActive && lot.stockCount > 0
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {lot.isActive && lot.stockCount > 0
                            ? "Активен"
                            : "Снят (Включить)"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
