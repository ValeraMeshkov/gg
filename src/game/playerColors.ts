/** Реэкспорт модулей цветов игроков (территория, пули, share bar). */
export type {
  OwnedTerritoryColors,
  PlayerDotVariant,
  ShareBarColorView,
} from "./colors/types";

export {
  aimColorsForLocalPlayer,
  dotVariantForOwner,
  isKnownPlayerSlot,
  ownedDotFill,
  ownedTerritoryColors,
  ownedTerritoryColorsForView,
} from "./colors/territory";

export {
  chatAuthorColor,
  projectileColors,
  projectileColorsForPlayer,
  projectileColorsForView,
} from "./colors/projectile";

export { shareBarColorForView, shareBarColorIndex } from "./colors/shareBar";
