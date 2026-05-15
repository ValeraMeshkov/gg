import { Hono } from "hono";
import { cors } from "hono/cors";
import { randomUUID } from "node:crypto";
import {
  createUser,
  getProfile,
  updateProfile,
  userExists,
} from "./db.js";
import { profilePatchSchema } from "./validation.js";

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
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

  /** Анонимный пользователь (id хранится в браузере). */
  app.post("/api/users", async (c) => {
    const userId = randomUUID();
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

  return app;
}
