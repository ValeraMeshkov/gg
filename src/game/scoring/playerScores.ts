import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";

/** Сумма юнитов на всех клетках игрока. */
export function playerScoresFromCells(
  cells: readonly MapCell[],
  slotIds: readonly string[] = []
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const id of slotIds) totals.set(id, 0);
  for (const cell of cells) {
    const id = cell.ownerId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, 0);
    totals.set(id, totals.get(id)! + (cell.units ?? 0));
  }
  return totals;
}

/**
 * Очки для полосы: юниты на клетках + вылетевшие, но ещё не приземлившиеся снаряды.
 */
export function playerScoresForRoom(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[],
  slotIds: readonly string[]
): Map<string, number> {
  const totals = playerScoresFromCells(cells, slotIds);
  for (const flight of flights) {
    for (const sim of flight.sims) {
      if (!sim.spawnApplied || sim.landApplied || sim.destroyed) continue;
      const id = sim.hitAffiliationId;
      if (!totals.has(id)) continue;
      totals.set(id, totals.get(id)! + 1);
    }
  }
  return totals;
}

export function countUnspawnedFromSourceCell(
  fromI: number,
  flights: readonly FlightPayload[]
): number {
  let n = 0;
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    for (const s of f.sims) {
      if (!s.spawnApplied && !s.landApplied) n += 1;
    }
  }
  return n;
}
