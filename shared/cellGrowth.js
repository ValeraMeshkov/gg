import { CELL } from "./constants.js";
/** Пассивный +1 для нейтрали (до 20) и своих клеток (до 100). `null` — без изменений. */
export function bumpCellsTowardsCap(prev, skipIndices, freezeGrowthAtZeroWhenPendingLaunch) {
    let changed = false;
    const next = prev.map((cell, idx) => {
        if (skipIndices.has(idx))
            return { ...cell };
        /** Нейтрали не регенят — иначе в мультиплеере урон по серым сразу откатывается. */
        if (!cell.ownerId)
            return { ...cell };
        const u = cell.units ?? 0;
        if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) {
            return { ...cell };
        }
        const cap = CELL.ownedCap;
        if (u >= cap)
            return { ...cell };
        changed = true;
        return { ...cell, units: Math.min(cap, u + 1) };
    });
    return changed ? next : null;
}
