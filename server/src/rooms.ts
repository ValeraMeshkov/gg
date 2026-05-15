import { randomBytes } from "node:crypto";
import { isValidMapId } from "../../shared/mapPlayable.js";
import {
  normalizeMaxPlayers,
  playerSlotId,
  PLAYER_SLOT_IDS,
} from "../../shared/playerSlots.js";
import { initGameForRoom, spawnJoinedPlayerInRoom } from "./gameState.js";

const DEFAULT_MAP_ID = "south-america";

export type RoomPlayer = {
  userId: string;
  joinedAt: string;
  slotId?: string;
};

export type Room = {
  code: string;
  hostUserId: string;
  mapId: string;
  status: "lobby" | "playing";
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

function nextFreeSlot(room: Room): string | null {
  const used = new Set(
    room.players.map((p) => p.slotId).filter((id): id is string => Boolean(id))
  );
  for (let i = 0; i < room.maxPlayers; i++) {
    const slot = playerSlotId(i);
    if (!used.has(slot)) return slot;
  }
  return null;
}

function assignSlotsAndStart(room: Room): void {
  room.players.forEach((p, i) => {
    if (!p.slotId) p.slotId = playerSlotId(i);
  });
  room.status = "playing";
  room.startedAt = new Date().toISOString();
  room.gameGeneration = room.gameGeneration ?? 0;
  initGameForRoom(room);
}

export function createRoom(
  hostUserId: string,
  mapId?: string,
  maxPlayers?: number
): Room {
  const cap = normalizeMaxPlayers(maxPlayers);
  const code = generateRoomCode();
  const now = new Date().toISOString();
  const room: Room = {
    code,
    hostUserId,
    mapId: mapId ?? DEFAULT_MAP_ID,
    status: "playing",
    maxPlayers: cap,
    createdAt: now,
    startedAt: now,
    gameGeneration: 0,
    players: [
      { userId: hostUserId, joinedAt: now, slotId: playerSlotId(0) },
    ],
  };
  rooms.set(code, room);
  initGameForRoom(room);
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

  if (room.status === "lobby") {
    room.players.push({ userId, joinedAt: now });
    if (room.players.length >= room.maxPlayers) {
      assignSlotsAndStart(room);
    }
    return { room, playerAdded: true };
  }

  if (room.status === "playing") {
    const slotId = nextFreeSlot(room);
    if (!slotId) return null;
    room.players.push({ userId, joinedAt: now, slotId });
    spawnJoinedPlayerInRoom(room, slotId);
    return { room, playerAdded: true };
  }

  return null;
}

export function startRoom(code: string, hostUserId: string): Room | null {
  const room = getRoom(code);
  if (!room || room.status !== "lobby") return null;
  if (room.hostUserId !== hostUserId) return null;
  if (room.players.length < 1) return null;

  assignSlotsAndStart(room);
  return room;
}

export function restartRoom(
  code: string,
  hostUserId: string,
  mapId?: string
): Room | null {
  const room = getRoom(code);
  if (!room || room.status !== "playing") return null;
  if (room.hostUserId !== hostUserId) return null;

  if (mapId && isValidMapId(mapId)) {
    room.mapId = mapId;
  }

  room.gameGeneration = (room.gameGeneration ?? 0) + 1;
  initGameForRoom(room);
  return room;
}

export { PLAYER_SLOT_IDS };
