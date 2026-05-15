# Онлайн-игра с двух компьютеров

## Коротко: это реально?

**Да.** Но нужны **две части**:

| Часть | Что это | Где жить |
|--------|---------|----------|
| **Фронт** | HTML/JS игра в браузере | **GitHub Pages** (бесплатно) |
| **Сервер** | API комнат + **WebSocket** (синхронизация ходов) | **Render**, Railway, Fly.io, VPS |

**GitHub Pages сам по себе сервером не является** — он только раздаёт файлы. Комнаты, пули и состояние карты обрабатывает ваш `server/` (Node + WebSocket). Два игрока открывают **один и тот же сайт** на Pages, а браузеры подключаются к **одному URL API** в интернете.

```
Компьютер А (Москва)          Компьютер Б (другой город)
       │                              │
       └──────────┬───────────────────┘
                  ▼
     https://valerameshkov.github.io/gg/   ← игра (Pages)
                  │
                  ▼
     https://ваш-сервер.onrender.com       ← API + WS (Render)
```

---

## Шаг 1. Сервер на Render (бесплатный тариф)

1. Зарегистрируйтесь на [render.com](https://render.com).
2. **New → Blueprint** (или Web Service) и подключите репозиторий `gg`.
3. Используйте `render.yaml` из корня репо (папка `server/`, команды уже прописаны).
4. В переменных окружения задайте:
   - **`CORS_ORIGINS`** = `https://valerameshkov.github.io`  
     (без `/gg` в конце — так работает CORS)
5. Дождитесь деплоя и скопируйте URL, например:  
   `https://gg-game-server.onrender.com`
6. Проверка в браузере: `https://….onrender.com/api/health` → `{"ok":true,...}`

На бесплатном Render сервис «засыпает» после простоя; первый запрос может идти 30–60 с — это нормально для тестов.

---

## Шаг 2. GitHub Pages (фронт)

1. **Settings → Pages → Build and deployment**:
   - **Source:** Deploy from a branch
   - **Branch:** `gh-pages` → `/ (root)` → Save  
   (ветку создаст workflow при первом успешном запуске)
2. **Settings → Secrets and variables → Actions → New repository secret**:
   - Имя: `VITE_API_BASE_URL`
   - Значение: `https://gg-game-server.onrender.com` (ваш URL с шага 1, **без** слэша в конце)
   
   Либо без секрета: в репозитории отредактируйте `public/api-config.json`:
   ```json
   { "apiBaseUrl": "https://ваш-сервер.onrender.com" }
   ```
3. **Actions** → Re-run workflow (или push в `main`), подождите 1–2 мин.
4. Игра: **https://valerameshkov.github.io/gg/**

Если видите «There isn't a GitHub Pages site here» — Pages ещё не включены (п.1) или workflow не отработал.

Локальная проверка production-сборки:

```bash
VITE_BASE_PATH=/gg/ VITE_API_BASE_URL=https://ваш-сервер.onrender.com npm run build
npm run preview
```

---

## Шаг 3. Игра вдвоём

1. Игрок 1: открывает `https://valerameshkov.github.io/gg/room` → **Создать комнату**.
2. Копирует ссылку вида `…/gg/room/ABCD` и отправляет другу (Telegram, почта — что угодно).
3. Игрок 2: открывает ссылку на **своём** компьютере → **Начать** (когда оба в лобби, жмёт хост).
4. Оба играют; ходы идут через WebSocket на Render.

---

## Локальная разработка (как сейчас)

```bash
# Терминал 1
npm run dev:server

# Терминал 2
npm run dev
```

Два браузера на `localhost:5174` — прокси Vite сам шлёт `/api` и `/ws` на `:3001`.

---

## Другие варианты сервера

- **Railway / Fly.io** — тоже Node, нужны `PORT`, `CORS_ORIGINS`, сборка `server/`.
- **Свой VPS** — `npm run build:server && npm start`, nginx как reverse proxy, SSL (Let's Encrypt).
- **Только Pages без сервера** — онлайн-мультиплеер **не получится** (нет WebSocket).

---

## Частые проблемы

| Симптом | Причина |
|---------|---------|
| «Сервер не настроен» на Pages | Не задан секрет `VITE_API_BASE_URL` или не пересобрали Actions |
| CORS error в консоли | В `CORS_ORIGINS` нет точного origin `https://valerameshkov.github.io` |
| WebSocket не подключается | Неверный `VITE_API_BASE_URL` (должен быть `https://`, не `ws://` — клиент сам сделает `wss://`) |
| 404 на `/gg/room` | Pages не включены или `VITE_BASE_PATH` не `/gg/` |

Подробности API: `server/README.md`.
