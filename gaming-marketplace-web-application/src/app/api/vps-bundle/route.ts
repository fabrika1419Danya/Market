import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BUNDLE_FILES = [
  {
    path: "requirements.txt",
    title: "requirements.txt",
    lang: "txt",
    description: "Зависимости Python для FastAPI, SQLAlchemy, PostgreSQL, bcrypt, JWT и WebSockets",
  },
  {
    path: "app/database.py",
    title: "app/database.py",
    lang: "python",
    description: "Подключение SQLAlchemy 2.0 (PostgreSQL / SQLite) и генератор сессий БД",
  },
  {
    path: "app/models.py",
    title: "app/models.py",
    lang: "python",
    description: "Полные ORM-модели: User, Game, Lot, Order, Message, Review со связями и индексами",
  },
  {
    path: "app/schemas.py",
    title: "app/schemas.py",
    lang: "python",
    description: "Pydantic v2 схемы валидации запросов и ответов API",
  },
  {
    path: "app/auth.py",
    title: "app/auth.py",
    lang: "python",
    description: "Регистрация, вход, выход (bcrypt + JWT HS256 в cookie/Bearer) и публичный профиль",
  },
  {
    path: "app/ws_manager.py",
    title: "app/ws_manager.py",
    lang: "python",
    description: "Менеджер живых WebSocket-подключений и трекинга статуса Онлайн",
  },
  {
    path: "app/main.py",
    title: "app/main.py",
    lang: "python",
    description: "FastAPI сервер: каталог, безопасная сделка (эскроу), автовыдача, отзывы и WebSocket-чат",
  },
  {
    path: "static/index.html",
    title: "static/index.html",
    lang: "html",
    description: "Фронтенд на HTML5 + Tailwind CSS CDN + чистый JavaScript + WebSocket",
  },
  {
    path: "Dockerfile",
    title: "Dockerfile",
    lang: "dockerfile",
    description: "Контейнеризация Python 3.12 + Uvicorn для деплоя на любой VPS",
  },
  {
    path: "docker-compose.yml",
    title: "docker-compose.yml",
    lang: "yaml",
    description: "Оркестрация PostgreSQL 16 + FastAPI с healthcheck и постоянным томом данных",
  },
];

export async function GET() {
  try {
    const baseDir = path.join(process.cwd(), "fastapi_vps");
    const items = await Promise.all(
      BUNDLE_FILES.map(async (item) => {
        const fullPath = path.join(baseDir, item.path);
        const content = await fs.readFile(fullPath, "utf-8");
        return {
          ...item,
          content,
        };
      })
    );
    return NextResponse.json({ files: items });
  } catch (error) {
    console.error("VPS bundle read error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить файлы сборки VPS" },
      { status: 500 }
    );
  }
}
