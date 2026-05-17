import type { DisplayColorId } from "@/game/appearance";
import type { PlayerAppearancesMap } from "@/game/appearance";
import {
  isPlayerSlotId,
  slotIndexFromId,
} from "@/shared/playerSlots";
import {
  PALETTE_INDEX_BY_PLAYER_ID,
  PALETTES,
  SLOT_PALETTE_TO_DISPLAY,
} from "./palettes";
import type { Palette } from "./types";

export function paletteIndexForOwner(ownerId: string): number | null {
  if (!isPlayerSlotId(ownerId)) return null;
  return PALETTE_INDEX_BY_PLAYER_ID[ownerId] ?? slotIndexFromId(ownerId) + 1;
}

function slotConflictsWithDisplayColor(
  slotPaletteIndex: number,
  localDisplayColor: DisplayColorId
): boolean {
  return SLOT_PALETTE_TO_DISPLAY[slotPaletteIndex] === localDisplayColor;
}

function alternatePaletteIndex(
  slotIdx: number,
  localDisplayColor: DisplayColorId
): number {
  for (let step = 1; step < PALETTES.length; step++) {
    const alt = ((slotIdx - 1 + step) % (PALETTES.length - 1)) + 1;
    if (!slotConflictsWithDisplayColor(alt, localDisplayColor)) return alt;
  }
  return slotIdx;
}

export function effectivePaletteIndexForOwner(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): number | null {
  const slotIdx = paletteIndexForOwner(ownerId);
  if (slotIdx === null) return null;
  if (
    ownerId !== localPlayerId &&
    localDisplayColor &&
    slotConflictsWithDisplayColor(slotIdx, localDisplayColor)
  ) {
    return alternatePaletteIndex(slotIdx, localDisplayColor);
  }
  return slotIdx;
}

export function paletteForOwner(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): Palette | null {
  const idx = effectivePaletteIndexForOwner(
    ownerId,
    localPlayerId,
    localDisplayColor
  );
  if (idx === null) return null;
  return PALETTES[idx] ?? PALETTES[1]!;
}

export function displayColorForOwner(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  appearances?: PlayerAppearancesMap
): DisplayColorId | undefined {
  const fromAppearance = appearances?.[ownerId]?.displayColor;
  if (fromAppearance) return fromAppearance;
  if (ownerId === localPlayerId) return localDisplayColor;
  return undefined;
}
