import {
  normalizeBuildingSkin,
  normalizeFighterSkin,
  type PlayerAppearancesMap,
} from "./storage";
import {
  DEFAULT_PLAYER_APPEARANCE,
  type BuildingSkinId,
  type FighterSkinId,
  type PlayerAppearance,
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
    out[p.slotId] = {
      fighter,
      building,
      displayColor: DEFAULT_PLAYER_APPEARANCE.displayColor,
    };
  }
  return out;
}

export function toSyncAppearance(
  slotId: string,
  appearance: PlayerAppearance
): { slotId: string; fighter: FighterSkinId; building: BuildingSkinId } {
  return {
    slotId,
    fighter: appearance.fighter,
    building: appearance.building,
  };
}
