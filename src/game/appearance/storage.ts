import { MOCK_PLAYERS } from "../mock";
import {
  BUILDING_SKINS,
  DEFAULT_PLAYER_APPEARANCE,
  FIGHTER_SKINS,
  type BuildingSkinId,
  type FighterSkinId,
  type PlayerAppearance,
} from "./types";

const STORAGE_KEY = "game-player-appearance-v1";

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

const REMOVED_FIGHTER_SKINS = new Set(["bolt", "cat", "fish", "moon", "flame"]);

/** Устаревшие id из localStorage → актуальный скин. */
export function normalizeFighterSkin(v: unknown): FighterSkinId | null {
  if (typeof v === "string" && REMOVED_FIGHTER_SKINS.has(v)) {
    return DEFAULT_PLAYER_APPEARANCE.fighter;
  }
  return isFighterSkin(v) ? v : null;
}

const REMOVED_BUILDING_SKINS = new Set([
  "flag",
  "tower",
  "tent",
  "tree",
  "mushroom",
  "pyramid",
  "igloo",
  "windmill",
  "volcano",
  "crystal",
  "campfire",
]);

export function normalizeBuildingSkin(v: unknown): BuildingSkinId | null {
  if (typeof v === "string" && REMOVED_BUILDING_SKINS.has(v)) {
    return DEFAULT_PLAYER_APPEARANCE.building;
  }
  return isBuildingSkin(v) ? v : null;
}

function parseAppearance(raw: unknown): PlayerAppearance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fighter = o.fighter;
  const building = o.building;
  const buildingNorm = normalizeBuildingSkin(building);
  const fighterNorm = normalizeFighterSkin(fighter);
  if (!fighterNorm || !buildingNorm) return null;
  return {
    fighter: fighterNorm,
    building: buildingNorm,
    displayColor: DEFAULT_PLAYER_APPEARANCE.displayColor,
  };
}

export function loadPlayerAppearances(): PlayerAppearancesMap {
  const defaults: PlayerAppearancesMap = {};
  for (const p of MOCK_PLAYERS) {
    defaults[p.id] = { ...DEFAULT_PLAYER_APPEARANCE };
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
      const appearance = parseAppearance(value);
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
  return map[playerId] ?? DEFAULT_PLAYER_APPEARANCE;
}
