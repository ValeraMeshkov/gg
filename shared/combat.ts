import { CELL } from "./constants.js";
import { clampCellUnits, readCellUnits } from "./cellUnits.js";

/** Минимальные поля клетки для расчёта попадания снаряда. */
export type CombatCell = {
  ownerId?: string;
  units?: number;
  /**
   * Unix ms: до этого момента клетка не получает пассивный +1.
   * Ставится при обстреле, при вылете с клетки и при попадании по ней.
   */
  growthPausedUntil?: number;
};

/** Пауза пассивного роста; повторный вызов сбрасывает таймер (ещё 1 с). */
export function pauseCellGrowth<T extends CombatCell>(
  cell: T,
  nowMs: number = Date.now()
): T {
  return {
    ...cell,
    growthPausedUntil: nowMs + CELL.growthPauseMs,
  };
}

/**
 * Попадание снаряда по клетке силой `power` (текущая сила патрона в полёте).
 * Своя / союзная (+power), нейтраль/враг (−power) — на цели пауза роста.
 */
export function applyLandHitWithPower<T extends CombatCell>(
  cell: T,
  attackerId: string,
  power: number,
  nowMs: number = Date.now()
): T {
  const hitPower = Math.floor(Number(power));
  if (!Number.isFinite(hitPower) || hitPower <= 0) return cell;

  if (cell.ownerId === attackerId) {
    const current = readCellUnits(cell);
    const next = clampCellUnits(current + hitPower, attackerId);
    if (next === current) return pauseCellGrowth(cell, nowMs);
    return pauseCellGrowth({ ...cell, units: next }, nowMs);
  }

  const current = readCellUnits(cell);
  const u = current - hitPower;
  const next: T =
    u < 0
      ? {
          ...cell,
          ownerId: attackerId,
          units: clampCellUnits(-u, attackerId),
        }
      : { ...cell, units: clampCellUnits(u, cell.ownerId) };
  return pauseCellGrowth(next, nowMs);
}

/** Одно очко урона (сила = 1). */
export function applyIncrementalLandHit<T extends CombatCell>(
  cell: T,
  attackerId: string,
  nowMs: number = Date.now()
): T {
  return applyLandHitWithPower(cell, attackerId, 1, nowMs);
}
