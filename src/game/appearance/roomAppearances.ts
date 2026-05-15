import { defaultDisplayColorForSlot } from "../../../shared/displayColors";
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
import type { SyncAppearance } from "../../../shared/wsProtocol";

export function appearancesFromSync(
  players: readonly SyncAppearance[]
): PlayerAppearancesMap {
  const out: PlayerAppearancesMap = {};
  for (const p of players) {
    const fighter = normalizeFighterSkin(p.fighter);
    const building = normalizeBuildingSkin(p.building);
    if (!fighter || !building) continue;
    const displayColor =
      normalizeDisplayColor(p.displayColor) ??
      defaultDisplayColorForSlot(p.slotId);
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
