"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MessageSquare,
  Zap,
  ShieldCheck,
  Plus,
  Edit3,
  Check,
  ArrowLeft,
} from "lucide-react";
import { StarRating } from "@/components/StarRating";
import { LotPurchaseModal } from "@/components/LotPurchaseModal";
import { useApp, formatRub } from "@/components/AppProvider";

interface ProfileData {
  id: number;
  username: string;
  avatar: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
  isSelf: boolean;
}

interface ProfileLot {
  id: number;
  gameId: number;
  gameName: string;
  gameSlug: string;
  gameIcon: string;
  category: string;
  serverName: string;
  title: string;
  description: string;
  price: number;
  stockCount: number;
  hasAutoDelivery: boolean;
  createdAt: string;
}

interface ProfileReview {
  id: number;
  orderId: number;
  rating: number;
  text: string;
  createdAt: string;
  authorUsername: string;
  authorAvatar: string;
  orderAmount: number;
  lotTitle: string;
  gameName: string;
}

export default function PublicUserProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { user, openAuthModal } = useApp();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [lots, setLots] = useState<ProfileLot[]>([]);
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!params.username) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/users/${params.username}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const d = await res.json();
        setProfile(d.profile);
        setBioDraft(d.profile.bio || "");
        setLots(d.lots || []);
        setReviews(d.reviews || []);
      }
    } finally {
      setLoading(false);
    }
  }, [params.username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const filteredLots = useMemo(() => {
    if (!categoryFilter) return lots;
    return lots.filter((l) => l.category === categoryFilter);
  }, [lots, categoryFilter]);

  async function saveBio() {
    if (!profile) return;
    setSavingBio(true);
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(profile.username)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: bioDraft }),
        }
      );
      if (res.ok) {
        setProfile({ ...profile, bio: bioDraft });
        setEditingBio(false);
      }
    } finally {
      setSavingBio(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse" />
        <div className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-slate-900">
          Профиль пользователя не найден
        </h1>
        <p className="text-sm text-slate-500">
          Проверьте правильность ссылки или вернитесь в каталог предложений.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 text-white text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          На главную витрину
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Назад к каталогу лотов
        </Link>
      </div>

      {/* Profile Header Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                {profile.avatar || profile.username.slice(0, 2).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white ${
                  profile.isOnline ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {profile.username}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    profile.isOnline
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      profile.isOnline ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {profile.isOnline
                    ? "Онлайн"
                    : `Был(а) в сети ${new Date(
                        profile.lastSeenAt
                      ).toLocaleDateString("ru-RU")}`}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Верифицирован
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Дата регистрации:{" "}
                  <strong className="text-slate-700">
                    {new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </span>
                <span>
                  Активных предложений:{" "}
                  <strong className="text-slate-700 font-mono">
                    {lots.length}
                  </strong>
                </span>
              </div>

              {/* Bio */}
              {editingBio ? (
                <div className="pt-1 flex items-center gap-2 max-w-xl">
                  <input
                    type="text"
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    maxLength={300}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900"
                    placeholder="Краткая информация о вашем магазине и часах работы"
                  />
                  <button
                    type="button"
                    disabled={savingBio}
                    onClick={saveBio}
                    className="px-3 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Сохранить
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-600 max-w-2xl">
                  <p>{profile.bio || "Продавец не указал описание профиля."}</p>
                  {user?.id === profile.id && (
                    <button
                      type="button"
                      onClick={() => setEditingBio(true)}
                      className="text-xs text-blue-900 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Изменить
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Rating Summary + Action Button */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="md:text-right">
              <div className="text-xs text-slate-500 mb-1">
                Рейтинг продавца
              </div>
              <StarRating
                rating={profile.rating}
                reviewsCount={profile.reviewsCount}
                size="lg"
              />
              <div className="text-xs text-slate-400 mt-0.5">
                {profile.reviewsCount > 0
                  ? `${profile.reviewsCount} подтверждённых отзывов`
                  : "Пока нет отзывов по сделкам"}
              </div>
            </div>

            {user?.id === profile.id ? (
              <Link
                href="/sell"
                className="px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                Управление моими лотами
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthModal("login");
                    return;
                  }
                  router.push(`/chat?partnerId=${profile.id}`);
                }}
                className="px-4 py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                Написать сообщение
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Two-Column Content: Active Lots + Reviews Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Lots Table (8 cols) */}
        <section className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Активные лоты продавца ({filteredLots.length})
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {["", "Аккаунты", "Валюта", "Услуги", "Предметы"].map((c) => (
                <button
                  key={c || "all"}
                  type="button"
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition cursor-pointer ${
                    categoryFilter === c
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {c || "Все"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {filteredLots.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                В выбранной категории нет активных лотов.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] uppercase font-bold text-slate-500">
                    <th className="py-3 px-4 w-40">Игра / Раздел</th>
                    <th className="py-3 px-4">Предложение</th>
                    <th className="py-3 px-4 w-24 text-right">Наличие</th>
                    <th className="py-3 px-4 w-32 text-right">Цена</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredLots.map((lot) => (
                    <tr
                      key={lot.id}
                      onClick={() => setSelectedLotId(lot.id)}
                      className="hover:bg-blue-50/35 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <div className="text-xs font-semibold text-slate-800">
                          {lot.gameName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {lot.category} • {lot.serverName}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-slate-900 leading-snug">
                          {lot.hasAutoDelivery && (
                            <span className="inline-flex items-center gap-0.5 mr-1.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
                              <Zap className="w-3 h-3 text-amber-600" />
                              Автовыдача
                            </span>
                          )}
                          {lot.title}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {lot.stockCount} шт.
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatRub(lot.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Reviews Feed (4 cols) */}
        <section className="lg:col-span-4 space-y-3">
          <h2 className="text-base font-bold text-slate-900">
            Лента отзывов ({reviews.length})
          </h2>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
            {reviews.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                У пользователя пока нет отзывов по завершённым сделкам.
              </div>
            ) : (
              reviews.map((rev) => (
                <div key={rev.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/users/${encodeURIComponent(rev.authorUsername)}`}
                      className="text-xs font-bold text-slate-900 hover:text-blue-900 hover:underline"
                    >
                      {rev.authorUsername}
                    </Link>
                    <StarRating rating={rev.rating} showCount={false} />
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {rev.text}
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[180px]">
                      {rev.gameName} • {formatRub(rev.orderAmount)}
                    </span>
                    <span>
                      {new Date(rev.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <LotPurchaseModal
        lotId={selectedLotId}
        onClose={() => setSelectedLotId(null)}
        onPurchased={loadProfile}
      />
    </div>
  );
}
