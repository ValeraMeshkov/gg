import { isPlayerAliveInMatch } from "./matchElimination";
import type { RoomGameOutcome } from "./types";

/** Победа: остался один игрок с очками ≥ 0; при 0 ещё жив, выбыл при < 0 (−1). */
export function roomGameOutcomeForLocal(
  roomSlotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (roomSlotIds.length < 2) return null;

  const localScore = scores.get(localPlayerId) ?? 0;
  const localAlive = isPlayerAliveInMatch(localScore);
  const rivalsAlive = roomSlotIds.filter(
    (id) =>
      id !== localPlayerId && isPlayerAliveInMatch(scores.get(id) ?? 0)
  );

  if (localAlive && rivalsAlive.length === 0) {
    return "won";
  }
  if (!localAlive && rivalsAlive.length === 1) {
    return "lost";
  }

  const alive = roomSlotIds.filter((id) =>
    isPlayerAliveInMatch(scores.get(id) ?? 0)
  );
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
  const rivalAlive = slotIds.filter(
    (id) =>
      id !== localPlayerId && isPlayerAliveInMatch(scores.get(id) ?? 0)
  );
  if (isPlayerAliveInMatch(my)) {
    if (rivalAlive.length === 0 && slotIds.length > 1) return "won";
    return null;
  }
  if (rivalAlive.length === 1) return "lost";
  if (rivalAlive.length === 0) return "draw";
  return null;
}
