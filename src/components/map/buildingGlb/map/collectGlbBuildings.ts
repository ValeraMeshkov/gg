import {
  appearanceForPlayer,
  type DisplayColorId,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import {
  forEachVisibleOwnedTerritorySpot,
  mapDotCenter,
  territoryCellPos,
  type TerritoryGameMap,
} from "@/game/maps";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { GLB_MAP_SIZE_SCALE, isGlbBuildingSkin } from "@/components/map/buildingGlb/catalog";
import { MAP_PIN_REFERENCE_PX } from "@/components/map/buildingGlb/constants/isoConstants";
import { isGlbBuildingVisible } from "@/components/map/buildingGlb/catalog/glbBuildingVisibility";

export type GlbBuildingSpot = {
  key: string;
  /** Индекс клетки на карте — актуальный щит читается при отрисовке. */
  cellIndex: number;
  skin: GlbBuildingSkinId;
  ownerId: string;
  cx: number;
  cy: number;
  targetMapSize: number;
};

export function collectGlbBuildings(
  map: TerritoryGameMap,
  _localPlayerId: string,
  _localDisplayColor: DisplayColorId | undefined,
  playerAppearances: PlayerAppearancesMap,
  hiddenOpts?: { syncMapLayout?: boolean }
): GlbBuildingSpot[] {
  const spots: GlbBuildingSpot[] = [];
  /** Тот же квадрат, что в настройках (84px × MAP_PIN_SIZE). */
  const baseMapSize = MAP_PIN_REFERENCE_PX * GLB_MAP_SIZE_SCALE;

  forEachVisibleOwnedTerritorySpot(map, hiddenOpts, ({ index, ownerId }) => {
    const buildingSkin = appearanceForPlayer(playerAppearances, ownerId).building;
    if (!isGlbBuildingSkin(buildingSkin) || !isGlbBuildingVisible(buildingSkin)) return;

    const center = mapDotCenter(map, territoryCellPos(index));
    spots.push({
      key: `${map.territories[index]!.id}-${index}`,
      cellIndex: index,
      skin: buildingSkin,
      ownerId,
      cx: center.x,
      cy: center.y,
      targetMapSize: baseMapSize,
    });
  });

  return spots;
}
