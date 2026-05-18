import {
  DEFAULT_BUILDING_SKIN,
  type BuildingSkinId,
  type FighterSkinId,
} from "@/shared/skinIds";
import type { DisplayColorId } from "@/shared/displayColors";

export {
  FIGHTER_SKINS,
  BUILDING_SKINS,
  type FighterSkinId,
  type BuildingSkinId,
} from "@/shared/skinIds";

export { DISPLAY_COLORS, type DisplayColorId } from "@/shared/displayColors";

export type PlayerAppearance = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
};

export const DEFAULT_PLAYER_APPEARANCE: PlayerAppearance = {
  fighter: "dagger",
  building: DEFAULT_BUILDING_SKIN,
  displayColor: "blue",
};
