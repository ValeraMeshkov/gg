import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import {
  getBuildingSpinSheetUrl,
  hasBuildingSpinSheet,
} from "@/components/map/buildingGlb/spin/buildingSpinSheets";
import type { FighterSkinId } from "@/game/appearance";

/** Боец → 3D-спрайт-лист (тот же bake, что у зданий на карте). */
const FIGHTER_TO_BUILDING_SPIN: Partial<
  Record<FighterSkinId, GlbBuildingSkinId>
> = {
  bomb: "pixellabsBomb",
  star: "tinyPlanetStar",
  rocket: "tinyPlanetEnergy",
  shield: "tinyPlanetShield",
  bear: "freedomShark",
  ghost: "pixellabsUndead",
  ufo: "tinyPlanetIcon",
  diamond: "pixellabs3402",
  clover: "pixellabsBanner",
  heart: "pixellabsSlime",
};

export function buildingSpinSkinForFighter(
  fighter: FighterSkinId
): GlbBuildingSkinId | undefined {
  const skin = FIGHTER_TO_BUILDING_SPIN[fighter];
  if (!skin || !hasBuildingSpinSheet(skin)) return undefined;
  return skin;
}

export function allProjectileSpinSheetUrls(): string[] {
  const urls = new Set<string>();
  for (const skin of Object.values(FIGHTER_TO_BUILDING_SPIN)) {
    if (!skin) continue;
    const url = getBuildingSpinSheetUrl(skin);
    if (url) urls.add(url);
  }
  return [...urls];
}
