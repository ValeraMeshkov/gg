import { territoryDotHitRadius } from "@/game/mapLayout";
import {
  isTerritoryIndexHidden,
  mapDotCenter,
  type CellPos,
} from "./mapAccess";
import type { TerritoryGameMap } from "./types";

export function territoryCellPos(index: number): CellPos {
  return { x: index, y: 0 };
}

/** Ближайшая видимая точка территории в пределах зоны hit (карта в координатах SVG). */
export function cellUnderCursorTerritoryDot(
  map: TerritoryGameMap,
  mapX: number,
  mapY: number,
  hiddenOpts?: { syncMapLayout?: boolean }
): CellPos | null {
  let bestIndex: number | null = null;
  let bestD = Infinity;
  const hitR = territoryDotHitRadius();
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
