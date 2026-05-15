export const MAP_PLAYABLE = {
    "south-america": { cellCount: 14, hidden: [7, 12] },
    "north-america": { cellCount: 23, hidden: [7, 8, 9, 11, 13, 14] },
    europe: { cellCount: 44, hidden: [5, 6, 7, 9, 12, 13, 14, 17, 18, 19, 20, 21, 23, 26, 27, 28, 29, 30, 31, 32, 33, 34, 38, 39, 40] },
    africa: {
        cellCount: 58,
        hidden: [3, 6, 10, 11, 12, 14, 15, 18, 21, 22, 23, 24, 26, 28, 29, 33, 34, 35, 39, 40, 41, 43, 46, 47, 48, 49, 50, 52, 53, 57],
    },
    asia: {
        cellCount: 48,
        hidden: [6, 7, 11, 12, 13, 14, 15, 19, 20, 21, 25, 26, 27, 28, 29, 30, 31, 32, 33, 35, 36, 41, 42, 45],
    },
    oceania: { cellCount: 19, hidden: [] },
};
export function playableIndices(mapId) {
    const meta = MAP_PLAYABLE[mapId];
    if (!meta) {
        throw new Error(`Нет метаданных карты: ${mapId}`);
    }
    const hiddenSpots = new Set(meta.hidden);
    const out = [];
    for (let i = 0; i < meta.cellCount; i++) {
        const spot = i + 1;
        if (!hiddenSpots.has(spot))
            out.push(i);
    }
    return out;
}
