import {
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  type TerritoryGameMap,
} from "./maps";

export type FirstMoveHintEndpoints = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  fromIndex: number;
  toIndex: number;
};

/**
 * Своя точка с минимальным числом юнитов → ближайшая чужая/нейтральная (учёт скрытых точек как в бою).
 */
export function firstMoveHintEndpoints(
  map: TerritoryGameMap,
  localPlayerId: string,
  hiddenOpts?: { syncMapLayout?: boolean }
): FirstMoveHintEndpoints | null {
  const n = map.territories.length;
  let bestFrom: { index: number; units: number } | null = null;
  for (let i = 0; i < n; i++) {
    if (isTerritoryIndexHidden(map, i, hiddenOpts)) continue;
    const cell = getCell(map, i);
    const u = cell.units ?? 0;
    if (cell.ownerId !== localPlayerId || u <= 0) continue;
    if (
      bestFrom === null ||
      u < bestFrom.units ||
      (u === bestFrom.units && i < bestFrom.index)
    ) {
      bestFrom = { index: i, units: u };
    }
  }
  if (bestFrom === null) return null;

  const fromPt = mapDotCenter(map, { x: bestFrom.index, y: 0 });
  let bestTo: { index: number; d2: number } | null = null;
  for (let i = 0; i < n; i++) {
    if (i === bestFrom.index) continue;
    if (isTerritoryIndexHidden(map, i, hiddenOpts)) continue;
    const cell = getCell(map, i);
    if (cell.ownerId === localPlayerId) continue;
    const pt = mapDotCenter(map, { x: i, y: 0 });
    const d2 = (pt.x - fromPt.x) ** 2 + (pt.y - fromPt.y) ** 2;
    if (
      bestTo === null ||
      d2 < bestTo.d2 ||
      (d2 === bestTo.d2 && i < bestTo.index)
    ) {
      bestTo = { index: i, d2 };
    }
  }
  if (bestTo === null) return null;
  const toPt = mapDotCenter(map, { x: bestTo.index, y: 0 });
  return {
    from: fromPt,
    to: toPt,
    fromIndex: bestFrom.index,
    toIndex: bestTo.index,
  };
}
