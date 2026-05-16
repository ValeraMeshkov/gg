import type { BuildingSkinId, FighterSkinId } from "../game/appearance";
import { apiUrl, isApiEnabled } from "./config";

export type RemoteUserProfile = {
  userId: string;
  /** Пустая строка — показываем «Игрок N» по слоту. */
  displayName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  createdAt: string;
  updatedAt: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function ensureRemoteUser(userId: string): Promise<string> {
  if (!isApiEnabled()) return userId;

  const profileRes = await fetch(apiUrl(`/api/users/${userId}/profile`));
  if (profileRes.ok) return userId;

  if (profileRes.status !== 404) {
    throw new Error(await profileRes.text());
  }

  const created = await parseJson<RemoteUserProfile>(
    await fetch(apiUrl("/api/users"), {
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

  const res = await fetch(apiUrl(`/api/users/${userId}/profile`));
  if (res.status === 404) return null;
  return parseJson<RemoteUserProfile>(res);
}

export async function saveRemoteProfile(
  userId: string,
  patch: {
    fighter?: FighterSkinId;
    building?: BuildingSkinId;
    displayName?: string;
  }
): Promise<RemoteUserProfile | null> {
  if (!isApiEnabled()) return null;

  const res = await fetch(apiUrl(`/api/users/${userId}/profile`), {
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
