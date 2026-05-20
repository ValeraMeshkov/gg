import {
  appearanceForPlayer,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import {
  getCell,
  isTerritoryIndexHidden,
  type TerritoryGameMap,
} from "@/game/maps";
import { isGlbBuildingSkin } from "@/components/map/buildingGlb/catalog";

/**
 * Ключ меняется только при появлении/смене владельца GLB-точки или скина здания,
 * не при изменении units в клетке.
 */
export function glbSpotsStableKey(
  map: TerritoryGameMap,
  playerAppearances: PlayerAppearancesMap,
  hiddenOpts?: { syncMapLayout?: boolean }
): string {
  const parts: string[] = [];
  map.territories.forEach((territory, index) => {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) return;
    const cell = getCell(map, index);
    if (!cell.ownerId) return;
    const skin = appearanceForPlayer(playerAppearances, cell.ownerId).building;
    if (!isGlbBuildingSkin(skin)) return;
    // Щит не включаем: +1 каждые 2 с не должен пересобирать все GLB-пины.
    parts.push(`${territory.id}:${index}:${cell.ownerId}:${skin}`);
  });
  return parts.join("|");
}
