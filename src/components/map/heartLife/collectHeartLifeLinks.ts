import {
  appearanceForPlayer,
  type DisplayColorId,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import { ownedDotFill } from "@/game/colors/territory";
import {
  getCell,
  isTerritoryIndexHidden,
  mapDotCenter,
  territoryCellPos,
  type TerritoryGameMap,
} from "@/game/maps";
import {
  buildHeartLifeChainPathD,
  collectHeartLifeNodes,
  isHeartBuilding,
} from "@/shared/heartLife";

export type HeartLifeChainDraw = {
  key: string;
  ownerId: string;
  color: string;
  pathD: string;
};

export function collectHeartLifeChains(
  map: TerritoryGameMap,
  localPlayerId: string,
  localDisplayColor: DisplayColorId | undefined,
  playerAppearances: PlayerAppearancesMap,
  hiddenOpts?: { syncMapLayout?: boolean }
): HeartLifeChainDraw[] {
  const playable: number[] = [];
  map.territories.forEach((_, index) => {
    if (!isTerritoryIndexHidden(map, index, hiddenOpts)) playable.push(index);
  });

  const ownerIds = new Set<string>();
  for (const index of playable) {
    const ownerId = getCell(map, index).ownerId;
    if (ownerId) ownerIds.add(ownerId);
  }

  const chains: HeartLifeChainDraw[] = [];
  for (const ownerId of ownerIds) {
    const building = appearanceForPlayer(playerAppearances, ownerId).building;
    if (!isHeartBuilding(building)) continue;

    const color =
      ownedDotFill(ownerId, localPlayerId, localDisplayColor, playerAppearances) ??
      "rgba(255, 80, 120, 0.85)";

    const nodes = collectHeartLifeNodes(
      map.cells,
      playable,
      ownerId,
      (index) => mapDotCenter(map, territoryCellPos(index))
    );
    const pathD = buildHeartLifeChainPathD(nodes);
    if (!pathD) continue;

    chains.push({
      key: ownerId,
      ownerId,
      color,
      pathD,
    });
  }

  return chains;
}

/** @deprecated используйте `collectHeartLifeChains` */
export type HeartLifeLinkDraw = HeartLifeChainDraw;

/** @deprecated */
export const collectHeartLifeLinks = collectHeartLifeChains;
