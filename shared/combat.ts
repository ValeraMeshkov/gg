import type { FortressHitContext } from "./fortressShield.js";
import { applyLandHitWithFortressShield } from "./fortressShield.js";
import { applyLandHitUnitsOnly, type CombatCell } from "./landHit.js";

export type { CombatCell } from "./landHit.js";
export { pauseCellGrowth, applyLandHitUnitsOnly } from "./landHit.js";

/**
 * Попадание снаряда по клетке (с опциональным щитом крепости).
 */
export function applyLandHitWithPower<T extends CombatCell>(
  cell: T,
  attackerId: string,
  power: number,
  nowMs: number = Date.now(),
  fortress?: FortressHitContext
): T {
  if (fortress?.defenderBuilding || fortress?.attackerBuilding) {
    return applyLandHitWithFortressShield(
      cell,
      attackerId,
      power,
      fortress,
      nowMs
    );
  }
  return applyLandHitUnitsOnly(
    cell,
    attackerId,
    power,
    nowMs,
    fortress?.attackerBuilding
  );
}

/** Одно очко урона (сила = 1). */
export function applyIncrementalLandHit<T extends CombatCell>(
  cell: T,
  attackerId: string,
  nowMs: number = Date.now()
): T {
  return applyLandHitWithPower(cell, attackerId, 1, nowMs);
}
