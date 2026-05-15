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

/** Личный цвет на карте — только у себя в браузере, сопернику не передаётся. */
export const DISPLAY_COLORS = [
  "blue",
  "green",
  "red",
  "orange",
  "violet",
  "gold",
  "cyan",
  "pink",
] as const;

export type DisplayColorId = (typeof DISPLAY_COLORS)[number];

export type PlayerAppearance = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
};

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  fighter: "triangle",
  building: "circle",
  displayColor: "blue",
};
