import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILDING_SKINS,
  DEFAULT_BUILDING,
  DEFAULT_FIGHTER,
  FIGHTER_SKINS,
} from "./skins.js";
import type { UserProfile } from "./types.js";
import type { BuildingSkinId, FighterSkinId } from "./skins.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? path.join(__dirname, "..", "data");
export const storePath =
  process.env.STORE_PATH ?? path.join(dataDir, "profiles.json");

type UserRow = {
  createdAt: string;
  updatedAt: string;
  displayName: string;
  fighter: FighterSkinId;
  building: BuildingSkinId;
};

type StoreFile = {
  users: Record<string, UserRow>;
};

function fighterSet(): Set<string> {
  return new Set(FIGHTER_SKINS);
}

function buildingSet(): Set<string> {
  return new Set(BUILDING_SKINS);
}

function normalizeSkin(
  value: unknown,
  allowed: Set<string>,
  fallback: string
): string {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

/** Старый формат: appearances.mock-user или первый слот. */
function migrateLegacyRow(raw: Record<string, unknown>): {
  fighter: FighterSkinId;
  building: BuildingSkinId;
} {
  const fighter = normalizeSkin(raw.fighter, fighterSet(), DEFAULT_FIGHTER);
  const building = normalizeSkin(raw.building, buildingSet(), DEFAULT_BUILDING);

  if (raw.appearances && typeof raw.appearances === "object") {
    const apps = raw.appearances as Record<string, unknown>;
    const slot =
      apps["mock-user"] ??
      Object.values(apps).find((v) => v && typeof v === "object");
    if (slot && typeof slot === "object") {
      const o = slot as Record<string, unknown>;
      return {
        fighter: normalizeSkin(o.fighter, fighterSet(), fighter) as FighterSkinId,
        building: normalizeSkin(o.building, buildingSet(), building) as BuildingSkinId,
      };
    }
  }

  return {
    fighter: fighter as FighterSkinId,
    building: building as BuildingSkinId,
  };
}

function normalizeRow(raw: Record<string, unknown>): UserRow | null {
  if (typeof raw.createdAt !== "string" || typeof raw.updatedAt !== "string") {
    return null;
  }
  const { fighter, building } = migrateLegacyRow(raw);
  let displayName = "";
  if (typeof raw.displayName === "string") {
    displayName = raw.displayName.trim().slice(0, 32);
  }
  return {
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    displayName,
    fighter,
    building,
  };
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

    const out: StoreFile["users"] = {};
    for (const [userId, row] of Object.entries(users)) {
      if (!row || typeof row !== "object") continue;
      const normalized = normalizeRow(row as Record<string, unknown>);
      if (normalized) out[userId] = normalized;
    }
    return { users: out };
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

function toProfile(userId: string, row: UserRow): UserProfile {
  return {
    userId,
    displayName: row.displayName ?? "",
    fighter: row.fighter,
    building: row.building,
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
    displayName: "",
    fighter: DEFAULT_FIGHTER as FighterSkinId,
    building: DEFAULT_BUILDING as BuildingSkinId,
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

export function listProfiles(): UserProfile[] {
  const store = readStore();
  return Object.entries(store.users)
    .map(([userId, row]) => toProfile(userId, row))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export function userExists(userId: string): boolean {
  const store = readStore();
  return userId in store.users;
}

export function updateProfile(
  userId: string,
  patch: {
    fighter?: FighterSkinId;
    building?: BuildingSkinId;
    displayName?: string;
  }
): UserProfile | null {
  const store = readStore();
  const row = store.users[userId];
  if (!row) return null;

  if (patch.fighter) row.fighter = patch.fighter;
  if (patch.building) row.building = patch.building;
  if (patch.displayName !== undefined) {
    row.displayName = patch.displayName.trim().slice(0, 32);
  }
  row.updatedAt = new Date().toISOString();
  store.users[userId] = row;
  writeStore(store);

  return getProfile(userId);
}
