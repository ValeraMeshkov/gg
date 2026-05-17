import { CELL } from "@/game/constants";
import type { DisplayColorId } from "@/game/appearance";
import type { PlayerAppearancesMap } from "@/game/appearance";
import {
  DISPLAY_PROJECTILE_COLORS,
  PROJECTILE_COLORS,
} from "./palettes";
import {
  effectivePaletteIndexForOwner,
} from "./paletteResolve";
import { ownedTerritoryColorsForView } from "./territory";
import type { ProjectileColorPair } from "./types";

export function projectileColorsForView(
  attackerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  attackerDisplayColor?: DisplayColorId
): ProjectileColorPair {
  const dc =
    attackerId === localPlayerId
      ? (localDisplayColor ?? attackerDisplayColor)
      : attackerDisplayColor;
  if (dc) {
    return DISPLAY_PROJECTILE_COLORS[dc];
  }
  const idx =
    effectivePaletteIndexForOwner(
      attackerId,
      localPlayerId,
      localDisplayColor
    ) ?? 1;
  return PROJECTILE_COLORS[idx] ?? PROJECTILE_COLORS[1]!;
}

export function projectileColorsForPlayer(
  attackerId: string,
  localPlayerId: string,
  appearances: PlayerAppearancesMap,
  localDisplayColor?: DisplayColorId
): ProjectileColorPair {
  if (attackerId === localPlayerId) {
    const dc =
      localDisplayColor ?? appearances[attackerId]?.displayColor;
    if (dc) return DISPLAY_PROJECTILE_COLORS[dc];
  }
  const asOnThisScreen = ownedTerritoryColorsForView(
    attackerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor,
    1,
    appearances
  );
  if (asOnThisScreen) {
    return { fill: asOnThisScreen.fill, stroke: asOnThisScreen.stroke };
  }
  const idx =
    effectivePaletteIndexForOwner(
      attackerId,
      localPlayerId,
      localDisplayColor
    ) ?? 1;
  return PROJECTILE_COLORS[idx] ?? PROJECTILE_COLORS[1]!;
}

export function projectileColors(
  attackerId: string,
  localPlayerId: string
): ProjectileColorPair {
  return projectileColorsForView(attackerId, localPlayerId);
}

export function chatAuthorColor(
  authorSlotId: string,
  localPlayerId: string,
  appearances: PlayerAppearancesMap,
  localDisplayColor?: DisplayColorId
): string {
  return projectileColorsForPlayer(
    authorSlotId,
    localPlayerId,
    appearances,
    localDisplayColor
  ).fill;
}
