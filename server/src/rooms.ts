import { randomBytes } from "node:crypto";
import { isValidMapId } from "../../shared/mapPlayable.js";
import { initGameForRoom } from "./gameState.js";

const DEFAULT_MAP_ID = "south-america";

export type RoomPlayer = {
  userId: string;
  joinedAt: string;
  /** После старта: mock-user | mock-user-2 */
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
  /** Увеличивается при «новой игре» — новый сид стартовых клеток. */
  gameGeneration?: number;
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

export function createRoom(hostUserId: string, mapId?: string): Room {
  const code = generateRoomCode();
  const now = new Date().toISOString();
  const room: Room = {
    code,
    hostUserId,
    mapId: mapId ?? DEFAULT_MAP_ID,
    status: "lobby",
    maxPlayers: 2,
    createdAt: now,
    players: [{ userId: hostUserId, joinedAt: now }],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | null {
  const key = code.toUpperCase();
  return rooms.get(key) ?? null;
}

export function joinRoom(code: string, userId: string): Room | null {
  const room = getRoom(code);
  if (!room || room.status !== "lobby") return null;

  if (room.players.some((p) => p.userId === userId)) {
    return room;
  }

  if (room.players.length >= room.maxPlayers) {
    return null;
  }

  room.players.push({ userId, joinedAt: new Date().toISOString() });
  return room;
}

export function startRoom(code: string, hostUserId: string): Room | null {
  const room = getRoom(code);
  if (!room || room.status !== "lobby") return null;
  if (room.hostUserId !== hostUserId) return null;
  if (room.players.length < 2) return null;

  const slots = ["mock-user", "mock-user-2", "mock-user-3"] as const;
  room.players.forEach((p, i) => {
    p.slotId = slots[i] ?? slots[slots.length - 1];
  });
  room.status = "playing";
  room.startedAt = new Date().toISOString();
  room.gameGeneration = 0;
  initGameForRoom(room);
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
