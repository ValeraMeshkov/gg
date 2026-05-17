import { displayColorSwatch } from "@/game/appearance";
import type { DisplayColorId } from "@/game/appearance";
import type { PlayerAppearancesMap } from "@/game/appearance";
import {
  SHARE_BAR_BY_PALETTE_INDEX,
  SHARE_BAR_COLOR_BY_PLAYER_ID,
} from "./palettes";
import {
  displayColorForOwner,
  effectivePaletteIndexForOwner,
  paletteIndexForOwner,
} from "./paletteResolve";
import type { ShareBarColorView } from "./types";

export function shareBarColorIndex(
  playerId: string,
  _localPlayerId?: string
): number {
  return SHARE_BAR_COLOR_BY_PLAYER_ID[playerId] ?? 2;
}

export function shareBarColorForView(
  playerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  appearances?: PlayerAppearancesMap
): ShareBarColorView {
  const dc = displayColorForOwner(
    playerId,
    localPlayerId,
    localDisplayColor,
    appearances
  );
  if (dc) {
    return {
      colorIndex: shareBarColorIndex(playerId),
      background: displayColorSwatch(dc),
    };
  }
  const paletteIdx = effectivePaletteIndexForOwner(
    playerId,
    localPlayerId,
    localDisplayColor
  );
  const slotIdx = paletteIndexForOwner(playerId);
  if (
    paletteIdx != null &&
    slotIdx != null &&
    paletteIdx !== slotIdx &&
    SHARE_BAR_BY_PALETTE_INDEX[paletteIdx] != null
  ) {
    return { colorIndex: SHARE_BAR_BY_PALETTE_INDEX[paletteIdx]! };
  }
  return { colorIndex: shareBarColorIndex(playerId) };
}
