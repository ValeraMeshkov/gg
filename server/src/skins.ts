/** Допустимые id скинов (синхронизировать с src/game/appearance/types.ts). */
export const FIGHTER_SKINS = [
  "triangle",
  "heart",
  "skull",
  "bear",
  "smile",
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

export const BUILDING_SKINS = [
  "circle",
  "fortress",
  "flower",
  "crown",
  "barn",
  "temple",
  "lighthouse",
  "house",
  "castle",
] as const;

export type BuildingSkinId = (typeof BUILDING_SKINS)[number];

export const DEFAULT_FIGHTER = "triangle";
export const DEFAULT_BUILDING = "circle";
