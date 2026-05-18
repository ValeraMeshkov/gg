import type { MapCell } from "@/game/maps/types";
import type { FlightPayload } from "@/game/projectiles/types";
import { readCellUnits } from "@/shared/cellUnits";
import {
  projectileCountForLaunchBudget,
  reservedLaunchPower,
} from "@/shared/launchPower";

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
    totals.set(id, totals.get(id)! + readCellUnits(cell));
  }
  return totals;
}

/**
 * Очки для полосы: юниты на клетках + сила патронов в полёте (не приземлившихся).
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
      totals.set(id, totals.get(id)! + Math.max(0, sim.power));
    }
  }
  return totals;
}

export function playerOwnsAnyCell(
  playerId: string,
  cells: readonly MapCell[]
): boolean {
  return cells.some((c) => c.ownerId === playerId);
}

/** Сила патронов игрока в полёте (без приземлившихся / уничтоженных). */
export function inFlightPowerByPlayer(
  flights: readonly FlightPayload[],
  slotIds: readonly string[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const id of slotIds) totals.set(id, 0);
  for (const flight of flights) {
    for (const sim of flight.sims) {
      if (!sim.spawnApplied || sim.landApplied || sim.destroyed) continue;
      const id = sim.hitAffiliationId;
      if (!totals.has(id)) continue;
      totals.set(id, totals.get(id)! + Math.max(0, sim.power));
    }
  }
  return totals;
}

/** Зарезервированная сила на клетке (очередь вылета). */
export function countUnspawnedFromSourceCell(
  fromI: number,
  flights: readonly FlightPayload[]
): number {
  const sims: FlightPayload["sims"] = [];
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    sims.push(...f.sims);
  }
  return reservedLaunchPower(sims);
}

/** Сколько патронов можно добавить в залп с клетки при цене вылета `launchPower`. */
export function availableProjectileCountFromSource(
  fromI: number,
  cells: readonly MapCell[],
  flights: readonly FlightPayload[],
  launchPower: number
): number {
  const u = readCellUnits(cells[fromI]);
  const reserved = countUnspawnedFromSourceCell(fromI, flights);
  const budget = Math.max(0, u - reserved);
  return projectileCountForLaunchBudget(budget, launchPower);
}
