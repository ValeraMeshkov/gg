import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";
import { playerHadMatchPresence, playerScoresForRoom } from "./playerScores";
import { isPlayerAliveInMatch } from "./matchElimination";
import { MATCH_OUTCOME } from "@/shared/matchOutcome";
import type { RoomGameOutcome } from "./types";

function rivalContestedInMatch(
  rivalId: string,
  scores: ReadonlyMap<string, number>,
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): boolean {
  const score = scores.get(rivalId) ?? 0;
  if (score !== 0) return true;
  const raw = playerScoresForRoom(cells, flights, [rivalId]).get(rivalId) ?? 0;
  return playerHadMatchPresence(rivalId, cells, flights, raw);
}

/** Победа: остался один игрок с очками ≥ 0; при 0 ещё жив, выбыл при < 0 (−1). */
export function roomGameOutcomeForLocal(
  roomSlotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string,
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): RoomGameOutcome | null {
  if (roomSlotIds.length < 2) return null;

  const rivals = roomSlotIds.filter((id) => id !== localPlayerId);
  const contestedRivals = rivals.filter((id) =>
    rivalContestedInMatch(id, scores, cells, flights)
  );
  if (contestedRivals.length === 0) return null;

  const localScore = scores.get(localPlayerId) ?? 0;
  const localAlive = isPlayerAliveInMatch(localScore);
  const rivalsAlive = contestedRivals.filter((id) =>
    isPlayerAliveInMatch(scores.get(id) ?? 0)
  );

  if (localAlive && rivalsAlive.length === 0) {
    return MATCH_OUTCOME.WON;
  }
  if (!localAlive && rivalsAlive.length > 0) {
    return MATCH_OUTCOME.LOST;
  }

  const alive = roomSlotIds.filter((id) =>
    isPlayerAliveInMatch(scores.get(id) ?? 0)
  );
  if (alive.length > 1) return null;
  if (alive.length === 0) return MATCH_OUTCOME.LOST;
  const winnerId = alive[0]!;
  return winnerId === localPlayerId ? MATCH_OUTCOME.WON : MATCH_OUTCOME.LOST;
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
    if (rivalAlive.length === 0 && slotIds.length > 1) return MATCH_OUTCOME.WON;
    return null;
  }
  if (rivalAlive.length > 0) return MATCH_OUTCOME.LOST;
  return MATCH_OUTCOME.LOST;
}
