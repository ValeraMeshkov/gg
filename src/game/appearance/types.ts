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

export type PlayerAppearance = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
};

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  fighter: "triangle",
  building: "circle",
};
