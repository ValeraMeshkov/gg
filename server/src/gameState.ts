import { CELL } from "@/shared/constants.js";
import { cloneCombatCells } from "@/shared/cellUnits.js";
import {
  addPlayerSpawnToCells,
  createRoomSession,
} from "@/shared/createRoomSession.js";
import { initFortressCellIfOwner } from "@/shared/fortressShield.js";
import { playableIndices } from "@/shared/mapPlayable.js";
import { hasSkeletonSpawn } from "@/shared/buildingMechanics.js";
import { grantExtraStartTerritories } from "@/shared/extraStartTerritories.js";
import { spawnSecondSkeletonAtStart } from "@/shared/skeletonSpawn.js";
import { seededRandom } from "@/shared/seededRandom.js";
import type { SyncCell } from "@/shared/wsProtocol.js";
import { buildingForSlot } from "./roomBuilding.js";
import { matchParticipantSlotIds } from "@/shared/roomRoster.js";
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

function cellsWithExtraStarts(room: Room, cells: SyncCell[]): SyncCell[] {
  const playable = playableIndices(room.mapId);
  const seed = gameSeed(room);
  let current = cells;
  for (const player of room.players) {
    const slotId = player.slotId;
    if (!slotId) continue;
    const building = buildingForSlot(room, slotId);
    const rng = seededRandom(`${seed}:extra:${slotId}`);
    const next = grantExtraStartTerritories(
      current,
      playable,
      slotId,
      building,
      rng
    );
    if (next) current = next;
  }
  return current;
}

function cellsWithSkeletonStarts(room: Room, cells: SyncCell[]): SyncCell[] {
  const playable = playableIndices(room.mapId);
  const seed = gameSeed(room);
  let current = cells;
  for (const player of room.players) {
    const slotId = player.slotId;
    const building = buildingForSlot(room, slotId);
    if (!slotId || !hasSkeletonSpawn(building)) {
      continue;
    }
    const rng = seededRandom(`${seed}:skeleton:${slotId}`);
    const next = spawnSecondSkeletonAtStart(
      current,
      playable,
      slotId,
      building,
      rng
    );
    if (next) current = next;
  }
  return current;
}

function cellsWithFortressShields(
  room: Room,
  cells: SyncCell[]
): SyncCell[] {
  return cells.map((cell) =>
    initFortressCellIfOwner(cell, buildingForSlot(room, cell.ownerId))
  );
}

export function initGameForRoom(room: Room): RoomGameState {
  const slotIds = matchParticipantSlotIds(
    room.players.map((p) => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
      slotId: p.slotId,
      inMatch: p.inMatch !== false,
    }))
  );
  const state: RoomGameState = {
    mapId: room.mapId,
    cells: cellsWithFortressShields(
      room,
      cellsWithSkeletonStarts(
        room,
        cellsWithExtraStarts(
          room,
          createRoomSession(room.mapId, slotIds, gameSeed(room))
        )
      )
    ),
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
  const spawned = addPlayerSpawnToCells(
    g.mapId,
    g.cells,
    slotId,
    gameSeed(room)
  );
  g.cells = cellsWithFortressShields(room, spawned);
  return g;
}

export function cloneCells(cells: readonly SyncCell[]): SyncCell[] {
  return cloneCombatCells(cells);
}

export function listActiveGames(): { code: string; state: RoomGameState }[] {
  return [...games.entries()].map(([code, state]) => ({ code, state }));
}

export function deleteGameForRoom(code: string): void {
  games.delete(code.toUpperCase());
}
