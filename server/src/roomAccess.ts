import { readCellUnits } from "@/shared/cellUnits.js";
import { playerInMatch, type RoomPlayerPublic } from "@/shared/roomRoster.js";
import {
  isRoomMatchmaking,
  isRoomPlaying,
} from "@/shared/roomStatus.js";
import { getGameForRoom, type RoomGameState } from "./gameState.js";
import { sourcesWithPendingLaunch } from "./roomAttack.js";
import type { Room } from "./rooms.js";

function cellUnitsForSlot(game: RoomGameState, slotId: string): number {
  let total = 0;
  for (const cell of game.cells) {
    if (cell.ownerId !== slotId) continue;
    total += readCellUnits(cell);
  }
  return total;
}

function slotHasPendingLaunches(roomCode: string, slotId: string): boolean {
  const pending = sourcesWithPendingLaunch(roomCode);
  const g = getGameForRoom(roomCode);
  if (!g || pending.size === 0) return false;
  for (const idx of pending) {
    if (g.cells[idx]?.ownerId === slotId) return true;
  }
  return false;
}

/** Смена оружия (fighter) на карте — разрешена участнику активной партии. */
export function canPlayerPatchFighter(room: Room, userId: string): boolean {
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return false;
  if (!playerInMatch(player)) return true;
  if (!isRoomPlaying(room.status)) return true;
  return Boolean(player.slotId);
}

/** Серверная проверка перед WS appearance (скин здания, цвет, имя). */
export function canPlayerPatchAppearance(
  room: Room,
  userId: string
): boolean {
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return false;

  const roster: RoomPlayerPublic = {
    userId: player.userId,
    joinedAt: player.joinedAt,
    slotId: player.slotId,
    inMatch: player.inMatch !== false,
  };

  if (!playerInMatch(roster)) return true;
  if (!isRoomPlaying(room.status) || !player.slotId) return true;

  const game = getGameForRoom(room.code);
  if (!game) return true;

  const units = cellUnitsForSlot(game, player.slotId);
  if (units > 0) return false;
  if (slotHasPendingLaunches(room.code, player.slotId)) return false;

  return true;
}

/** Нет клеток и нет пуль в полёте — выбыл из текущей партии. */
export function isPlayerEliminatedFromMatch(
  room: Room,
  userId: string
): boolean {
  const player = room.players.find((p) => p.userId === userId);
  if (!player?.slotId || !playerInMatch(player)) return false;
  if (!isRoomPlaying(room.status)) return false;

  const game = getGameForRoom(room.code);
  if (!game) return false;

  if (cellUnitsForSlot(game, player.slotId) > 0) return false;
  if (slotHasPendingLaunches(room.code, player.slotId)) return false;

  return true;
}

export function canPlayerSetReady(room: Room, userId: string): boolean {
  const player = room.players.find((p) => p.userId === userId);
  if (!player) return false;
  if (isRoomMatchmaking(room.status)) return true;
  if (isRoomPlaying(room.status)) {
    if (!playerInMatch(player)) return true;
    return isPlayerEliminatedFromMatch(room, userId);
  }
  return false;
}
