import {
  getEffectiveLayout,
  isMapSpotHidden,
  isTerritoryIndexHidden,
} from "./world/mapDotLayout";
import type { GameMap } from "./world/types";

export { isMapSpotHidden, isTerritoryIndexHidden };

export type CellPos = { x: number; y: number };

export function cellCount(map: GameMap): number {
  return map.cells.length;
}

export function cellIndex(_map: GameMap, pos: CellPos): number {
  return pos.x;
}

export function cellPosFromIndex(_map: GameMap, index: number): CellPos {
  return { x: index, y: 0 };
}

export function getCell(map: GameMap, index: number) {
  return map.cells[index]!;
}

export function getCellAt(map: GameMap, pos: CellPos) {
  return getCell(map, cellIndex(map, pos));
}

export function mapSizeLabel(map: GameMap): string {
  return `${map.territories.length} областей`;
}

export function mapViewBoxString(map: GameMap): string {
  const vb = map.viewBox;
  return `${vb.x} ${vb.y} ${vb.width} ${vb.height}`;
}

export function mapAspectRatio(map: GameMap): string {
  const vb = map.viewBox;
  return `${vb.width} / ${vb.height}`;
}

export function mapDotCenter(
  map: GameMap,
  pos: CellPos
): { x: number; y: number } {
  const t = map.territories[pos.x];
  if (!t) return { x: 0, y: 0 };
  const spotNum = pos.x + 1;
  const layout = getEffectiveLayout(map);
  const fromLayout = layout.positions[spotNum];
  if (fromLayout) return fromLayout;
  return { x: t.dotX, y: t.dotY };
}
