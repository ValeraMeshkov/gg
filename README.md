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

## GitHub Pages

Фронт — статика из `dist/`. Бэкенд деплоится отдельно; см. `server/README.md` и `.env.example`.

Для Pages из репозитория `gg` укажите в `vite.config.ts` при необходимости `base: '/gg/'`.
