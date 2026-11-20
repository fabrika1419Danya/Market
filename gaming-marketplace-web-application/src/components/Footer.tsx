import Link from "next/link";
import { ShieldCheck, Zap, Lock, Server } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 text-xs text-slate-600">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 mb-0.5">
                Безопасная сделка (Эскроу)
              </div>
              Продавец получает средства только после того, как покупатель
              проверит товар и подтвердит выполнение заказа.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 mb-0.5">
                Мгновенная автовыдача 24/7
              </div>
              Лоты со значком автовыдачи доставляют данные аккаунта или цифровой
              ключ сразу после оплаты без ожидания продавца.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-900 mb-0.5">
                Честный рейтинг и арбитраж
              </div>
              Оставить отзыв можно только по реально оплаченному и завершённому
              заказу. В спорных ситуациях работает возврат гаранта.
            </div>
          </div>
        </div>

        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © 2026 PayLoot — Биржа игровых ценностей и аккаунтов. Все расчёты в
            рублях (₽).
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-900 transition">
              Каталог игр
            </Link>
            <Link href="/orders" className="hover:text-slate-900 transition">
              Мои сделки
            </Link>
            <Link
              href="/deploy"
              className="inline-flex items-center gap-1 text-blue-900 font-medium hover:underline"
            >
              <Server className="w-3.5 h-3.5" />
              Архитектура и деплой на VPS (FastAPI + SQLAlchemy)
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
