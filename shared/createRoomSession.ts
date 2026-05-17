import { CELL } from "./constants.js";
import { MAP_PLAYABLE, playableIndices } from "./mapPlayable.js";
import { pickDistinctIndices } from "./pickDistinct.js";
import { seededRandom } from "./seededRandom.js";
import type { SyncCell } from "./wsProtocol.js";

/** Старт партии в комнате: одинаковые клетки у всех клиентов. */
export function createRoomSession(
  mapId: string,
  playerSlotIds: readonly string[],
  seed: string
): SyncCell[] {
  const meta = playableIndices(mapId);
  const rng = seededRandom(seed);
  const indices = pickDistinctIndices(meta, playerSlotIds.length, rng);
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

/** Добавить стартовую клетку игроку, подключившемуся к уже идущей партии. */
export function addPlayerSpawnToCells(
  mapId: string,
  cells: readonly SyncCell[],
  slotId: string,
  seed: string
): SyncCell[] {
  const meta = playableIndices(mapId);
  const rng = seededRandom(`${seed}:join:${slotId}`);
  const candidates = meta.filter((i) => !cells[i]?.ownerId);
  if (candidates.length === 0) {
    throw new Error("Нет свободной клетки для нового игрока");
  }
  const idx = candidates[Math.floor(rng() * candidates.length)]!;
  const next = cells.map((c) => ({ ...c }));
  next[idx] = { ownerId: slotId, units: CELL.playerStart };
  return next;
}

function mapCellCount(mapId: string): number {
  const m = MAP_PLAYABLE[mapId];
  if (!m) throw new Error(`Нет метаданных карты: ${mapId}`);
  return m.cellCount;
}
