import { CELL } from "@/game/constants";
import type { DisplayColorId } from "@/game/appearance";
import type { PlayerAppearancesMap } from "@/game/appearance";
import { isPlayerSlotId } from "@/shared/playerSlots";
import {
  DISPLAY_COLOR_PALETTES,
  lerpRgb,
  TERRITORY_FILL_BLEND_PEAK,
} from "./palettes";
import {
  displayColorForOwner,
  effectivePaletteIndexForOwner,
  paletteForOwner,
} from "./paletteResolve";
import type { OwnedTerritoryColors, Palette, PlayerDotVariant } from "./types";

export function colorsFromPalette(
  palette: Palette,
  units: number,
  blendPeak: number = TERRITORY_FILL_BLEND_PEAK
): OwnedTerritoryColors {
  const t = Math.min(1, Math.max(0, units) / CELL.ownedCap);
  const blend = t * blendPeak;
  return {
    fill: lerpRgb(palette.fillPale, palette.fillFull, blend),
    stroke: lerpRgb(palette.strokePale, palette.strokeFull, blend),
  };
}

export function ownedTerritoryColorsForView(
  ownerId: string,
  localPlayerId: string,
  units: number,
  localDisplayColor?: DisplayColorId,
  blendPeak: number = TERRITORY_FILL_BLEND_PEAK,
  appearances?: PlayerAppearancesMap
): OwnedTerritoryColors | null {
  const dc = displayColorForOwner(
    ownerId,
    localPlayerId,
    localDisplayColor,
    appearances
  );
  if (dc) {
    return colorsFromPalette(DISPLAY_COLOR_PALETTES[dc], units, blendPeak);
  }
  const palette = paletteForOwner(ownerId, localPlayerId, localDisplayColor);
  if (!palette) return null;
  return colorsFromPalette(palette, units, blendPeak);
}

export function ownedTerritoryColors(
  ownerId: string,
  localPlayerId: string,
  units: number
): OwnedTerritoryColors | null {
  return ownedTerritoryColorsForView(ownerId, localPlayerId, units);
}

export function ownedDotFill(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  appearances?: PlayerAppearancesMap
): string | null {
  const maxed = ownedTerritoryColorsForView(
    ownerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor,
    1,
    appearances
  );
  return maxed?.fill ?? null;
}

export function dotVariantForOwner(
  ownerId: string | undefined,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): PlayerDotVariant {
  if (!ownerId) return "neutral";
  const idx = effectivePaletteIndexForOwner(
    ownerId,
    localPlayerId,
    localDisplayColor
  );
  if (idx === 1) return "p2";
  if (idx === 2) return "p3";
  return "p1";
}

export function isKnownPlayerSlot(ownerId: string | undefined): boolean {
  return ownerId != null && isPlayerSlotId(ownerId);
}

const RGB_RE = /^rgb\((\d+),(\d+),(\d+)\)$/;
const AIM_BLEND_WHITE: [number, number, number] = [255, 255, 255];

function parseRgb(color: string): [number, number, number] | null {
  const m = RGB_RE.exec(color);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** `rgb(r,g,b)` → `rgba(r,g,b,a)`; иначе исходная строка. */
export function colorWithAlpha(color: string, alpha: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a})`;
}

function softPlayerTint(color: string, amount: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  return lerpRgb(AIM_BLEND_WHITE, rgb, amount);
}

export function aimColorsForLocalPlayer(
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): {
  stroke: string;
  head: string;
} {
  const owned = ownedTerritoryColorsForView(
    localPlayerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor
  );
  if (!owned) {
    return {
      stroke: "rgba(42, 158, 255, 0.38)",
      head: "rgba(20, 110, 210, 0.48)",
    };
  }
  return {
    stroke: softPlayerTint(owned.fill, 0.32),
    head: softPlayerTint(owned.stroke, 0.24),
  };
}
