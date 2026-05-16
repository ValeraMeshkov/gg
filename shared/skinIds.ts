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
  "skull",
] as const;

export type BuildingSkinId = (typeof BUILDING_SKINS)[number];
