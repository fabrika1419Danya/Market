"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ShieldCheck,
  Wallet,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

export interface ClientUser {
  id: number;
  username: string;
  email: string;
  balance: number;
  avatar: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export interface WalletTxItem {
  id: number;
  type: string;
  amount: number;
  description: string;
  orderId: number | null;
  createdAt: string;
}

interface AppContextValue {
  user: ClientUser | null;
  loadingUser: boolean;
  activeDealsCount: number;
  transactions: WalletTxItem[];
  refreshMe: () => Promise<void>;
  openAuthModal: (mode?: "login" | "register") => void;
  openWalletModal: () => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}

export function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeDealsCount, setActiveDealsCount] = useState(0);
  const [transactions, setTransactions] = useState<WalletTxItem[]>([]);

  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | null>(
    null
  );
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  // Auth form states
  const [username, setUsername] = useState("");
  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Wallet form states
  const [topupAmount, setTopupAmount] = useState("1000");
  const [topupMethod, setTopupMethod] = useState("СБП (Система быстрых платежей)");
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState("");

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setActiveDealsCount(data.activeDealsCount || 0);
        setTransactions(data.transactions || []);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const openAuthModal = useCallback((mode: "login" | "register" = "login") => {
    setAuthError("");
    setAuthModalMode(mode);
  }, []);

  const openWalletModal = useCallback(() => {
    setTopupSuccess("");
    setWalletModalOpen(true);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setActiveDealsCount(0);
    setTransactions([]);
  }, []);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const endpoint =
        authModalMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        authModalMode === "register"
          ? { username, email: loginInput, password }
          : { login: loginInput, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Ошибка авторизации");
        return;
      }
      setUser(data.user);
      setAuthModalMode(null);
      setUsername("");
      setLoginInput("");
      setPassword("");
      await refreshMe();
    } catch {
      setAuthError("Сетевая ошибка, попробуйте снова");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function quickDemoLogin(demoUsername: string) {
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: demoUsername, password: "demo12345" }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setAuthModalMode(null);
        await refreshMe();
      } else {
        setAuthError(data.error || "Не удалось войти в демо-аккаунт");
      }
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    setTopupSubmitting(true);
    setTopupSuccess("");
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(topupAmount),
          method: topupMethod,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setTopupSuccess(
          `Баланс успешно пополнен на ${formatRub(Number(topupAmount))}`
        );
        await refreshMe();
      }
    } finally {
      setTopupSubmitting(false);
    }
  }

  return (
    <AppContext.Provider
      value={{
        user,
        loadingUser,
        activeDealsCount,
        transactions,
        refreshMe,
        openAuthModal,
        openWalletModal,
        logout,
      }}
    >
      {children}

      {/* Auth Modal */}
      {authModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                  PL
                </span>
                <h2 className="font-bold text-slate-900 text-base">
                  {authModalMode === "login"
                    ? "Вход на биржу PayLoot"
                    : "Регистрация аккаунта"}
                </h2>
              </div>
              <button
                onClick={() => setAuthModalMode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-5 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("login");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-md transition ${
                    authModalMode === "login"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("register");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-md transition ${
                    authModalMode === "register"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Регистрация
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authModalMode === "register" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Никнейм на бирже
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Например: gamer_pro"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/15"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    {authModalMode === "login"
                      ? "Имя пользователя или Email"
                      : "Электронная почта"}
                  </label>
                  <input
                    type={authModalMode === "register" ? "email" : "text"}
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder={
                      authModalMode === "login"
                        ? "alex_trader или alex@payloot.ru"
                        : "you@example.com"
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                    Пароль
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/15"
                  />
                </div>

                {authError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {authError}
                  </div>
                )}

                {authModalMode === "register" && (
                  <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-xs text-blue-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-800" />
                    <span>
                      Новым участникам начисляется тестовый баланс{" "}
                      <strong>2 500 ₽</strong> для мгновенной проверки безопасных
                      сделок и автовыдачи.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm transition cursor-pointer"
                >
                  {authSubmitting
                    ? "Подождите..."
                    : authModalMode === "login"
                      ? "Войти в аккаунт"
                      : "Зарегистрироваться"}
                </button>
              </form>

              {/* Quick 1-click demo switchers */}
              <div className="mt-5 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-900" />
                  Быстрый вход в демо-профиль (пароль:{" "}
                  <code className="font-mono text-slate-700">demo12345</code>):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={() => quickDemoLogin("alex_trader")}
                    className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-900 hover:bg-blue-50/40 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900">
                      alex_trader
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Трейдер • 15 400 ₽
                    </div>
                  </button>
                  <button
                    type="button"
                    disabled={authSubmitting}
                    onClick={() => quickDemoLogin("vortex_boost")}
                    className="px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-900 hover:bg-blue-50/40 text-left transition cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-900">
                      vortex_boost
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Продавец ★ 5.00
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet & Balance History Modal */}
      {walletModalOpen && user && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-blue-900" />
                <h2 className="font-bold text-slate-900 text-base">
                  Внутренний баланс и эскроу-история
                </h2>
              </div>
              <button
                onClick={() => setWalletModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-300 uppercase tracking-wider">
                    Доступный баланс
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums mt-0.5">
                    {formatRub(user.balance)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 text-emerald-300 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    Защита сделок активна
                  </div>
                </div>
              </div>

              <form onSubmit={handleTopup} className="space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Моментальное пополнение баланса
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {["500", "1000", "2500", "5000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopupAmount(preset)}
                      className={`py-2 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer ${
                        topupAmount === preset
                          ? "bg-blue-900 text-white border-blue-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      +{Number(preset).toLocaleString("ru-RU")} ₽
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    min={50}
                    max={250000}
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-36 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:border-blue-900"
                    placeholder="Сумма ₽"
                  />
                  <select
                    value={topupMethod}
                    onChange={(e) => setTopupMethod(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-blue-900"
                  >
                    <option value="СБП">СБП (0% комиссия)</option>
                    <option value="Банковская карта МИР / Visa">
                      Карта РФ / МИР
                    </option>
                    <option value="USDT TRC-20">Криптовалюта USDT</option>
                  </select>
                </div>

                {topupSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    {topupSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={topupSubmitting}
                  className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-sm transition cursor-pointer"
                >
                  {topupSubmitting
                    ? "Зачисление..."
                    : `Пополнить баланс на ${formatRub(Number(topupAmount) || 0)}`}
                </button>
              </form>

              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2.5">
                  Последние операции по счёту
                </h3>
                {transactions.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                    История транзакций пока пуста
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {transactions.map((tx) => {
                      const positive = tx.amount >= 0;
                      return (
                        <div
                          key={tx.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                positive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {positive ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <div className="font-medium text-slate-800 truncate">
                                {tx.description}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {new Date(tx.createdAt).toLocaleString("ru-RU", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`font-mono font-semibold tabular-nums whitespace-nowrap ${
                              positive ? "text-emerald-600" : "text-slate-900"
                            }`}
                          >
                            {positive ? "+" : ""}
                            {formatRub(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}
