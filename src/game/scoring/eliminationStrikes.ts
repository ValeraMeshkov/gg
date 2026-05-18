import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";
import {
  countUnspawnedFromSourceCell,
  inFlightPowerByPlayer,
  playerOwnsAnyCell,
  playerScoresForRoom,
  playerScoresFromCells,
} from "./playerScores";

export type ScoreCombatSnapshot = {
  raw: Map<string, number>;
  cells: Map<string, number>;
  flight: Map<string, number>;
};

export function captureScoreCombatSnapshot(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[],
  slotIds: readonly string[]
): ScoreCombatSnapshot {
  return {
    raw: playerScoresForRoom(cells, flights, slotIds),
    cells: playerScoresFromCells(cells, slotIds),
    flight: inFlightPowerByPlayer(flights, slotIds),
  };
}

/** Есть клетка, патроны в полёте или очередь вылета — с 0 очков ещё можно отыграться. */
export function playerCanRecoverFromZeroScore(
  playerId: string,
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): boolean {
  if (playerOwnsAnyCell(playerId, cells)) {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i]?.ownerId !== playerId) continue;
      if (countUnspawnedFromSourceCell(i, flights) > 0) return true;
    }
    return true;
  }
  return (inFlightPowerByPlayer(flights, [playerId]).get(playerId) ?? 0) > 0;
}

/**
 * При 0 очков игрок ещё жив, если может отыграться.
 * −1: нет восстановления при падении до 0, или на нуле снова потерял силу/клетки.
 */
export function applyEliminationStrikes(
  before: ScoreCombatSnapshot,
  cells: readonly MapCell[],
  flights: readonly FlightPayload[],
  slotIds: readonly string[],
  penalties: Map<string, number>
): void {
  const after = captureScoreCombatSnapshot(cells, flights, slotIds);
  for (const id of slotIds) {
    const prevRaw = before.raw.get(id) ?? 0;
    const nextRaw = after.raw.get(id) ?? 0;
    if (nextRaw > 0) {
      penalties.delete(id);
      continue;
    }
    if (prevRaw > 0 && nextRaw === 0) {
      if (!playerCanRecoverFromZeroScore(id, cells, flights)) {
        penalties.set(id, 1);
      }
      continue;
    }
    if (prevRaw === 0 && nextRaw === 0) {
      const lostFlight =
        (after.flight.get(id) ?? 0) < (before.flight.get(id) ?? 0);
      const lostCells =
        (after.cells.get(id) ?? 0) < (before.cells.get(id) ?? 0);
      if (lostFlight || lostCells) {
        penalties.set(id, 1);
      }
    }
  }
}
