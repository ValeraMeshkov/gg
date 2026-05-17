import centers from "@/shared/mapDotCenters.json";
import type { CellPos } from "./mapAccess";
import { mapDotCenter } from "./mapAccess";
import type { GameMap } from "./world/types";

const DOT_CENTERS = centers as Record<
  string,
  readonly { x: number; y: number }[]
>;

/** Координаты точек как на сервере (без localStorage-редактора). */
export function mapDotCenterAuthoritative(
  map: GameMap,
  pos: CellPos
): { x: number; y: number } {
  const arr = DOT_CENTERS[map.id];
  const idx = pos.x;
  if (arr && idx >= 0 && idx < arr.length) {
    const p = arr[idx];
    if (p) return { x: p.x, y: p.y };
  }
  return mapDotCenter(map, pos);
}
