# game-server

API для сохранения профиля игрока (скины бойцов/зданий, настройки).

## GitHub Pages

**GitHub Pages отдаёт только статику** — этот сервер нужно задеплоить отдельно (Render, Railway, Fly.io, VPS).

1. Задеплойте `server/` (команда `npm run build && npm start`, порт из `PORT`).
2. Укажите переменные:
   - `CORS_ORIGINS` — URL фронта, например `https://username.github.io`
   - `DATA_DIR` — каталог с `profiles.json` (постоянный том на хостинге)
3. Соберите фронт с `VITE_API_BASE_URL=https://ваш-api.example.com`

## Локально

```bash
# терминал 1
npm run dev:server

# терминал 2 (игра на http://localhost:5174 — порт 5173 часто занят другим проектом)
npm run dev
```

Проверка: `curl http://localhost:3001/api/health`

**Панель пользователей (удобнее, чем JSON):** откройте в браузере  
http://localhost:3001/admin — таблица всех юзеров и скинов, автообновление каждые 5 с.

Файл на диске: `server/data/profiles.json` (можно править в Cursor).

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка |
| POST | `/api/users` | Создать пользователя (`{ "userId": "uuid из localStorage" }`, опционально) |
| GET | `/api/users/:userId/profile` | Прочитать профиль |
| PUT | `/api/users/:userId/profile` | Обновить `{ appearances?, preferences? }` |

Профиль пользователя: `{ "userId", "fighter", "building", "createdAt", "updatedAt" }`.
