/**
 * Канонические id скинов бойца и здания.
 * Клиент и сервер импортируют отсюда — без дублирования массивов.
 */

export const FIGHTER_SKINS = [
  "triangle",
  "heart",
  "bear",
  "star",
  "diamond",
  "ghost",
  "rocket",
  "clover",
  "bomb",
  "ufo",
  "shield",
] as const;

export type FighterSkinId = (typeof FIGHTER_SKINS)[number];

/** Подписи бойцов для UI (единый источник с id). */
export const FIGHTER_SKIN_LABELS: Record<FighterSkinId, string> = {
  triangle: "Треугольник",
  heart: "Сердце",
  bear: "Мишка",
  star: "Звезда",
  diamond: "Ромб",
  ghost: "Призрак",
  rocket: "Ракета",
  clover: "Клевер",
  bomb: "Бомба",
  ufo: "НЛО",
  shield: "Щит",
};

/** Здание на точке территории. */
export const BUILDING_SKINS = [
  "cube",
  "pixellabs",
  "pixellabs3822",
  "pixellabsWatchtower",
  "pixellabsSignpost",
  "pixellabs3402",
  "pixellabsPoisonBottle",
  "pixellabsSkull",
  "pixellabsSkullPotion",
  "pixellabsSlime",
  "pixellabsBanner",
  "pixellabsBomb",
  "pixellabsPotionBottleAlt",
  "pixellabsUndead",
  "pixellabsZombie",
  "pixellabsGrimReaper3011",
  "tinyPlanetBoy",
  "tinyPlanetDefective",
  "tinyPlanetEnergy",
  "tinyPlanetIcon",
  "tinyPlanetShield",
  "tinyPlanetStar",
  "freedomShark",
  "freedomCastle",
  "freedomCastle4441",
  "freedomHouse",
] as const;

export type BuildingSkinId = (typeof BUILDING_SKINS)[number];

/** Здание по умолчанию для новых игроков и незаданных скинов (вместо куба). */
export const DEFAULT_BUILDING_SKIN =
  "pixellabs3822" satisfies BuildingSkinId;

/** Старые id → куб (профили, боты). */
const _legacyBuilding = DEFAULT_BUILDING_SKIN;

export const LEGACY_BUILDING_SKIN_MAP: Record<string, BuildingSkinId> = {
  circle: _legacyBuilding,
  fortress: _legacyBuilding,
  flower: _legacyBuilding,
  crown: _legacyBuilding,
  barn: _legacyBuilding,
  temple: _legacyBuilding,
  lighthouse: _legacyBuilding,
  house: _legacyBuilding,
  castle: _legacyBuilding,
  skull: _legacyBuilding,
  flag: _legacyBuilding,
  tower: _legacyBuilding,
  tent: _legacyBuilding,
  tree: _legacyBuilding,
  mushroom: _legacyBuilding,
  pyramid: _legacyBuilding,
  igloo: _legacyBuilding,
  windmill: _legacyBuilding,
  volcano: _legacyBuilding,
  crystal: _legacyBuilding,
  campfire: _legacyBuilding,
  detail_skull: _legacyBuilding,
  star3d: _legacyBuilding,
  heart3d: _legacyBuilding,
  castle3d: _legacyBuilding,
  cube: _legacyBuilding,
  /** Старое «Зелье» → флакон (3D). */
  pixellabsPotion: "pixellabsPotionBottleAlt",
  earthGlobe: _legacyBuilding,
  magicRingRed: _legacyBuilding,
};

/** Любой id → здание из каталога; удалённые и cube → дефолт. */
export function coerceBuildingSkinId(skin: unknown): BuildingSkinId {
  if (typeof skin === "string") {
    const mapped = LEGACY_BUILDING_SKIN_MAP[skin];
    if (mapped) return mapped;
    if (skin.startsWith("fort") || skin.endsWith("3d")) {
      return DEFAULT_BUILDING_SKIN;
    }
    if ((BUILDING_SKINS as readonly string[]).includes(skin)) {
      const id = skin as BuildingSkinId;
      return id === "cube" ? DEFAULT_BUILDING_SKIN : id;
    }
  }
  return DEFAULT_BUILDING_SKIN;
}
