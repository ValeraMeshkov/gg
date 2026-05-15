export function applyIncrementalLandHit(cell, attackerId) {
    if (cell.ownerId === attackerId) {
        return { ...cell, units: (cell.units ?? 0) + 1 };
    }
    const u = (cell.units ?? 0) - 1;
    if (u < 0) {
        return { ...cell, ownerId: attackerId, units: -u };
    }
    return { ...cell, units: u };
}
