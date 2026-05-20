import { apiFetch } from "./fetchApi";
import { isApiEnabled } from "./config";

export type RoomPlayer = {
  userId: string;
  joinedAt: string;
  slotId?: string;
  /** Участник текущей партии; false — очередь ожидания. */
  inMatch?: boolean;
  /** Готов к следующей партии. */
  ready?: boolean;
  /** Подключился во время активной партии. */
  joinedDuringMatch?: boolean;
};

export type RoomGameSnapshot = {
  mapId: string;
  cells: { ownerId?: string; units?: number }[];
};

export type RoomStatus = "lobby" | "matchmaking" | "playing";

export type Room = {
  code: string;
  hostUserId: string;
  mapId: string;
  randomMapOnStart: boolean;
  status: RoomStatus;
  players: RoomPlayer[];
  maxPlayers: number;
  createdAt: string;
  startedAt?: string;
  game?: RoomGameSnapshot;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function isRoomApiEnabled(): boolean {
  return isApiEnabled();
}

export async function createRoom(
  hostUserId: string,
  mapId?: string,
  randomMapOnStart = true
): Promise<Room> {
  return parseJson(
    await apiFetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostUserId, mapId, randomMapOnStart }),
    })
  );
}

export type PatchRoomSettingsBody = {
  randomMapOnStart?: boolean;
  mapId?: string;
};

export async function patchRoomSettings(
  code: string,
  hostUserId: string,
  patch: PatchRoomSettingsBody
): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostUserId, ...patch }),
    })
  );
}

export async function openMatchmaking(
  code: string,
  hostUserId: string
): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostUserId }),
    })
  );
}

export async function setRoomReady(
  code: string,
  userId: string,
  ready: boolean
): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ready }),
    })
  );
}

export async function fetchRoom(code: string): Promise<Room | null> {
  const res = await apiFetch(`/api/rooms/${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  return parseJson<Room>(res);
}

export async function joinRoom(code: string, userId: string): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
  );
}

export async function startRoom(code: string, hostUserId: string): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostUserId }),
    })
  );
}

export type EndRoundOptions = {
  mapId?: string;
  randomMapOnStart?: boolean;
};

/** Завершить партию и перейти в подбор (без старта карты). */
export async function endRoundToMatchmaking(
  code: string,
  hostUserId: string,
  options?: EndRoundOptions
): Promise<Room> {
  return parseJson(
    await apiFetch(`/api/rooms/${encodeURIComponent(code)}/end-round`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostUserId,
        ...(options?.mapId ? { mapId: options.mapId } : {}),
        ...(options?.randomMapOnStart !== undefined
          ? { randomMapOnStart: options.randomMapOnStart }
          : {}),
      }),
    })
  );
}

/** @deprecated используйте endRoundToMatchmaking */
export const restartRoom = endRoundToMatchmaking;
export type RestartRoomOptions = EndRoundOptions;
