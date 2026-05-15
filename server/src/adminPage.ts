import type { UserProfile } from "./types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAdminPage(profiles: UserProfile[], storePath: string): string {
  const rows =
    profiles.length === 0
      ? `<tr><td colspan="5" class="muted">Пока нет пользователей. Откройте игру и выберите скины.</td></tr>`
      : profiles
          .map(
            (p) => `
        <tr>
          <td><code class="id">${escapeHtml(p.userId)}</code></td>
          <td>${escapeHtml(p.fighter)}</td>
          <td>${escapeHtml(p.building)}</td>
          <td>${escapeHtml(p.updatedAt.slice(0, 19).replace("T", " "))}</td>
          <td><a href="/api/users/${escapeHtml(p.userId)}/profile" target="_blank">JSON</a></td>
        </tr>`
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Territory — пользователи</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f0f2f8;
      color: #1a2740;
    }
    h1 { margin: 0 0 8px; font-size: 1.35rem; }
    .sub { margin: 0 0 20px; color: #5c6478; font-size: 0.9rem; }
    .sub code { font-size: 0.85rem; }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 16px;
    }
    a.btn, button {
      font: inherit;
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(20, 35, 60, 0.15);
      background: #fff;
      color: #2a6bb8;
      text-decoration: none;
      cursor: pointer;
    }
    a.btn.primary { background: #2a6bb8; color: #fff; border-color: #2a6bb8; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 0 1px rgba(20, 35, 60, 0.08);
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(20, 35, 60, 0.06);
      font-size: 0.88rem;
    }
    th { background: #f8f9fc; font-weight: 600; }
    .id { font-size: 0.78rem; word-break: break-all; }
    .muted { color: #8a92a4; }
    .count { font-weight: 600; }
  </style>
</head>
<body>
  <h1>Пользователи игры</h1>
  <p class="sub">
    Всего: <span class="count">${profiles.length}</span>.
    Файл: <code>${escapeHtml(storePath)}</code>
  </p>
  <div class="bar">
    <a class="btn primary" href="/admin">Обновить</a>
    <a class="btn" href="/api/users" target="_blank">Список JSON</a>
    <a class="btn" href="/api/health" target="_blank">Health</a>
    <a class="btn" href="http://localhost:5174" target="_blank">Игра ↗</a>
    <label><input type="checkbox" id="auto" checked /> авто каждые 5 с</label>
  </div>
  <table>
    <thead>
      <tr>
        <th>User ID</th>
        <th>Fighter</th>
        <th>Building</th>
        <th>Обновлён</th>
        <th></th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>
    const box = document.getElementById("auto");
    setInterval(() => {
      if (box && box.checked) location.reload();
    }, 5000);
  </script>
</body>
</html>`;
}
