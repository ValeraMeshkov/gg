import { defaultDisplayColorForSlot } from "@/shared/displayColors";
import {
  resolveRoomDisplayColor,
  sortSyncAppearancesBySlot,
} from "@/shared/roomPlayerColors";
import { normalizeDisplayColor } from "./displayColors";
import {
  normalizeBuildingSkin,
  normalizeFighterSkin,
  type PlayerAppearancesMap,
} from "./storage";
import type {
  BuildingSkinId,
  DisplayColorId,
  FighterSkinId,
  PlayerAppearance,
} from "./types";
import type { SyncAppearance } from "@/shared/wsProtocol";

export function appearancesFromSync(
  players: readonly SyncAppearance[],
  existing: PlayerAppearancesMap = {}
): PlayerAppearancesMap {
  const assigned = new Map<string, DisplayColorId>();
  for (const [slotId, app] of Object.entries(existing)) {
    assigned.set(slotId, app.displayColor);
  }

  const out: PlayerAppearancesMap = {};
  for (const p of sortSyncAppearancesBySlot(players)) {
    const fighter = normalizeFighterSkin(p.fighter);
    const building = normalizeBuildingSkin(p.building);
    if (!fighter || !building) continue;
    const requested =
      normalizeDisplayColor(p.displayColor) ??
      defaultDisplayColorForSlot(p.slotId);
    const displayColor = resolveRoomDisplayColor(
      p.slotId,
      requested,
      assigned
    );
    assigned.set(p.slotId, displayColor);
    out[p.slotId] = {
      fighter,
      building,
      displayColor,
    };
  }
  return out;
}

export function toSyncAppearance(
  slotId: string,
  appearance: PlayerAppearance
): {
  slotId: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
} {
  return {
    slotId,
    fighter: appearance.fighter,
    building: appearance.building,
    displayColor: appearance.displayColor,
  };
}
