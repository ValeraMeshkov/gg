import { DEFAULT_MAP_ID, MAP_ID } from "./mapIds";

/**
 * Каталог карт с фиксированными номерами — для правок в чате:
 * «на карте №2 у точки 7 …».
 *
 * Порядок точек на карте = порядок в `generated/*.ts` (как в extract-world-maps).
 */
export type MapCatalogEntry = {
  readonly number: number;
  readonly id: string;
  readonly name: string;
};

/** Только континенты из случайного пула. Номера не менять без необходимости. */
export const MAP_CATALOG: readonly MapCatalogEntry[] = [
  { number: 1, id: MAP_ID.SOUTH_AMERICA, name: "Южная Америка" },
  { number: 2, id: MAP_ID.NORTH_AMERICA, name: "Северная Америка" },
  { number: 3, id: MAP_ID.EUROPE, name: "Европа" },
  { number: 4, id: MAP_ID.AFRICA, name: "Африка" },
  { number: 5, id: MAP_ID.ASIA, name: "Азия" },
  { number: 6, id: MAP_ID.OCEANIA, name: "Океания" },
] as const;

export function getMapCatalogEntry(mapId: string): MapCatalogEntry | undefined {
  return MAP_CATALOG.find((m) => m.id === mapId);
}

export function getMapIdByCatalogNumber(catalogNumber: number): string {
  const entry = MAP_CATALOG.find((m) => m.number === catalogNumber);
  if (!entry) {
    throw new Error(`Нет карты с номером ${catalogNumber} в каталоге`);
  }
  return entry.id;
}

export function getTerritorySpotNumber(territoryIndex: number): number {
  return territoryIndex + 1;
}

/** Случайная карта из каталога; при нескольких картах старается не вернуть `excludeId`. */
export function pickRandomCatalogMapId(excludeId?: string): string {
  const ids = MAP_CATALOG.map((e) => e.id);
  if (ids.length === 0) {
    return DEFAULT_MAP_ID;
  }
  if (ids.length === 1) {
    return ids[0]!;
  }
  let pick: string;
  let n = 0;
  do {
    pick = ids[Math.floor(Math.random() * ids.length)]!;
    n++;
  } while (pick === excludeId && n < 64);
  return pick;
}
