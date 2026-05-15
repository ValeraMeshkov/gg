import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import { renderAdminPage } from "./adminPage.js";
import {
  createUser,
  getProfile,
  listProfiles,
  storePath,
  updateProfile,
  userExists,
} from "./db.js";
import { ensureGameForRoom } from "./gameState.js";
import { clearCellUpdateQueue } from "./cellUpdateQueue.js";
import { clearRoomCombat } from "./roomAttack.js";
import { broadcastGameReset } from "./wsHub.js";
import { createRoom, getRoom, joinRoom, restartRoom, startRoom } from "./rooms.js";
import {
  createRoomBodySchema,
  createUserBodySchema,
  joinRoomBodySchema,
  profilePatchSchema,
  restartRoomBodySchema,
  startRoomBodySchema,
} from "./validation.js";

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://localhost:5177",
    "http://127.0.0.1:5177",
  ];
}

export function createApp() {
  const app = new Hono();

  app.use(
    "/*",
    cors({
      origin: parseCorsOrigins(),
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 86400,
    })
  );

  app.get("/api/health", (c) =>
    c.json({ ok: true, service: "game-server", time: new Date().toISOString() })
  );

  /** Панель для просмотра пользователей и скинов (локальная разработка). */
  app.get("/admin", (c) => {
    const profiles = listProfiles();
    return c.html(renderAdminPage(profiles, storePath));
  });

  app.get("/api/users", (c) => {
    const profiles = listProfiles();
    return c.json({
      count: profiles.length,
      users: profiles,
    });
  });

  /**
   * Анонимный пользователь: id из тела (localStorage браузера) или новый uuid.
   * Повторный POST с тем же userId — тот же профиль (200).
   */
  app.post("/api/users", async (c) => {
    let body: unknown = {};
    try {
      body = await c.req.json();
    } catch {
      /* пустое тело — сгенерируем id */
    }

    const parsed = createUserBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }

    const userId = parsed.data.userId ?? randomUUID();
    const existing = getProfile(userId);
    if (existing) {
      return c.json(existing, 200);
    }

    const profile = createUser(userId);
    return c.json(profile, 201);
  });

  app.get("/api/users/:userId/profile", (c) => {
    const userId = c.req.param("userId");
    const profile = getProfile(userId);
    if (!profile) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }
    return c.json(profile);
  });

  app.put("/api/users/:userId/profile", async (c) => {
    const userId = c.req.param("userId");
    if (!userExists(userId)) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }

    const parsed = profilePatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }

    const updated = updateProfile(userId, parsed.data);
    return c.json(updated);
  });

  /** Создать комнату на 2 игроков. */
  app.post("/api/rooms", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = createRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = createRoom(parsed.data.hostUserId, parsed.data.mapId);
    return c.json(room, 201);
  });

  app.get("/api/rooms/:code", (c) => {
    const room = getRoom(c.req.param("code"));
    if (!room) return c.json({ error: "Комната не найдена" }, 404);
    const game = ensureGameForRoom(room);
    if (game) {
      return c.json({
        ...room,
        game: { mapId: game.mapId, cells: game.cells },
      });
    }
    return c.json(room);
  });

  app.post("/api/rooms/:code/join", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = joinRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = joinRoom(c.req.param("code"), parsed.data.userId);
    if (!room) {
      return c.json(
        { error: "Комната недоступна (нет места или уже началась)" },
        409
      );
    }
    return c.json(room);
  });

  app.post("/api/rooms/:code/start", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = startRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = startRoom(c.req.param("code"), parsed.data.hostUserId);
    if (!room) {
      return c.json(
        { error: "Нельзя начать (нужен хост и 2 игрока)" },
        409
      );
    }
    return c.json(room);
  });

  /** Хост: новая партия на той же карте (оба клиента получают game_reset по WS). */
  app.post("/api/rooms/:code/restart", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = restartRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = restartRoom(c.req.param("code"), parsed.data.hostUserId);
    if (!room) {
      return c.json(
        { error: "Только хост может начать новую игру в активной комнате" },
        403
      );
    }
    clearRoomCombat(room.code);
    clearCellUpdateQueue(room.code);
    const game = ensureGameForRoom(room);
    if (game) {
      broadcastGameReset(room.code, game, room);
    }
    return c.json({
      ...room,
      game: game
        ? { mapId: game.mapId, cells: game.cells }
        : undefined,
    });
  });

  return app;
}
