import { territoryDotHitRadius } from "@/game/mapLayout";
import {
  isTerritoryIndexHidden,
  mapDotCenter,
  territoryCellPos,
  type CellPos,
} from "./mapAccess";
import type { TerritoryGameMap } from "./types";

export { territoryCellPos };

/** Ближайшая видимая точка территории в пределах зоны hit (карта в координатах SVG). */
export function cellUnderCursorTerritoryDot(
  map: TerritoryGameMap,
  mapX: number,
  mapY: number,
  hiddenOpts?: { syncMapLayout?: boolean },
  /** Радиус в координатах viewBox; иначе эталон из `mapLayout` (без meet-scale). */
  hitRadiusViewBox?: number
): CellPos | null {
  let bestIndex: number | null = null;
  let bestD = Infinity;
  const hitR = hitRadiusViewBox ?? territoryDotHitRadius();
  for (let index = 0; index < map.territories.length; index++) {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) continue;
    const c = mapDotCenter(map, territoryCellPos(index));
    const d = Math.hypot(mapX - c.x, mapY - c.y);
    if (d <= hitR && d < bestD) {
      bestD = d;
      bestIndex = index;
    }
  }
  return bestIndex !== null ? territoryCellPos(bestIndex) : null;
}
