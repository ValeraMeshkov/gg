import { DEFAULT_MAP_ID } from "./mapIds";
import { TERRITORY_MAPS } from "./world/territoryMaps";
import type { GameMap } from "./types";

export { DEFAULT_MAP_ID };

const territoryRecord = Object.fromEntries(
  TERRITORY_MAPS.map((m) => [m.id, m])
) as Record<string, GameMap>;

export const MAPS: Readonly<Record<string, GameMap>> = territoryRecord;

export function getMap(id: string): GameMap | undefined {
  return MAPS[id];
}

export function requireMap(id: string): GameMap {
  const m = getMap(id);
  if (!m) throw new Error(`Неизвестная карта: ${id}`);
  return m;
}

export { RANDOM_MAP_POOL } from "./world/territoryMaps";
