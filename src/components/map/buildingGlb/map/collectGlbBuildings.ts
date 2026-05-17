import {
  appearanceForPlayer,
  type DisplayColorId,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import {
  getCell,
  isTerritoryIndexHidden,
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
  skin: GlbBuildingSkinId;
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

  map.territories.forEach((territory, index) => {
    if (isTerritoryIndexHidden(map, index, hiddenOpts)) return;
    const cell = getCell(map, index);
    if (!cell.ownerId) return;

    const buildingSkin = appearanceForPlayer(
      playerAppearances,
      cell.ownerId
    ).building;
    if (!isGlbBuildingSkin(buildingSkin) || !isGlbBuildingVisible(buildingSkin)) return;

    const center = mapDotCenter(map, territoryCellPos(index));
    spots.push({
      key: `${territory.id}-${index}`,
      skin: buildingSkin,
      cx: center.x,
      cy: center.y,
      /** Одинаковый квадрат viewport — Bounds подгоняет каждый GLB, как в настройках. */
      targetMapSize: baseMapSize,
    });
  });

  return spots;
}
