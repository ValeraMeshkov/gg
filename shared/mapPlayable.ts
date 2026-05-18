/** Метаданные карт для сервера (без тяжёлых SVG). cellCount = число территорий в generated/*.ts */
export type MapPlayableMeta = {
  cellCount: number;
  /** Номера точек (1-based), как `hiddenSpots` в карте и в редакторе. */
  hidden: readonly number[];
};

export const MAP_PLAYABLE: Record<string, MapPlayableMeta> = {
  "south-america": { cellCount: 14, hidden: [7, 12] },
  "north-america": { cellCount: 15, hidden: [7, 8, 9, 11, 13, 14] },
  europe: {
    cellCount: 41,
    hidden: [
      5, 6, 7, 9, 12, 13, 14, 17, 18, 19, 20, 21, 23, 26, 27, 28, 29, 30, 31,
      32, 33, 34, 38, 39, 40,
    ],
  },
  africa: {
    cellCount: 57,
    hidden: [
      3, 6, 10, 11, 12, 14, 15, 18, 21, 22, 23, 24, 26, 28, 29, 33, 34, 35, 39,
      40, 41, 43, 46, 47, 48, 49, 50, 52, 53, 57,
    ],
  },
  asia: {
    cellCount: 47,
    hidden: [
      6, 7, 11, 12, 13, 14, 15, 19, 20, 21, 25, 26, 27, 28, 29, 30, 31, 32, 33,
      35, 36, 41, 42, 45,
    ],
  },
  oceania: { cellCount: 9, hidden: [] },
  "world-large": { cellCount: 40, hidden: [] },
};

export const VALID_MAP_IDS = Object.keys(MAP_PLAYABLE);

export function isValidMapId(mapId: string): boolean {
  return mapId in MAP_PLAYABLE;
}

/** Случайная карта из пула; старается не вернуть `excludeId`. */
export function pickRandomMapId(excludeId?: string): string {
  const ids = VALID_MAP_IDS;
  if (ids.length === 0) return "south-america";
  if (ids.length === 1) return ids[0]!;
  let pick: string;
  let n = 0;
  do {
    pick = ids[Math.floor(Math.random() * ids.length)]!;
    n++;
  } while (pick === excludeId && n < 64);
  return pick;
}

export function playableIndices(mapId: string): number[] {
  const meta = MAP_PLAYABLE[mapId];
  if (!meta) {
    throw new Error(`Нет метаданных карты: ${mapId}`);
  }
  const hiddenSpots = new Set(meta.hidden);
  const out: number[] = [];
  for (let i = 0; i < meta.cellCount; i++) {
    const spot = i + 1;
    if (!hiddenSpots.has(spot)) out.push(i);
  }
  return out;
}
