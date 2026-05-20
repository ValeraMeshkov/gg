import { getCell, isTerritoryIndexHidden } from "./mapAccess";
import type { TerritoryGameMap } from "./types";
import type { MapCell } from "./types";

export type VisibleOwnedTerritorySpot = {
  index: number;
  cell: MapCell;
  ownerId: string;
};

/** Обход видимых занятых точек карты — общий цикл для GLB, heart-life и т.п. */
export function forEachVisibleOwnedTerritorySpot(
  map: TerritoryGameMap,
  hiddenOpts: { syncMapLayout?: boolean } | undefined,
  fn: (spot: VisibleOwnedTerritorySpot) => void
): void {
  map.territories.forEach((_, index) => {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) return;
    const cell = getCell(map, index);
    if (!cell.ownerId) return;
    fn({ index, cell, ownerId: cell.ownerId });
  });
}
