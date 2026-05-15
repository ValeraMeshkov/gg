import { CELL } from "./constants.js";
import { MAP_PLAYABLE, playableIndices } from "./mapPlayable.js";
import { seededRandom } from "./seededRandom.js";
import type { SyncCell } from "./wsProtocol.js";

function pickDistinct(
  playable: readonly number[],
  count: number,
  rng: () => number
): number[] {
  if (playable.length < count) {
    throw new Error("Недостаточно клеток для старта");
  }
  const picked = new Set<number>();
  while (picked.size < count) {
    picked.add(playable[Math.floor(rng() * playable.length)]!);
  }
  return [...picked];
}

/** Старт партии в комнате: одинаковые клетки у всех клиентов. */
export function createRoomSession(
  mapId: string,
  playerSlotIds: readonly string[],
  seed: string
): SyncCell[] {
  const meta = playableIndices(mapId);
  const rng = seededRandom(seed);
  const indices = pickDistinct(meta, playerSlotIds.length, rng);
  const cells: SyncCell[] = Array.from({ length: mapCellCount(mapId) }, () => ({}));
  for (const i of meta) {
    cells[i] = { units: CELL.neutralStart };
  }
  for (let i = 0; i < playerSlotIds.length; i++) {
    cells[indices[i]!] = {
      ownerId: playerSlotIds[i],
      units: CELL.playerStart,
    };
  }
  return cells;
}

function mapCellCount(mapId: string): number {
  const m = MAP_PLAYABLE[mapId];
  if (!m) throw new Error(`Нет метаданных карты: ${mapId}`);
  return m.cellCount;
}
