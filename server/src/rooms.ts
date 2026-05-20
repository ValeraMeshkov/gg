import { randomBytes } from "node:crypto";
import { isValidMapId, pickRandomMapId } from "@/shared/mapPlayable.js";
import { MIN_ROOM_PLAYERS } from "@/shared/playerSlots.js";
import {
  normalizeMaxPlayers,
  playerSlotId,
  PLAYER_SLOT_IDS,
} from "@/shared/playerSlots.js";
import { canPlayerSetReady } from "./roomAccess.js";
import { deleteGameForRoom, initGameForRoom } from "./gameState.js";

const DEFAULT_MAP_ID = "world-large";

export type RoomStatus = "lobby" | "matchmaking" | "playing";

export type RoomPlayer = {
  userId: string;
  joinedAt: string;
  slotId?: string;
  /** Участник текущей партии на карте; false — очередь ожидания. */
  inMatch?: boolean;
  /** Готов к следующей партии (режим подбора). */
  ready?: boolean;
  /** Зашёл во время активной партии — очередь до следующего старта. */
  joinedDuringMatch?: boolean;
};

export type Room = {
  code: string;
  hostUserId: string;
  mapId: string;
  /** Случайная карта при «Новая игра» (по умолчанию включено). */
  randomMapOnStart: boolean;
  status: RoomStatus;
  players: RoomPlayer[];
  maxPlayers: number;
  createdAt: string;
  startedAt?: string;
  gameGeneration?: number;
};

export type JoinRoomResult = {
  room: Room;
  playerAdded: boolean;
};

const rooms = new Map<string, Room>();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    const bytes = randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Не удалось сгенерировать код комнаты");
}

function resetReadyFlags(room: Room): void {
  for (const p of room.players) {
    p.ready = false;
  }
}

/** Хост не жмёт «Готов» в UI — считаем готовым в фазе подбора. */
function ensureHostReadyInMatchmaking(room: Room): void {
  if (room.status !== "matchmaking") return;
  const host = room.players.find((p) => p.userId === room.hostUserId);
  if (host) host.ready = true;
}

function clearSlotsForNonParticipants(room: Room): void {
  for (const p of room.players) {
    if (p.inMatch === false) {
      delete p.slotId;
    }
  }
}

export function createRoom(
  hostUserId: string,
  mapId?: string,
  maxPlayers?: number,
  randomMapOnStart = true
): Room {
  const cap = normalizeMaxPlayers(maxPlayers);
  const code = generateRoomCode();
  const now = new Date().toISOString();
  const room: Room = {
    code,
    hostUserId,
    mapId: mapId ?? DEFAULT_MAP_ID,
    randomMapOnStart,
    status: "lobby",
    maxPlayers: cap,
    createdAt: now,
    players: [
      {
        userId: hostUserId,
        joinedAt: now,
        inMatch: false,
        ready: false,
      },
    ],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | null {
  const key = code.toUpperCase();
  return rooms.get(key) ?? null;
}

export function joinRoom(code: string, userId: string): JoinRoomResult | null {
  const room = getRoom(code);
  if (!room) return null;

  if (room.players.some((p) => p.userId === userId)) {
    return { room, playerAdded: false };
  }

  if (room.players.length >= room.maxPlayers) {
    return null;
  }

  const now = new Date().toISOString();

  if (room.status === "lobby" || room.status === "matchmaking") {
    room.players.push({
      userId,
      joinedAt: now,
      inMatch: false,
      ready: false,
    });
    return { room, playerAdded: true };
  }

  if (room.status === "playing") {
    room.players.push({
      userId,
      joinedAt: now,
      inMatch: false,
      ready: false,
      joinedDuringMatch: true,
    });
    return { room, playerAdded: true };
  }

  return null;
}

/** Хост открывает подбор игроков (лобби → matchmaking). */
export function openMatchmaking(
  code: string,
  hostUserId: string
): Room | null {
  const room = getRoom(code);
  if (!room || room.hostUserId !== hostUserId) return null;
  if (room.status === "playing") return null;
  room.status = "matchmaking";
  resetReadyFlags(room);
  ensureHostReadyInMatchmaking(room);
  return room;
}

export function setPlayerReady(
  code: string,
  userId: string,
  ready: boolean
): Room | null {
  const room = getRoom(code);
  if (!room || !canPlayerSetReady(room, userId)) return null;
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return null;
  player.ready = ready;
  return room;
}

export function startRoom(code: string, hostUserId: string): Room | null {
  const room = getRoom(code);
  if (!room || room.hostUserId !== hostUserId) return null;
  if (room.status !== "matchmaking") return null;

  const readyPlayers = room.players.filter((p) => p.ready === true);
  if (readyPlayers.length < MIN_ROOM_PLAYERS) return null;

  let slotIndex = 0;
  for (const p of room.players) {
    if (p.ready === true) {
      p.slotId = playerSlotId(slotIndex++);
      p.inMatch = true;
      p.ready = false;
    } else {
      p.inMatch = false;
      delete p.slotId;
    }
  }

  room.status = "playing";
  room.startedAt = new Date().toISOString();
  room.gameGeneration = (room.gameGeneration ?? 0) + 1;
  initGameForRoom(room);
  return room;
}

export type RestartRoomOpts = {
  mapId?: string;
  randomMapOnStart?: boolean;
};

/** Завершить партию и открыть подбор (без мгновенного старта карты). */
export function endRoundToMatchmaking(
  code: string,
  hostUserId: string,
  opts?: RestartRoomOpts | string
): Room | null {
  const room = getRoom(code);
  if (!room || room.status !== "playing") return null;
  if (room.hostUserId !== hostUserId) return null;

  const patch =
    typeof opts === "string" ? { mapId: opts } : (opts ?? {});

  if (patch.randomMapOnStart !== undefined) {
    room.randomMapOnStart = patch.randomMapOnStart;
  }

  if (room.randomMapOnStart) {
    room.mapId = pickRandomMapId(room.mapId);
  } else if (patch.mapId && isValidMapId(patch.mapId)) {
    room.mapId = patch.mapId;
  }

  deleteGameForRoom(room.code);

  for (const p of room.players) {
    if (p.inMatch !== false) {
      p.inMatch = false;
      delete p.slotId;
      if (!p.ready) p.ready = false;
    }
  }
  clearSlotsForNonParticipants(room);

  room.status = "matchmaking";
  delete room.startedAt;
  ensureHostReadyInMatchmaking(room);
  return room;
}

export function patchRoomSettings(
  code: string,
  hostUserId: string,
  patch: { randomMapOnStart?: boolean; mapId?: string }
): Room | null {
  const room = getRoom(code);
  if (!room || room.hostUserId !== hostUserId) return null;
  if (room.status === "playing") return null;
  if (patch.randomMapOnStart !== undefined) {
    room.randomMapOnStart = patch.randomMapOnStart;
  }
  if (patch.mapId && isValidMapId(patch.mapId)) {
    room.mapId = patch.mapId;
  }
  return room;
}

export { PLAYER_SLOT_IDS };
