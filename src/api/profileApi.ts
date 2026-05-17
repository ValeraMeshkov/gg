import type { DisplayColorId } from "@/game/appearance";
import type { BuildingSkinId, FighterSkinId } from "@/game/appearance";
import { apiFetch } from "./fetchApi";
import { isApiEnabled } from "./config";

export type RemoteUserProfile = {
  userId: string;
  /** Пустая строка — показываем «Игрок N» по слоту. */
  displayName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor?: DisplayColorId;
  offlineBotCount?: number;
  offlineBotDifficulty?: number;
  randomMapOnStart?: boolean;
  email?: string;
  googleLinked?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProfilePatch = Partial<{
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayName: string;
  displayColor: DisplayColorId;
  offlineBotCount: number;
  offlineBotDifficulty: number;
  randomMapOnStart: boolean;
}>;

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function ensureRemoteUser(userId: string): Promise<string> {
  if (!isApiEnabled()) return userId;

  const profileRes = await apiFetch(`/api/users/${userId}/profile`);
  if (profileRes.ok) return userId;

  if (profileRes.status !== 404) {
    throw new Error(await profileRes.text());
  }

  const created = await parseJson<RemoteUserProfile>(
    await apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
  );
  return created.userId;
}

export async function fetchRemoteProfile(
  userId: string
): Promise<RemoteUserProfile | null> {
  if (!isApiEnabled()) return null;

  const res = await apiFetch(`/api/users/${userId}/profile`);
  if (res.status === 404) return null;
  return parseJson<RemoteUserProfile>(res);
}

export async function saveRemoteProfile(
  userId: string,
  patch: ProfilePatch
): Promise<RemoteUserProfile | null> {
  if (!isApiEnabled()) return null;

  const res = await apiFetch(`/api/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJson<RemoteUserProfile>(res);
}

/** Сохранение для вошедшего через Google (cookie). */
export async function saveMyRemoteProfile(
  patch: ProfilePatch
): Promise<RemoteUserProfile | null> {
  if (!isApiEnabled()) return null;

  const res = await apiFetch("/api/me/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJson<RemoteUserProfile>(res);
}

export type AppearancePatch = Partial<{
  fighter: FighterSkinId;
  building: BuildingSkinId;
}>;
