const USER_ID_KEY = "game-user-id-v1";

/** Стабильный анонимный id браузера для API профиля. */
export function getOrCreateUserId(): string {
  try {
    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
    return id;
  } catch {
    return "local-fallback-user";
  }
}

export function setUserId(id: string): void {
  try {
    localStorage.setItem(USER_ID_KEY, id);
  } catch {
    /* ignore */
  }
}
