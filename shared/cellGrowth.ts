import { CELL } from "./constants.js";
import type { CombatCell } from "./combat.js";

/**
 * Пассивный +1: нейтраль и своя территория — по +1 к капу (20 / 100), в т.ч. под обстрелом.
 * Нейтраль на 0: 0→1→2→…→20, если по ней не попадают.
 * С нуля не растём, пока с клетки-источника ещё не вылетели запланированные пули.
 */
export function bumpCellsTowardsCap<T extends CombatCell>(
  prev: readonly T[],
  skipIndices: ReadonlySet<number>,
  freezeGrowthAtZeroWhenPendingLaunch: ReadonlySet<number>
): T[] | null {
  let changed = false;
  const next = prev.map((cell, idx) => {
    if (skipIndices.has(idx)) return { ...cell };
    const u = cell.units ?? 0;
    if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) {
      return { ...cell };
    }
    const cap = cell.ownerId ? CELL.ownedCap : CELL.neutralStart;
    if (u >= cap) return { ...cell };
    changed = true;
    return { ...cell, units: Math.min(cap, u + 1) };
  });
  return changed ? next : null;
}
