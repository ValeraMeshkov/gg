import bombUrl from "@/assets/buildings/bomb.glb?url";
import castleAltUrl from "@/assets/buildings/castle-alt.glb?url";
import castleUrl from "@/assets/buildings/castle.glb?url";
import crystalTreeUrl from "@/assets/buildings/crystal-tree.glb?url";
import houseUrl from "@/assets/buildings/house.glb?url";
import planetBoyUrl from "@/assets/buildings/planet-boy.glb?url";
import planetDefectiveUrl from "@/assets/buildings/planet-defective.glb?url";
import planetIconUrl from "@/assets/buildings/planet-icon.glb?url";
import planetShieldUrl from "@/assets/buildings/planet-shield.glb?url";
import planetStarUrl from "@/assets/buildings/planet-star.glb?url";
import poisonBottleUrl from "@/assets/buildings/poison-bottle.glb?url";
import sharkUrl from "@/assets/buildings/shark.glb?url";
import signpostUrl from "@/assets/buildings/signpost.glb?url";
import skullPotionUrl from "@/assets/buildings/skull-potion.glb?url";
import towerAltUrl from "@/assets/buildings/tower-alt.glb?url";
import towerUrl from "@/assets/buildings/tower.glb?url";
import undeadUrl from "@/assets/buildings/undead.glb?url";
import watchtowerUrl from "@/assets/buildings/watchtower.glb?url";
import zombieUrl from "@/assets/buildings/zombie.glb?url";
import grimReaper3011Url from "@/assets/buildings/pixellabs-grim-reaper-3d-3011.glb?url";
import blendertimerHeart23Url from "@/assets/buildings/blendertimer-heart-23.glb?url";
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
  | "pixellabsSkullPotion"
  | "pixellabsBomb"
  | "pixellabsUndead"
  | "pixellabsZombie"
  | "pixellabsGrimReaper3011"
  | "pixellabsSkeletonArcher4240"
  | "blendertimerHeart23"
  | "pixellabsDagger3178"
  | "tinyPlanetBoy"
  | "tinyPlanetDefective"
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
  /** Нет url — только spin-лист (fighter-only, тяжёлый GLB не в бандле). */
  url?: string;
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
  url?: string,
  mapPinScale?: number
): GlbBuildingCatalogEntry {
  return {
    id,
    glbFile,
    label: buildingGlbShortLabel(id),
    ...(url ? { url } : {}),
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
  glbEntry("pixellabsSkullPotion", "skull-potion.glb", skullPotionUrl),
  glbEntry("pixellabsBomb", "bomb.glb", bombUrl),
  glbEntry("pixellabsUndead", "undead.glb", undeadUrl, 1.2),
  glbEntry("pixellabsZombie", "zombie.glb", zombieUrl, 1.3),
  glbEntry(
    "pixellabsGrimReaper3011",
    "pixellabs-grim-reaper-3d-3011.glb",
    grimReaper3011Url,
    1.1
  ),
  glbEntry(
    "pixellabsSkeletonArcher4240",
    "pixellabs-skeleton-archer-4240.glb",
    undefined,
    1.1
  ),
  glbEntry(
    "blendertimerHeart23",
    "blendertimer-heart-23.glb",
    blendertimerHeart23Url,
    1
  ),
  glbEntry("pixellabsDagger3178", "pixellabs-dagger-3178.glb", undefined, 0.9),
  glbEntry("tinyPlanetBoy", "planet-boy.glb", planetBoyUrl, 1.2),
  glbEntry("tinyPlanetDefective", "planet-defective.glb", planetDefectiveUrl),
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
  GLB_BUILDING_CATALOG.flatMap((e) => (e.url ? [[e.id, e.url]] : []))
) as Partial<Record<GlbBuildingSkinId, string>>;

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

/** GLB-здание из каталога, доступное как скин точки (не скрытый «только для бойца»). */
export type PlayableGlbBuildingSkinId = Extract<
  GlbBuildingSkinId,
  BuildingSkinId
>;

export function isGlbBuildingSkin(
  skin: BuildingSkinId
): skin is PlayableGlbBuildingSkinId {
  return (GLB_BUILDING_SKIN_IDS as readonly string[]).includes(skin);
}

export function getGlbBuildingUrl(skin: GlbBuildingSkinId): string {
  const url = URL_BY_SKIN[skin];
  if (!url) throw new Error(`No GLB url for skin: ${skin}`);
  return url;
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
  return GLB_BUILDING_CATALOG.flatMap((e) => (e.url ? [e.url] : []));
}
