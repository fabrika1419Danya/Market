"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Zap,
  ShieldCheck,
  Plus,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { LotPurchaseModal } from "@/components/LotPurchaseModal";
import { formatRub } from "@/components/AppProvider";

interface GameItem {
  id: number;
  name: string;
  slug: string;
  icon: string;
  categories: string[];
  totalLots: number;
  categoryCounts: Record<string, number>;
}

interface MarketplaceLot {
  id: number;
  category: string;
  serverName: string;
  title: string;
  description: string;
  price: number;
  stockCount: number;
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
    rating: number;
    reviewsCount: number;
    isOnline: boolean;
    createdAt: string;
  };
}

const CATEGORIES = ["Аккаунты", "Валюта", "Услуги", "Предметы"];

export default function HomePage() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [lots, setLots] = useState<MarketplaceLot[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGame, setSelectedGame] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [autoOnly, setAutoOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>("default");

  const [activeLotId, setActiveLotId] = useState<number | null>(null);

  const fetchMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedGame) params.set("game", selectedGame);
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (onlineOnly) params.set("online", "1");
      if (autoOnly) params.set("auto", "1");
      if (sortBy !== "default") params.set("sort", sortBy);

      const res = await fetch(`/api/marketplace?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setGames(data.games || []);
        setLots(data.lots || []);
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedGame,
    selectedCategory,
    searchQuery,
    onlineOnly,
    autoOnly,
    sortBy,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMarketplace();
    }, 120);
    return () => clearTimeout(timer);
  }, [fetchMarketplace]);

  const currentGameObj = useMemo(
    () => games.find((g) => g.slug === selectedGame) || null,
    [games, selectedGame]
  );

  const totalCatalogLots = useMemo(
    () => games.reduce((sum, g) => sum + g.totalLots, 0),
    [games]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Search + Escrow Utility Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по играм, описанию лота, серверу или нику продавца..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50/50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-900" />
              Защита сделок эскроу 100%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-medium">
              <Zap className="w-4 h-4 text-amber-500" />
              Автовыдача за 1 сек.
            </span>
            <Link
              href="/sell"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Выставить лот
            </Link>
          </div>
        </div>

        {/* Game Selector Grid */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2.5">
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Каталог игр и сервисов
            </h1>
            {selectedGame && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGame("");
                  setSelectedCategory("");
                }}
                className="text-xs font-medium text-blue-900 hover:underline cursor-pointer"
              >
                Сбросить выбор игры
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedGame("");
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 transition cursor-pointer ${
                selectedGame === ""
                  ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>Все игры</span>
              <span
                className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
                  selectedGame === ""
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {totalCatalogLots}
              </span>
            </button>

            {games.map((game) => {
              const isSelected = selectedGame === game.slug;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(isSelected ? "" : game.slug)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-2 transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-900 text-white border-blue-900 font-semibold shadow-xs"
                      : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-6 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-blue-900"
                    }`}
                  >
                    {game.icon}
                  </span>
                  <span>{game.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {game.totalLots}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Category & Filter Bar */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory("")}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              selectedCategory === ""
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Все разделы
          </button>

          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            const catCount = currentGameObj
              ? currentGameObj.categoryCounts[cat] || 0
              : undefined;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(active ? "" : cat)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{cat}</span>
                {catCount !== undefined && (
                  <span
                    className={`font-mono text-[11px] ${
                      active ? "text-slate-300" : "text-slate-400"
                    }`}
                  >
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Toggles + Sort */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOnlineOnly((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border inline-flex items-center gap-2 transition cursor-pointer ${
              onlineOnly
                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                onlineOnly ? "bg-emerald-500" : "bg-slate-300"
              }`}
            />
            Только продавцы онлайн
          </button>

          <button
            type="button"
            onClick={() => setAutoOnly((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border inline-flex items-center gap-1.5 transition cursor-pointer ${
              autoOnly
                ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Автовыдача
          </button>

          <div className="relative inline-flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-900 cursor-pointer"
            >
              <option value="default">По актуальности</option>
              <option value="price_asc">Дешевле → Дороже</option>
              <option value="price_desc">Дороже → Дешевле</option>
              <option value="rating">По рейтингу продавца</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main FunPay-Style Lot Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-900" />
            <span>
              {currentGameObj ? currentGameObj.name : "Все предложения биржи"}
              {selectedCategory ? ` • ${selectedCategory}` : ""}
            </span>
          </div>
          <span className="font-mono text-slate-500">
            Найдено лотов: <strong className="text-slate-900">{lots.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-4 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="h-4 bg-slate-100 rounded w-32" />
                <div className="h-4 bg-slate-100 rounded flex-1 max-w-md" />
                <div className="h-4 bg-slate-100 rounded w-36" />
                <div className="h-8 bg-slate-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : lots.length === 0 ? (
          <div className="py-14 px-4 text-center space-y-3">
            <div className="text-sm font-semibold text-slate-800">
              По выбранным фильтрам активных лотов не найдено
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Попробуйте отключить фильтр «Только онлайн» или выберите другую
              категорию каталога.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedGame("");
                setSelectedCategory("");
                setSearchQuery("");
                setOnlineOnly(false);
                setAutoOnly(false);
              }}
              className="px-4 py-2 rounded-lg bg-blue-900 text-white text-xs font-semibold cursor-pointer"
            >
              Сбросить все фильтры
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 w-44">Игра / Сервер</th>
                  <th className="py-3 px-4">Описание предложения</th>
                  <th className="py-3 px-4 w-60">Продавец</th>
                  <th className="py-3 px-4 w-28 text-right">Наличие</th>
                  <th className="py-3 px-4 w-36 text-right">Цена</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-sm">
                {lots.map((lot) => {
                  const regYear = new Date(lot.seller.createdAt).getFullYear();
                  return (
                    <tr
                      key={lot.id}
                      onClick={() => setActiveLotId(lot.id)}
                      className="group hover:bg-blue-50/35 transition cursor-pointer"
                    >
                      {/* Game / Category / Server */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-xs text-slate-800">
                          {lot.game.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">
                            {lot.category}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                            {lot.serverName}
                          </span>
                        </div>
                      </td>

                      {/* Lot Title & Preview */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-900 group-hover:text-blue-900 transition leading-snug">
                          {lot.hasAutoDelivery && (
                            <span
                              title="Мгновенная автоматическая выдача товара сразу после оплаты"
                              className="inline-flex items-center gap-0.5 mr-1.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold align-middle"
                            >
                              <Zap className="w-3 h-3 text-amber-600" />
                              Автовыдача
                            </span>
                          )}
                          <span>{lot.title}</span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                          {lot.description}
                        </p>
                      </td>

                      {/* Seller Info */}
                      <td
                        className="py-3.5 px-4 align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/users/${encodeURIComponent(lot.seller.username)}`}
                          className="flex items-start gap-2.5 group/seller"
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center border border-slate-200 group-hover/seller:border-blue-900 transition">
                              {lot.seller.avatar ||
                                lot.seller.username.slice(0, 2).toUpperCase()}
                            </div>
                            <span
                              title={
                                lot.seller.isOnline ? "В сети" : "Не в сети"
                              }
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                lot.seller.isOnline
                                  ? "bg-emerald-500"
                                  : "bg-slate-300"
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 group-hover/seller:text-blue-900 group-hover/seller:underline truncate">
                                {lot.seller.username}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              <StarRating
                                rating={lot.seller.rating}
                                reviewsCount={lot.seller.reviewsCount}
                                size="sm"
                              />
                            </div>
                            <div className="text-[10px] text-slate-400">
                              на бирже с {regYear} г.
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Stock Count */}
                      <td className="py-3.5 px-4 align-middle text-right font-mono text-xs text-slate-600 tabular-nums">
                        {lot.stockCount} шт.
                      </td>

                      {/* Price + Action */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                          {formatRub(lot.price)}
                        </div>
                        <span className="inline-block mt-1 px-2.5 py-1 rounded-md bg-blue-900 group-hover:bg-blue-800 text-white text-[11px] font-semibold transition">
                          Купить
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LotPurchaseModal
        lotId={activeLotId}
        onClose={() => setActiveLotId(null)}
        onPurchased={fetchMarketplace}
      />
    </div>
  );
}
