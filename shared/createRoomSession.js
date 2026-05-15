import { CELL } from "./constants.js";
import { MAP_PLAYABLE, playableIndices } from "./mapPlayable.js";
import { seededRandom } from "./seededRandom.js";
function pickDistinct(playable, count, rng) {
    if (playable.length < count) {
        throw new Error("Недостаточно клеток для старта");
    }
    const picked = new Set();
    while (picked.size < count) {
        picked.add(playable[Math.floor(rng() * playable.length)]);
    }
    return [...picked];
}
/** Старт партии в комнате: одинаковые клетки у всех клиентов. */
export function createRoomSession(mapId, playerSlotIds, seed) {
    const meta = playableIndices(mapId);
    const rng = seededRandom(seed);
    const indices = pickDistinct(meta, playerSlotIds.length, rng);
    const cells = Array.from({ length: mapCellCount(mapId) }, () => ({}));
    for (const i of meta) {
        cells[i] = { units: CELL.neutralStart };
    }
    for (let i = 0; i < playerSlotIds.length; i++) {
        cells[indices[i]] = {
            ownerId: playerSlotIds[i],
            units: CELL.playerStart,
        };
    }
    return cells;
}
function mapCellCount(mapId) {
    const m = MAP_PLAYABLE[mapId];
    if (!m)
        throw new Error(`Нет метаданных карты: ${mapId}`);
    return m.cellCount;
}
