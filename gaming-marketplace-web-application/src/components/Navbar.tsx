"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  MessageSquare,
  ShoppingBag,
  PlusCircle,
  Wallet,
  LogOut,
  Server,
  Plus,
} from "lucide-react";
import { useApp, formatRub } from "./AppProvider";

export function Navbar() {
  const pathname = usePathname();
  const {
    user,
    loadingUser,
    activeDealsCount,
    openAuthModal,
    openWalletModal,
    logout,
  } = useApp();

  const navItems = [
    { href: "/", label: "Каталог лотов", icon: null },
    {
      href: "/orders",
      label: "Сделки",
      icon: ShoppingBag,
      badge: activeDealsCount > 0 ? activeDealsCount : undefined,
    },
    { href: "/chat", label: "Чат", icon: MessageSquare },
    { href: "/sell", label: "Продать", icon: PlusCircle },
    { href: "/deploy", label: "VPS / FastAPI", icon: Server },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-lg bg-blue-900 text-white font-bold text-sm flex items-center justify-center tracking-tight shadow-xs group-hover:bg-blue-800 transition">
              PL
            </span>
            <div className="leading-tight">
              <div className="font-bold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
                PayLoot
                <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-900 border border-blue-100">
                  <ShieldCheck className="w-3 h-3" />
                  ГАРАНТ
                </span>
              </div>
              <div className="text-[11px] text-slate-500 hidden sm:block">
                Биржа игровых ценностей
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition ${
                    active
                      ? "bg-slate-100 text-blue-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[11px] leading-none font-mono font-bold rounded-full bg-blue-900 text-white">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Balance / Auth Actions */}
        <div className="flex items-center gap-2.5">
          {loadingUser ? (
            <div className="h-9 w-36 rounded-lg bg-slate-100 animate-pulse" />
          ) : user ? (
            <>
              <button
                type="button"
                onClick={openWalletModal}
                title="Пополнить баланс и посмотреть историю операций"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-blue-900" />
                <span className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                  {formatRub(user.balance)}
                </span>
                <span className="w-5 h-5 rounded bg-blue-900 text-white flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </button>

              <Link
                href={`/users/${encodeURIComponent(user.username)}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-blue-900/10 text-blue-900 font-bold text-xs flex items-center justify-center border border-blue-900/20">
                    {user.avatar || user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                    title="В сети"
                  />
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-xs font-bold text-slate-900">
                    {user.username}
                  </div>
                  <div className="text-[11px] text-slate-500">Мой профиль</div>
                </div>
              </Link>

              <button
                type="button"
                onClick={logout}
                title="Выйти из аккаунта"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-3.5 py-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-sm font-medium transition cursor-pointer"
              >
                Войти
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold transition cursor-pointer"
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-1 overflow-x-auto bg-slate-50/60">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                active
                  ? "bg-blue-900 text-white"
                  : "text-slate-600 hover:bg-slate-200/60"
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1 rounded-full bg-white/20 text-[10px] font-mono">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
