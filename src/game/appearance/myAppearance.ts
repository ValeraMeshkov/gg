import {
  DEFAULT_PLAYER_APPEARANCE,
  type BuildingSkinId,
  type FighterSkinId,
  type PlayerAppearance,
} from "./types";
import { normalizeDisplayColor } from "./displayColors";
import { normalizeBuildingSkin, normalizeFighterSkin } from "./storage";

import { STORAGE_KEYS } from "@/constants/storageKeys";

const MY_SKINS_KEY = STORAGE_KEYS.mySkins;

export function loadMyAppearance(): PlayerAppearance {
  try {
    const raw = localStorage.getItem(MY_SKINS_KEY);
    if (!raw) return { ...DEFAULT_PLAYER_APPEARANCE };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_PLAYER_APPEARANCE };
    }
    const o = parsed as Record<string, unknown>;
    const fighter = normalizeFighterSkin(o.fighter);
    const building = normalizeBuildingSkin(o.building);
    const displayColor = normalizeDisplayColor(o.displayColor);
    return {
      fighter: fighter ?? DEFAULT_PLAYER_APPEARANCE.fighter,
      building: building ?? DEFAULT_PLAYER_APPEARANCE.building,
      displayColor: displayColor ?? DEFAULT_PLAYER_APPEARANCE.displayColor,
    };
  } catch {
    return { ...DEFAULT_PLAYER_APPEARANCE };
  }
}

export function saveMyAppearance(appearance: PlayerAppearance): void {
  try {
    localStorage.setItem(MY_SKINS_KEY, JSON.stringify(appearance));
  } catch {
    /* ignore */
  }
}

export type MyAppearancePatch = Partial<{
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: import("./types").DisplayColorId;
}>;
