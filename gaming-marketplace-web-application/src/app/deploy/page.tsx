"use client";

import React, { useEffect, useState } from "react";
import {
  Server,
  FolderTree,
  FileCode2,
  Copy,
  Check,
  Terminal,
} from "lucide-react";

interface VpsFileItem {
  path: string;
  title: string;
  lang: string;
  description: string;
  content: string;
}

const PROJECT_TREE = `fastapi_vps/
├── requirements.txt          # Зависимости FastAPI, SQLAlchemy 2.0, bcrypt, JWT, WebSockets
├── Dockerfile                # Сборка образа Python 3.12 + Uvicorn для VPS
├── docker-compose.yml        # PostgreSQL 16 + FastAPI Web-сервер с healthcheck
├── app/
│   ├── __init__.py
│   ├── database.py           # Движок SQLAlchemy (PostgreSQL / SQLite) + get_db()
│   ├── models.py             # Модели: User, Game, Lot, Order, Message, Review
│   ├── schemas.py            # Pydantic v2 схемы запросов и ответов
│   ├── auth.py               # JWT (HS256) + bcrypt хеширование + Публичный профиль
│   ├── ws_manager.py         # Менеджер живых WebSocket-соединений и статуса Онлайн
│   └── main.py               # Роуты каталога, безопасной сделки (эскроу), отзывов и чата
└── static/
    └── index.html            # Светлый фронтенд: HTML5 + Tailwind CDN + чистый JS`;

export default function DeployVpsPage() {
  const [files, setFiles] = useState<VpsFileItem[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>("app/models.py");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/vps-bundle")
      .then((r) => r.json())
      .then((d) => {
        if (d.files) setFiles(d.files);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentFile =
    files.find((f) => f.path === selectedPath) || files[0] || null;

  function copyCurrent() {
    if (!currentFile) return;
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-900 text-xs font-semibold border border-blue-100">
            <Server className="w-3.5 h-3.5" />
            Готовый пакет для деплоя на VPS / Хостинг
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Сборка FastAPI + SQLAlchemy + PostgreSQL/SQLite + WebSockets
          </h1>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Помимо работающей онлайн-биржи в текущем превью (PostgreSQL + JWT +
            bcrypt), в директории{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-slate-900">
              fastapi_vps/
            </code>{" "}
            находится полный автономный исходный код на Python (FastAPI +
            SQLAlchemy + WebSockets + HTML5/Tailwind CDN/JS) для развёртывания на
            любом Linux VPS одной командой.
          </p>
        </div>
      </section>

      {/* Project Tree + Quick VPS Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <FolderTree className="w-4 h-4 text-blue-900" />
            Файловая структура проекта (fastapi_vps/)
          </div>
          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed">
            {PROJECT_TREE}
          </pre>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Terminal className="w-4 h-4 text-blue-900" />
            Быстрый запуск на VPS (Ubuntu / Debian)
          </div>
          <div className="space-y-2.5 text-xs text-slate-600">
            <div>
              <div className="font-semibold text-slate-800 mb-1">
                Вариант 1 — Docker Compose + PostgreSQL 16 (рекомендуется):
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                {`cd fastapi_vps\ndocker compose up -d --build`}
              </pre>
            </div>
            <div>
              <div className="font-semibold text-slate-800 mb-1">
                Вариант 2 — Локально / без Docker (SQLite или PostgreSQL):
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto">
                {`cd fastapi_vps\npython3 -m venv .venv && source .venv/bin/activate\npip install -r requirements.txt\nuvicorn app.main:app --host 0.0.0.0 --port 8000`}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Interactive File Explorer */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* File List */}
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 p-3 space-y-1">
          <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Исходные файлы сборки
          </div>
          {loading ? (
            <div className="p-3 text-xs text-slate-400">Чтение файлов...</div>
          ) : (
            files.map((f) => {
              const active = currentFile?.path === f.path;
              return (
                <button
                  key={f.path}
                  type="button"
                  onClick={() => setSelectedPath(f.path)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition cursor-pointer ${
                    active
                      ? "bg-blue-900 text-white shadow-xs"
                      : "hover:bg-white text-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{f.title}</span>
                  </div>
                  <p
                    className={`text-[11px] mt-1 line-clamp-2 ${
                      active ? "text-blue-100" : "text-slate-500"
                    }`}
                  >
                    {f.description}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        {/* Code Viewer */}
        <div className="md:col-span-8 flex flex-col min-w-0 bg-slate-950 text-slate-100">
          {currentFile ? (
            <>
              <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900">
                <div>
                  <span className="font-mono text-xs font-bold text-white">
                    fastapi_vps/{currentFile.path}
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-400 ml-2">
                    — {currentFile.description}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyCurrent}
                  className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Копировать код
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-auto max-h-[640px]">
                <code>{currentFile.content}</code>
              </pre>
            </>
          ) : (
            <div className="p-8 text-xs text-slate-400">
              Выберите файл слева для просмотра полного исходного кода.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
