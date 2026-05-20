import { CELL } from "./constants.js";
import { unitsOnCapture } from "./buildingMechanics.js";
import type { BuildingSkinId } from "./skinIds.js";
import {
  addUnitsToFriendlyCell,
  damageOwnedCellUnits,
  readCellUnits,
} from "./cellUnits.js";

/** Минимальные поля клетки для расчёта попадания снаряда. */
export type CombatCell = {
  ownerId?: string;
  units?: number;
  growthPausedUntil?: number;
  fortressShield?: number;
  fortressShieldRegenPausedUntil?: number;
};

export function pauseCellGrowth<T extends CombatCell>(
  cell: T,
  nowMs: number = Date.now()
): T {
  return {
    ...cell,
    growthPausedUntil: nowMs + CELL.growthPauseMs,
  };
}

/** Урон/передача по клетке без учёта щита крепости. */
export function applyLandHitUnitsOnly<T extends CombatCell>(
  cell: T,
  attackerId: string,
  power: number,
  nowMs: number = Date.now(),
  attackerBuilding?: BuildingSkinId
): T {
  const hitPower = Math.floor(Number(power));
  if (!Number.isFinite(hitPower) || hitPower <= 0) return cell;

  if (cell.ownerId === attackerId) {
    const current = readCellUnits(cell);
    const next = addUnitsToFriendlyCell(current, hitPower);
    if (next === current) return pauseCellGrowth(cell, nowMs);
    return pauseCellGrowth({ ...cell, units: next }, nowMs);
  }

  const wasOwnerId = cell.ownerId;
  const current = readCellUnits(cell);
  const remaining = damageOwnedCellUnits(current, hitPower);
  const next: T =
    remaining <= 0
      ? {
          ...cell,
          ownerId: attackerId,
          units: unitsOnCapture(
            attackerBuilding,
            wasOwnerId,
            attackerId,
            -remaining
          ),
        }
      : { ...cell, units: remaining };
  return pauseCellGrowth(next, nowMs);
}
