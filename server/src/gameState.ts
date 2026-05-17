import { CELL } from "@/shared/constants.js";
import {
  addPlayerSpawnToCells,
  createRoomSession,
} from "@/shared/createRoomSession.js";
import { playableIndices } from "@/shared/mapPlayable.js";
import type { SyncCell } from "@/shared/wsProtocol.js";
import type { Room } from "./rooms.js";

export type RoomGameState = {
  mapId: string;
  cells: SyncCell[];
};

const games = new Map<string, RoomGameState>();

/**
 * Старые сессии: у нейтрали без поля `units` подставить 20.
 * Ноль после боя не трогаем — иначе захват/реген 0→1→2… ломаются.
 */
function normalizeNeutralCells(mapId: string, cells: SyncCell[]): SyncCell[] {
  const playable = playableIndices(mapId);
  let changed = false;
  const next = cells.map((c) => ({ ...c }));
  for (const i of playable) {
    if (next[i]?.ownerId) continue;
    if (next[i]?.units != null) continue;
    next[i] = { units: CELL.neutralStart };
    changed = true;
  }
  return changed ? next : cells;
}

export function gameSeed(room: Room): string {
  return `${room.code}:${room.gameGeneration ?? 0}`;
}

export function initGameForRoom(room: Room): RoomGameState {
  const slotIds = room.players
    .map((p) => p.slotId)
    .filter((id): id is string => Boolean(id));
  const state: RoomGameState = {
    mapId: room.mapId,
    cells: createRoomSession(room.mapId, slotIds, gameSeed(room)),
  };
  games.set(room.code.toUpperCase(), state);
  return state;
}

/** Текущая партия в комнате (после restart — новый объект состояния). */
export function getGameForRoom(code: string): RoomGameState | null {
  return games.get(code.toUpperCase()) ?? null;
}

export function ensureGameForRoom(room: Room): RoomGameState | null {
  if (room.status !== "playing") return null;
  const key = room.code.toUpperCase();
  let g = games.get(key);
  if (!g) {
    g = initGameForRoom(room);
  } else {
    const normalized = normalizeNeutralCells(g.mapId, g.cells);
    if (normalized !== g.cells) {
      g.cells = normalized;
    }
  }
  return g;
}

export function updateRoomCells(code: string, cells: SyncCell[]): void {
  const g = games.get(code.toUpperCase());
  if (g) g.cells = cells.map((c) => ({ ...c }));
}

/** Второй игрок в уже идущей комнате — своя стартовая клетка на карте. */
export function spawnJoinedPlayerInRoom(
  room: Room,
  slotId: string
): RoomGameState | null {
  const key = room.code.toUpperCase();
  const g = games.get(key);
  if (!g) return null;
  g.cells = addPlayerSpawnToCells(
    g.mapId,
    g.cells,
    slotId,
    gameSeed(room)
  );
  return g;
}

export function cloneCells(cells: readonly SyncCell[]): SyncCell[] {
  return cells.map((c) => ({ ...c }));
}

export function listActiveGames(): { code: string; state: RoomGameState }[] {
  return [...games.entries()].map(([code, state]) => ({ code, state }));
}
