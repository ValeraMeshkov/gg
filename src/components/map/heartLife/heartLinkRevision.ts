import {
  appearanceForPlayer,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import { getCell, isTerritoryIndexHidden, type TerritoryGameMap } from "@/game/maps";
import { isHeartBuilding } from "@/shared/heartLife";

/** Только владение точками — геометрия цепочки не дёргается при ±HP. */
export function buildHeartLinkRevision(
  map: TerritoryGameMap,
  playerAppearances: PlayerAppearancesMap,
  hiddenOpts?: { syncMapLayout?: boolean }
): string {
  const parts: string[] = [map.id];
  map.territories.forEach((_, index) => {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) return;
    const ownerId = getCell(map, index).ownerId;
    if (!ownerId) return;
    if (!isHeartBuilding(appearanceForPlayer(playerAppearances, ownerId).building)) {
      return;
    }
    parts.push(`${index}:${ownerId}`);
  });
  return parts.join(";");
}
