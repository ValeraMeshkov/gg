import {
  coerceBuildingSkinId,
  DEFAULT_BUILDING_SKIN,
  LEGACY_BUILDING_SKIN_MAP,
} from "@/shared/skinIds";
import { isGlbBuildingSkin, isGlbBuildingVisible } from "@/components/map/buildingGlb";
import { normalizeDisplayColor } from "./displayColors";
import {
  coerceWeaponFighterSkin,
  defaultFighterForSlotIndex,
  LEGACY_FIGHTER_SKIN_MAP,
} from "@/shared/defaultFighters";
import { PLAYER_SLOT_IDS, slotIndexFromId } from "@/shared/playerSlots";
import {
  BUILDING_SKINS,
  DEFAULT_PLAYER_APPEARANCE,
  FIGHTER_SKINS,
  type BuildingSkinId,
  type FighterSkinId,
  type PlayerAppearance,
} from "./types";

import { STORAGE_KEYS } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_KEYS.playerAppearance;

export type PlayerAppearancesMap = Record<string, PlayerAppearance>;

function isFighterSkin(v: unknown): v is FighterSkinId {
  return (
    typeof v === "string" && (FIGHTER_SKINS as readonly string[]).includes(v)
  );
}

function isBuildingSkin(v: unknown): v is BuildingSkinId {
  return (
    typeof v === "string" && (BUILDING_SKINS as readonly string[]).includes(v)
  );
}

const REMOVED_FIGHTER_SKINS = new Set([
  "bolt",
  "cat",
  "fish",
  "moon",
  "flame",
  "skull",
  "smile",
  "diamond",
  "ghost",
  "clover",
  "ufo",
  "shield",
]);

/** Устаревшие id из localStorage → актуальный скин. */
export function normalizeFighterSkin(
  v: unknown,
  playerId?: string
): FighterSkinId | null {
  if (typeof v === "string" && REMOVED_FIGHTER_SKINS.has(v)) {
    return playerId != null
      ? defaultFighterForSlotIndex(slotIndexFromId(playerId))
      : DEFAULT_PLAYER_APPEARANCE.fighter;
  }
  if (typeof v === "string" && LEGACY_FIGHTER_SKIN_MAP[v]) {
    return playerId != null
      ? defaultFighterForSlotIndex(slotIndexFromId(playerId))
      : LEGACY_FIGHTER_SKIN_MAP[v];
  }
  if (isFighterSkin(v)) {
    return coerceWeaponFighterSkin(v, DEFAULT_PLAYER_APPEARANCE.fighter);
  }
  return null;
}

function defaultAppearanceForPlayer(playerId: string): PlayerAppearance {
  return {
    fighter: defaultFighterForSlotIndex(slotIndexFromId(playerId)),
    building: DEFAULT_BUILDING_SKIN,
    displayColor: DEFAULT_PLAYER_APPEARANCE.displayColor,
  };
}

export function normalizeBuildingSkin(v: unknown): BuildingSkinId | null {
  if (typeof v === "string") {
    const mapped = LEGACY_BUILDING_SKIN_MAP[v];
    if (mapped) return mapped;
    if (v.startsWith("fort") || v.endsWith("3d")) {
      return DEFAULT_BUILDING_SKIN;
    }
  }
  if (!isBuildingSkin(v)) return null;
  if (v === "cube") return DEFAULT_BUILDING_SKIN;
  if (isGlbBuildingSkin(v) && !isGlbBuildingVisible(v)) {
    return DEFAULT_BUILDING_SKIN;
  }
  return v;
}

/** Любой id → актуальное здание с 3D на карте (удалённые → дефолт). */
export const coerceBuildingSkin = coerceBuildingSkinId;

function sanitizeAppearance(
  raw: PlayerAppearance,
  playerId?: string
): PlayerAppearance {
  const fighter =
    normalizeFighterSkin(raw.fighter, playerId) ??
    (playerId != null
      ? defaultFighterForSlotIndex(slotIndexFromId(playerId))
      : DEFAULT_PLAYER_APPEARANCE.fighter);
  const building = coerceBuildingSkin(raw.building);
  const displayColor =
    normalizeDisplayColor(raw.displayColor) ??
    DEFAULT_PLAYER_APPEARANCE.displayColor;

  if (
    raw.fighter === fighter &&
    raw.building === building &&
    raw.displayColor === displayColor
  ) {
    return raw;
  }
  if (
    fighter === DEFAULT_PLAYER_APPEARANCE.fighter &&
    building === DEFAULT_PLAYER_APPEARANCE.building &&
    displayColor === DEFAULT_PLAYER_APPEARANCE.displayColor
  ) {
    return DEFAULT_PLAYER_APPEARANCE;
  }
  return { fighter, building, displayColor };
}

function parseAppearance(
  raw: unknown,
  playerId: string
): PlayerAppearance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fighter = o.fighter;
  const building = o.building;
  const buildingNorm = normalizeBuildingSkin(building);
  const fighterNorm = normalizeFighterSkin(fighter, playerId);
  if (!fighterNorm || !buildingNorm) return null;
  return {
    fighter: fighterNorm,
    building: buildingNorm,
    displayColor: DEFAULT_PLAYER_APPEARANCE.displayColor,
  };
}

export function loadPlayerAppearances(): PlayerAppearancesMap {
  const defaults: PlayerAppearancesMap = {};
  for (const id of PLAYER_SLOT_IDS) {
    defaults[id] = defaultAppearanceForPlayer(id);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaults;
    const out = { ...defaults };
    for (const [playerId, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      const appearance = parseAppearance(value, playerId);
      if (appearance) out[playerId] = appearance;
    }
    return out;
  } catch {
    return defaults;
  }
}

export function savePlayerAppearances(map: PlayerAppearancesMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function appearanceForPlayer(
  map: PlayerAppearancesMap,
  playerId: string
): PlayerAppearance {
  const raw = map[playerId];
  if (!raw) {
    return playerId != null
      ? defaultAppearanceForPlayer(playerId)
      : DEFAULT_PLAYER_APPEARANCE;
  }
  return sanitizeAppearance(raw, playerId);
}
