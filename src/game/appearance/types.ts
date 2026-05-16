import type {
  BuildingSkinId,
  FighterSkinId,
} from "../../../shared/skinIds";
import type { DisplayColorId } from "../../../shared/displayColors";

export {
  FIGHTER_SKINS,
  BUILDING_SKINS,
  type FighterSkinId,
  type BuildingSkinId,
} from "../../../shared/skinIds";

export { DISPLAY_COLORS, type DisplayColorId } from "../../../shared/displayColors";

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
