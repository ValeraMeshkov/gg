import bannerUrl from "@/assets/buildings/banner.glb?url";
import bombUrl from "@/assets/buildings/bomb.glb?url";
import castleAltUrl from "@/assets/buildings/castle-alt.glb?url";
import castleUrl from "@/assets/buildings/castle.glb?url";
import crystalTreeUrl from "@/assets/buildings/crystal-tree.glb?url";
import houseUrl from "@/assets/buildings/house.glb?url";
import planetBoyUrl from "@/assets/buildings/planet-boy.glb?url";
import planetDefectiveUrl from "@/assets/buildings/planet-defective.glb?url";
import planetEnergyUrl from "@/assets/buildings/planet-energy.glb?url";
import planetIconUrl from "@/assets/buildings/planet-icon.glb?url";
import planetShieldUrl from "@/assets/buildings/planet-shield.glb?url";
import planetStarUrl from "@/assets/buildings/planet-star.glb?url";
import poisonBottleUrl from "@/assets/buildings/poison-bottle.glb?url";
import potionBottleAltUrl from "@/assets/buildings/potion-bottle-alt.glb?url";
import sharkUrl from "@/assets/buildings/shark.glb?url";
import signpostUrl from "@/assets/buildings/signpost.glb?url";
import skullPotionUrl from "@/assets/buildings/skull-potion.glb?url";
import skullUrl from "@/assets/buildings/skull.glb?url";
import slimeUrl from "@/assets/buildings/slime.glb?url";
import towerAltUrl from "@/assets/buildings/tower-alt.glb?url";
import towerUrl from "@/assets/buildings/tower.glb?url";
import undeadUrl from "@/assets/buildings/undead.glb?url";
import watchtowerUrl from "@/assets/buildings/watchtower.glb?url";
import zombieUrl from "@/assets/buildings/zombie.glb?url";
import grimReaper3011Url from "@/assets/buildings/pixellabs-grim-reaper-3d-3011.glb?url";
import {
  DEFAULT_BUILDING_SKIN,
  type BuildingSkinId,
} from "@/shared/skinIds";
import {
  buildingGlbShortLabel,
  registerGlbSpinSheetFiles,
} from "./buildingGlbShortNames";
import { MAP_PIN_SIZE } from "@/components/map/buildingGlb/constants/isoConstants";

export type GlbBuildingSkinId =
  | "pixellabs"
  | "pixellabs3822"
  | "pixellabsWatchtower"
  | "pixellabsSignpost"
  | "pixellabs3402"
  | "pixellabsPoisonBottle"
  | "pixellabsSkull"
  | "pixellabsSkullPotion"
  | "pixellabsSlime"
  | "pixellabsBanner"
  | "pixellabsBomb"
  | "pixellabsPotionBottleAlt"
  | "pixellabsUndead"
  | "pixellabsZombie"
  | "pixellabsGrimReaper3011"
  | "tinyPlanetBoy"
  | "tinyPlanetDefective"
  | "tinyPlanetEnergy"
  | "tinyPlanetIcon"
  | "tinyPlanetShield"
  | "tinyPlanetStar"
  | "freedomShark"
  | "freedomCastle"
  | "freedomCastle4441"
  | "freedomHouse";

/** Одна запись = id в коде, файл GLB и масштаб на карте. */
export type GlbBuildingCatalogEntry = {
  /** Ключ в коде (GLB_MAP_PIN_SCALE, скины игрока). */
  id: GlbBuildingSkinId;
  /** Имя файла в assets/buildings/. */
  glbFile: string;
  /** Подпись в селекторе настроек. */
  label: string;
  url: string;
  /**
   * Масштаб при запекании PNG (размер модели в спрайт-листе).
   * После смены — npm run glb:bake-spin.
   */
  mapPinScale?: number;
};

export { DEFAULT_BUILDING_SKIN };

/**
 * Каталог 3D-зданий. Id и mapPinScale — единый источник правды для редактора и игры.
 */
function glbEntry(
  id: GlbBuildingSkinId,
  glbFile: string,
  url: string,
  mapPinScale?: number
): GlbBuildingCatalogEntry {
  return {
    id,
    glbFile,
    label: buildingGlbShortLabel(id),
    url,
    ...(mapPinScale !== undefined ? { mapPinScale } : {}),
  };
}

