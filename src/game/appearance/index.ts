export {
  BUILDING_SKIN_OPTIONS,
  FIGHTER_SKIN_OPTIONS,
  type SkinOption,
} from "./catalog";
export {
  DISPLAY_COLOR_OPTIONS,
  displayColorSwatch,
  normalizeDisplayColor,
  type DisplayColorOption,
} from "./displayColors";
export {
  appearanceForPlayer,
  loadPlayerAppearances,
  savePlayerAppearances,
  type PlayerAppearancesMap,
} from "./storage";
export {
  loadMyAppearance,
  saveMyAppearance,
  type MyAppearancePatch,
} from "./myAppearance";
export { appearancesFromSync } from "./roomAppearances";
export {
  normalizeBuildingSkin,
  normalizeFighterSkin,
} from "./storage";
export {
  BUILDING_SKINS,
  DEFAULT_PLAYER_APPEARANCE,
  DISPLAY_COLORS,
  FIGHTER_SKINS,
  type BuildingSkinId,
  type DisplayColorId,
  type FighterSkinId,
  type PlayerAppearance,
} from "./types";
