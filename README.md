# Territory

Браузерная игра на карте мира: захват территорий, выбор скинов бойцов и зданий.

## Запуск

```bash
npm install
npm run dev
```

API (опционально):

```bash
npm run dev:server   # localhost:3001
```

Сборка: `npm run build` → папка `dist/`.

## Онлайн с двух компьютеров

**GitHub Pages** — только сайт. **Сервер** (комнаты + WebSocket) — отдельно, например **Render**.

Пошагово: **[DEPLOY.md](./DEPLOY.md)**.

Кратко: задеплойте `server/` → секрет `VITE_API_BASE_URL` в GitHub → push в `main` → игра на `https://valerameshkov.github.io/gg/`.