export const GLB_BUILDING_CATALOG: readonly GlbBuildingCatalogEntry[] = [
  glbEntry("pixellabs", "tower.glb", towerUrl),
  glbEntry("pixellabs3822", "tower-alt.glb", towerAltUrl),
  glbEntry("pixellabsWatchtower", "watchtower.glb", watchtowerUrl),
  glbEntry("pixellabsSignpost", "signpost.glb", signpostUrl),
  glbEntry("pixellabs3402", "crystal-tree.glb", crystalTreeUrl),
  glbEntry("pixellabsPoisonBottle", "poison-bottle.glb", poisonBottleUrl),
  glbEntry("pixellabsSkull", "skull.glb", skullUrl),
  glbEntry("pixellabsSkullPotion", "skull-potion.glb", skullPotionUrl),
  glbEntry("pixellabsSlime", "slime.glb", slimeUrl),
  glbEntry("pixellabsBanner", "banner.glb", bannerUrl),
  glbEntry("pixellabsBomb", "bomb.glb", bombUrl),
  glbEntry("pixellabsPotionBottleAlt", "potion-bottle-alt.glb", potionBottleAltUrl),
  glbEntry("pixellabsUndead", "undead.glb", undeadUrl, 1.2),
  glbEntry("pixellabsZombie", "zombie.glb", zombieUrl, 1.3),
  glbEntry(
    "pixellabsGrimReaper3011",
    "pixellabs-grim-reaper-3d-3011.glb",
    grimReaper3011Url,
    1.1
  ),
  glbEntry("tinyPlanetBoy", "planet-boy.glb", planetBoyUrl, 1.2),
  glbEntry("tinyPlanetDefective", "planet-defective.glb", planetDefectiveUrl),
  glbEntry("tinyPlanetEnergy", "planet-energy.glb", planetEnergyUrl, 1),
  glbEntry("tinyPlanetIcon", "planet-icon.glb", planetIconUrl, 1),
  glbEntry("tinyPlanetShield", "planet-shield.glb", planetShieldUrl, 1),
  glbEntry("tinyPlanetStar", "planet-star.glb", planetStarUrl, 1),
  glbEntry("freedomShark", "shark.glb", sharkUrl, 1.5),
  glbEntry("freedomCastle", "castle.glb", castleUrl, 1),
  glbEntry("freedomCastle4441", "castle-alt.glb", castleAltUrl),
  glbEntry("freedomHouse", "house.glb", houseUrl, 1),
] as const;

registerGlbSpinSheetFiles(
  GLB_BUILDING_CATALOG.map((e) => ({ glbFile: e.glbFile, skinId: e.id }))
);

export const GLB_BUILDING_SKIN_IDS: readonly GlbBuildingSkinId[] =
  GLB_BUILDING_CATALOG.map((e) => e.id);

const URL_BY_SKIN = Object.fromEntries(
  GLB_BUILDING_CATALOG.map((e) => [e.id, e.url])
) as Record<GlbBuildingSkinId, string>;

/** Только отличия от 1 — как раньше GLB_MAP_PIN_SCALE в isoConstants. */
export const GLB_MAP_PIN_SCALE: Record<GlbBuildingSkinId, number> =
  Object.fromEntries(
    GLB_BUILDING_CATALOG.flatMap((e) =>
      e.mapPinScale != null && e.mapPinScale !== 1
        ? [[e.id, e.mapPinScale]]
        : []
    )
  ) as Record<GlbBuildingSkinId, number>;

export const GLB_MAP_SIZE_SCALE = MAP_PIN_SIZE;

export function isGlbBuildingSkin(
  skin: BuildingSkinId
): skin is GlbBuildingSkinId {
  return (GLB_BUILDING_SKIN_IDS as readonly string[]).includes(skin);
}

export function getGlbBuildingUrl(skin: GlbBuildingSkinId): string {
  return URL_BY_SKIN[skin];
}

export function getGlbBuildingCatalogEntry(
  skin: GlbBuildingSkinId
): GlbBuildingCatalogEntry {
  return GLB_BUILDING_CATALOG.find((e) => e.id === skin)!;
}

export function getGlbMapScale(skin: GlbBuildingSkinId): number {
  return getGlbBuildingCatalogEntry(skin).mapPinScale ?? 1;
}

export function allGlbBuildingUrls(): string[] {
  return GLB_BUILDING_CATALOG.map((e) => e.url);
}
