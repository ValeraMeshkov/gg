import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import {
  authErrorRedirect,
  authSuccessRedirect,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  isAuthConfigured,
  readAuthUserId,
  setSessionCookie,
  signOAuthState,
  signSessionToken,
  userIdFromGoogleSub,
  verifyOAuthState,
} from "./auth.js";
import { renderAdminPage } from "./adminPage.js";
import {
  createUser,
  ensureGoogleUser,
  getProfile,
  listProfiles,
  storePath,
  updateProfile,
  userExists,
} from "./db.js";
import { ensureGameForRoom } from "./gameState.js";
import { clearCellUpdateQueue } from "./cellUpdateQueue.js";
import { clearRoomCombat } from "./roomAttack.js";
import {
  broadcastGameReset,
  broadcastRoomSettings,
  broadcastRoomStatus,
  clearRoomChatHistory,
  countRoomOnlineClients,
} from "./wsHub.js";
import {
  createRoom,
  getRoom,
  listRooms,
  repairStuckPlayingRoom,
  joinRoom,
  openMatchmaking,
  patchRoomSettings,
  endRoundToMatchmaking,
  setPlayerReady,
  startRoom,
} from "./rooms.js";
import {
  createRoomBodySchema,
  createUserBodySchema,
  endRoundBodySchema,
  joinRoomBodySchema,
  patchRoomBodySchema,
  profilePatchSchema,
  readyRoomBodySchema,
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
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      maxAge: 86400,
    })
  );

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      service: "game-server",
      time: new Date().toISOString(),
      auth: isAuthConfigured(),
    })
  );

  app.get("/api/auth/session", async (c) => {
    if (!isAuthConfigured()) {
      return c.json({ user: null, authEnabled: false });
    }
    const userId = await readAuthUserId(c);
    if (!userId) {
      return c.json({ user: null, authEnabled: true });
    }
    const profile = getProfile(userId);
    if (!profile) {
      return c.json({ user: null, authEnabled: true });
    }
    return c.json({ user: profile, authEnabled: true });
  });

  app.get("/api/auth/google", async (c) => {
    if (!isAuthConfigured()) {
      return c.json({ error: "Google OAuth не настроен на сервере" }, 503);
    }
    const linkUserId = c.req.query("linkUserId")?.trim() || undefined;
    const returnTo = c.req.query("returnTo")?.trim() || undefined;
    const state = await signOAuthState({ linkUserId, returnTo });
    return c.redirect(buildGoogleAuthUrl(state), 302);
  });

  app.get("/api/auth/google/callback", async (c) => {
    if (!isAuthConfigured()) {
      return c.redirect(authErrorRedirect("not_configured"), 302);
    }

    const err = c.req.query("error");
    if (err) {
      return c.redirect(authErrorRedirect(err), 302);
    }

    const code = c.req.query("code");
    const stateRaw = c.req.query("state");
    if (!code || !stateRaw) {
      return c.redirect(authErrorRedirect("missing_code"), 302);
    }

    const state = await verifyOAuthState(stateRaw);
    if (!state) {
      return c.redirect(authErrorRedirect("invalid_state"), 302);
    }

    const tokenResult = await exchangeGoogleCode(code);
    if ("error" in tokenResult) {
      return c.redirect(authErrorRedirect(tokenResult.error), 302);
    }

    const info = await fetchGoogleUserInfo(tokenResult.accessToken);
    if (!info?.sub) {
      return c.redirect(authErrorRedirect("no_userinfo"), 302);
    }

    const canonicalUserId = userIdFromGoogleSub(info.sub);
    const profile = ensureGoogleUser(
      info.sub,
      info.email ?? "",
      canonicalUserId,
      state.linkUserId
    );

    const sessionToken = await signSessionToken(
      profile.userId,
      profile.email
    );
    setSessionCookie(c, sessionToken);

    return c.redirect(authSuccessRedirect(state.returnTo), 302);
  });

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

    if (isAuthConfigured()) {
      const authUserId = await readAuthUserId(c);
      if (!authUserId || authUserId !== userId) {
        return c.json({ error: "Требуется вход через Google" }, 401);
      }
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

  /** Сохранение своего профиля (cookie-сессия). */
  app.put("/api/me/profile", async (c) => {
    if (!isAuthConfigured()) {
      return c.json({ error: "Авторизация не настроена" }, 503);
    }
    const authUserId = await readAuthUserId(c);
    if (!authUserId) {
      return c.json({ error: "Не авторизован" }, 401);
    }
    if (!userExists(authUserId)) {
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

    const updated = updateProfile(authUserId, parsed.data);
    return c.json(updated);
  });

  /** Список активных комнат (код, статус, игроки, онлайн по WS). */
  app.get("/api/rooms", (c) => {
    const rooms = listRooms().map((entry) => ({
      ...entry,
      onlineCount: countRoomOnlineClients(entry.code),
    }));
    rooms.sort((a, b) => {
      if (b.onlineCount !== a.onlineCount) return b.onlineCount - a.onlineCount;
      if (b.playerCount !== a.playerCount) return b.playerCount - a.playerCount;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return c.json(rooms);
  });

  /** Создать комнату (2–10 игроков). */
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
    const room = createRoom(
      parsed.data.hostUserId,
      parsed.data.mapId,
      parsed.data.maxPlayers,
      parsed.data.randomMapOnStart ?? true
    );
    return c.json(room, 201);
  });

  app.patch("/api/rooms/:code", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = patchRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = patchRoomSettings(
      c.req.param("code"),
      parsed.data.hostUserId,
      {
        randomMapOnStart: parsed.data.randomMapOnStart,
        mapId: parsed.data.mapId,
      }
    );
    if (!room) {
      return c.json(
        { error: "Нельзя менять настройки (нужен хост и нет активной партии)" },
        403
      );
    }
    if (parsed.data.randomMapOnStart !== undefined) {
      broadcastRoomSettings(room.code, room.randomMapOnStart);
    }
    broadcastRoomStatus(room);
    return c.json(room);
  });

  app.get("/api/rooms/:code", (c) => {
    const raw = getRoom(c.req.param("code"));
    if (!raw) return c.json({ error: "Комната не найдена" }, 404);
    const { room, repaired } = repairStuckPlayingRoom(raw);
    if (repaired) broadcastRoomStatus(room);
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
    const result = joinRoom(c.req.param("code"), parsed.data.userId);
    if (!result) {
      return c.json(
        { error: "Комната недоступна (нет места или комната закрыта)" },
        409
      );
    }
    if (result.playerAdded) {
      broadcastRoomStatus(result.room);
    }
    return c.json(result.room);
  });

  app.post("/api/rooms/:code/search", async (c) => {
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
    const room = openMatchmaking(
      c.req.param("code"),
      parsed.data.hostUserId
    );
    if (!room) {
      return c.json(
        { error: "Только хост может открыть подбор (комната не в лобби)" },
        403
      );
    }
    broadcastRoomStatus(room);
    return c.json(room);
  });

  app.post("/api/rooms/:code/ready", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = readyRoomBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const room = setPlayerReady(
      c.req.param("code"),
      parsed.data.userId,
      parsed.data.ready
    );
    if (!room) {
      return c.json(
        { error: "Готовность можно менять только в режиме подбора" },
        409
      );
    }
    broadcastRoomStatus(room);
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
        { error: "Нельзя начать (нужен хост и минимум 2 готовых)" },
        409
      );
    }
    const game = ensureGameForRoom(room);
    if (game) {
      broadcastGameReset(room.code, game, room, { countdown: true });
    }
    broadcastRoomStatus(room);
    return c.json(room);
  });

  const handleEndRound = async (c: Context) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Некорректный JSON" }, 400);
    }
    const parsed = endRoundBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Ошибка валидации", details: parsed.error.flatten() },
        400
      );
    }
    const code = c.req.param("code");
    if (!code) {
      return c.json({ error: "Код комнаты не указан" }, 400);
    }
    const room = endRoundToMatchmaking(
      code,
      parsed.data.hostUserId,
      {
        mapId: parsed.data.mapId,
        randomMapOnStart: parsed.data.randomMapOnStart,
      }
    );
    if (!room) {
      return c.json(
        { error: "Завершить партию может только хост во время игры" },
        403
      );
    }
    clearRoomCombat(room.code);
    clearCellUpdateQueue(room.code);
    clearRoomChatHistory(room.code);
    if (parsed.data.randomMapOnStart !== undefined) {
      broadcastRoomSettings(room.code, room.randomMapOnStart);
    }
    broadcastRoomStatus(room);
    return c.json(room);
  };

  /** Хост: завершить партию → подбор (game_reset только после «Играть»). */
  app.post("/api/rooms/:code/end-round", handleEndRound);
  /** Совместимость со старым клиентом. */
  app.post("/api/rooms/:code/restart", handleEndRound);

  return app;
}
