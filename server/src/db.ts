import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILDING_SKINS,
  DEFAULT_BUILDING,
  DEFAULT_FIGHTER,
  FIGHTER_SKINS,
} from "./skins.js";
import type {
  PlayerAppearance,
  PlayerAppearancesMap,
  UserPreferences,
  UserProfile,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
const storePath =
  process.env.STORE_PATH ?? path.join(dataDir, "profiles.json");

type StoreFile = {
  users: Record<
    string,
    {
      createdAt: string;
      updatedAt: string;
      appearances: PlayerAppearancesMap;
      preferences: UserPreferences;
    }
  >;
};

function fighterSet(): Set<string> {
  return new Set(FIGHTER_SKINS);
}

function buildingSet(): Set<string> {
  return new Set(BUILDING_SKINS);
}

function normalizeAppearance(raw: unknown): PlayerAppearance | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const fighter = o.fighter;
  const building = o.building;
  if (
    typeof fighter !== "string" ||
    typeof building !== "string" ||
    !fighterSet().has(fighter) ||
    !buildingSet().has(building)
  ) {
    return null;
  }
  return {
    fighter: fighter as PlayerAppearance["fighter"],
    building: building as PlayerAppearance["building"],
  };
}

function normalizeAppearances(raw: unknown): PlayerAppearancesMap {
  if (!raw || typeof raw !== "object") return {};
  const out: PlayerAppearancesMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const appearance = normalizeAppearance(value);
    if (appearance) out[key] = appearance;
  }
  return out;
}

function normalizePreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const prefs: UserPreferences = {};
  if (typeof o.lastMapId === "string") prefs.lastMapId = o.lastMapId;
  if (typeof o.controlledPlayerId === "string") {
    prefs.controlledPlayerId = o.controlledPlayerId;
  }
  return prefs;
}

function emptyStore(): StoreFile {
  return { users: {} };
}

function readStore(): StoreFile {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  if (!fs.existsSync(storePath)) {
    const empty = emptyStore();
    writeStore(empty);
    return empty;
  }
  try {
    const raw = JSON.parse(fs.readFileSync(storePath, "utf8")) as unknown;
    if (!raw || typeof raw !== "object") return emptyStore();
    const users = (raw as StoreFile).users;
    if (!users || typeof users !== "object") return emptyStore();
    return { users };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: StoreFile): void {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
  fs.renameSync(tmp, storePath);
}

function toProfile(userId: string, row: StoreFile["users"][string]): UserProfile {
  return {
    userId,
    appearances: normalizeAppearances(row.appearances),
    preferences: normalizePreferences(row.preferences),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createUser(id: string): UserProfile {
  const store = readStore();
  const now = new Date().toISOString();
  store.users[id] = {
    createdAt: now,
    updatedAt: now,
    appearances: {},
    preferences: {},
  };
  writeStore(store);
  return toProfile(id, store.users[id]!);
}

export function getProfile(userId: string): UserProfile | null {
  const store = readStore();
  const row = store.users[userId];
  if (!row) return null;
  return toProfile(userId, row);
}

export function userExists(userId: string): boolean {
  const store = readStore();
  return userId in store.users;
}

export function updateProfile(
  userId: string,
  patch: {
    appearances?: PlayerAppearancesMap;
    preferences?: UserPreferences;
  }
): UserProfile | null {
  const store = readStore();
  const row = store.users[userId];
  if (!row) return null;

  const appearances = patch.appearances
    ? { ...normalizeAppearances(row.appearances), ...patch.appearances }
    : normalizeAppearances(row.appearances);
  const preferences = patch.preferences
    ? { ...normalizePreferences(row.preferences), ...patch.preferences }
    : normalizePreferences(row.preferences);
  const now = new Date().toISOString();

  row.appearances = appearances;
  row.preferences = preferences;
  row.updatedAt = now;
  store.users[userId] = row;
  writeStore(store);

  return getProfile(userId);
}

export function defaultAppearance(): PlayerAppearance {
  return {
    fighter: DEFAULT_FIGHTER as PlayerAppearance["fighter"],
    building: DEFAULT_BUILDING as PlayerAppearance["building"],
  };
}
