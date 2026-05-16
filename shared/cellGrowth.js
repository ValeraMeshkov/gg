import { CELL } from "./constants.js";
/**
 * Пассивный +1: нейтраль — до `neutralStart` (20), своя территория — до `ownedCap` (100).
 * С нуля не растём, пока с клетки ещё не вылетели запланированные пули.
 */
export function bumpCellsTowardsCap(prev, skipIndices, freezeGrowthAtZeroWhenPendingLaunch) {
    let changed = false;
    const next = prev.map((cell, idx) => {
        if (skipIndices.has(idx))
            return { ...cell };
        const u = cell.units ?? 0;
        if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) {
            return { ...cell };
        }
        const cap = cell.ownerId ? CELL.ownedCap : CELL.neutralStart;
        if (u >= cap)
            return { ...cell };
        changed = true;
        return { ...cell, units: Math.min(cap, u + 1) };
    });
    return changed ? next : null;
}
