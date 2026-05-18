import {
  capForCellOwner,
  clampCellUnits,
  readCellUnits,
} from "./cellUnits.js";
import type { CombatCell } from "./combat.js";

/**
 * Пассивный +1: нейтраль и своя территория — к капу (20 / ownedCap).
 * Выше ownedCap клетка растёт только передачей снарядами на свою/союзную.
 * Не растёт, пока с клетки-источника не вылетели запланированные пули,
 * и пока не истекла пауза после обстрела / вылета / попадания (1 с, таймер сбрасывается).
 */
export function bumpCellsTowardsCap<T extends CombatCell>(
  prev: readonly T[],
  skipIndices: ReadonlySet<number>,
  freezeGrowthAtZeroWhenPendingLaunch: ReadonlySet<number>,
  nowMs: number = Date.now()
): T[] | null {
  let changed = false;
  const next = prev.map((cell, idx) => {
    if (skipIndices.has(idx)) return { ...cell };
    const pausedUntil = cell.growthPausedUntil ?? 0;
    if (nowMs < pausedUntil) return { ...cell };
    const u = readCellUnits(cell);
    if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) {
      return { ...cell };
    }
    const cap = capForCellOwner(cell.ownerId);
    if (u >= cap) return { ...cell };
    changed = true;
    return { ...cell, units: clampCellUnits(u + 1, cell.ownerId) };
  });
  return changed ? next : null;
}
