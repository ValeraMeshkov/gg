import type { RoomGameOutcome } from "./types";

/** Победа: остался один игрок с очками > 0 (FFA). */
export function roomGameOutcomeForLocal(
  roomSlotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (roomSlotIds.length < 2) return null;
  const alive = roomSlotIds.filter((id) => (scores.get(id) ?? 0) > 0);
  if (alive.length > 1) return null;
  if (alive.length === 0) return "draw";
  const winnerId = alive[0]!;
  return winnerId === localPlayerId ? "won" : "lost";
}

/**
 * Одиночка: как только у игрока 0 очков, а у кого-то ещё ещё есть — сразу «проигрыш»,
 * не дожидаясь исхода боя ботов между собой.
 */
export function offlineImmediateOutcomeForLocal(
  slotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (slotIds.length < 2) return null;
  const my = scores.get(localPlayerId) ?? 0;
  if (my > 0) return null;
  const rivalAlive = slotIds.some(
    (id) => id !== localPlayerId && (scores.get(id) ?? 0) > 0
  );
  if (rivalAlive) return "lost";
  if (slotIds.every((id) => (scores.get(id) ?? 0) <= 0)) return "draw";
  return null;
}
