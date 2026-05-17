import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeDisplayColor,
  type DisplayColorId,
} from "@/shared/displayColors.js";
import { normalizeOfflineBotCount } from "@/shared/offlineBotCount.js";
import { normalizeOfflineBotDifficulty } from "@/shared/offlineBotDifficulty.js";
import { LEGACY_BUILDING_SKIN_MAP } from "@/shared/skinIds.js";
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
  googleSub?: string;
  email?: string;
  displayColor?: DisplayColorId;
  offlineBotCount?: number;
  offlineBotDifficulty?: number;
  randomMapOnStart?: boolean;
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

function normalizeBuildingSkin(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const legacy = LEGACY_BUILDING_SKIN_MAP[value];
    if (legacy) return legacy;
    if (value.startsWith("fort") || value === "cube" || value.endsWith("3d")) {
      return DEFAULT_BUILDING;
    }
    if (buildingSet().has(value)) return value;
  }
  return fallback;
}

/** Старый формат: appearances.mock-user или первый слот. */
function migrateLegacyRow(raw: Record<string, unknown>): {
  fighter: FighterSkinId;
  building: BuildingSkinId;
} {
  const fighter = normalizeSkin(raw.fighter, fighterSet(), DEFAULT_FIGHTER);
  const building = normalizeBuildingSkin(raw.building, DEFAULT_BUILDING);

  if (raw.appearances && typeof raw.appearances === "object") {
    const apps = raw.appearances as Record<string, unknown>;
    const slot =
      apps["mock-user"] ??
      Object.values(apps).find((v) => v && typeof v === "object");
    if (slot && typeof slot === "object") {
      const o = slot as Record<string, unknown>;
      return {
        fighter: normalizeSkin(o.fighter, fighterSet(), fighter) as FighterSkinId,
        building: normalizeBuildingSkin(o.building, building) as BuildingSkinId,
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
  const displayColor = normalizeDisplayColor(raw.displayColor) ?? undefined;
  let offlineBotCount: number | undefined;
  if (typeof raw.offlineBotCount === "number") {
    offlineBotCount = normalizeOfflineBotCount(raw.offlineBotCount);
  }
  let offlineBotDifficulty: number | undefined;
  if (typeof raw.offlineBotDifficulty === "number") {
    offlineBotDifficulty = normalizeOfflineBotDifficulty(
      raw.offlineBotDifficulty
    );
  }
  const randomMapOnStart =
    typeof raw.randomMapOnStart === "boolean" ? raw.randomMapOnStart : undefined;

  return {
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    displayName,
    fighter,
    building,
    ...(typeof raw.googleSub === "string" ? { googleSub: raw.googleSub } : {}),
    ...(typeof raw.email === "string" ? { email: raw.email } : {}),
    ...(displayColor ? { displayColor } : {}),
    ...(offlineBotCount !== undefined ? { offlineBotCount } : {}),
    ...(offlineBotDifficulty !== undefined ? { offlineBotDifficulty } : {}),
    ...(randomMapOnStart !== undefined ? { randomMapOnStart } : {}),
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
    ...(row.displayColor ? { displayColor: row.displayColor } : {}),
    ...(row.offlineBotCount !== undefined
      ? { offlineBotCount: row.offlineBotCount }
      : {}),
    ...(row.offlineBotDifficulty !== undefined
      ? { offlineBotDifficulty: row.offlineBotDifficulty }
      : {}),
    ...(row.randomMapOnStart !== undefined
      ? { randomMapOnStart: row.randomMapOnStart }
      : {}),
    ...(row.email ? { email: row.email } : {}),
    ...(row.googleSub ? { googleLinked: true } : {}),
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

export type ProfilePatchInput = {
  fighter?: FighterSkinId;
  building?: BuildingSkinId;
  displayName?: string;
  displayColor?: DisplayColorId;
  offlineBotCount?: number;
  offlineBotDifficulty?: number;
  randomMapOnStart?: boolean;
};

export function updateProfile(
  userId: string,
  patch: ProfilePatchInput
): UserProfile | null {
  const store = readStore();
  const row = store.users[userId];
  if (!row) return null;

  if (patch.fighter) row.fighter = patch.fighter;
  if (patch.building) row.building = patch.building;
  if (patch.displayName !== undefined) {
    row.displayName = patch.displayName.trim().slice(0, 32);
  }
  if (patch.displayColor !== undefined) {
    row.displayColor = patch.displayColor;
  }
  if (patch.offlineBotCount !== undefined) {
    row.offlineBotCount = normalizeOfflineBotCount(patch.offlineBotCount);
  }
  if (patch.offlineBotDifficulty !== undefined) {
    row.offlineBotDifficulty = normalizeOfflineBotDifficulty(
      patch.offlineBotDifficulty
    );
  }
  if (patch.randomMapOnStart !== undefined) {
    row.randomMapOnStart = patch.randomMapOnStart;
  }
  row.updatedAt = new Date().toISOString();
  store.users[userId] = row;
  writeStore(store);

  return getProfile(userId);
}

export function findUserIdByGoogleSub(googleSub: string): string | null {
  const store = readStore();
  for (const [userId, row] of Object.entries(store.users)) {
    if (row.googleSub === googleSub) return userId;
  }
  return null;
}

function mergeRowFromSource(target: UserRow, source: UserRow): void {
  if (!target.displayName.trim() && source.displayName.trim()) {
    target.displayName = source.displayName;
  }
  if (target.fighter === DEFAULT_FIGHTER && source.fighter !== DEFAULT_FIGHTER) {
    target.fighter = source.fighter;
  }
  if (
    target.building === DEFAULT_BUILDING &&
    source.building !== DEFAULT_BUILDING
  ) {
    target.building = source.building;
  }
  if (!target.displayColor && source.displayColor) {
    target.displayColor = source.displayColor;
  }
  if (target.offlineBotCount === undefined && source.offlineBotCount !== undefined) {
    target.offlineBotCount = source.offlineBotCount;
  }
  if (
    target.offlineBotDifficulty === undefined &&
    source.offlineBotDifficulty !== undefined
  ) {
    target.offlineBotDifficulty = source.offlineBotDifficulty;
  }
  if (
    target.randomMapOnStart === undefined &&
    source.randomMapOnStart !== undefined
  ) {
    target.randomMapOnStart = source.randomMapOnStart;
  }
}

/** Переносит данные анонимного профиля в Google-аккаунт и удаляет старую запись. */
export function mergeAnonymousIntoUser(
  targetUserId: string,
  anonymousUserId: string
): void {
  if (targetUserId === anonymousUserId) return;
  const store = readStore();
  const target = store.users[targetUserId];
  const source = store.users[anonymousUserId];
  if (!target || !source) return;
  mergeRowFromSource(target, source);
  target.updatedAt = new Date().toISOString();
  delete store.users[anonymousUserId];
  writeStore(store);
}

export function ensureGoogleUser(
  googleSub: string,
  email: string,
  canonicalUserId: string,
  linkUserId?: string
): UserProfile {
  const store = readStore();
  const existingId = findUserIdByGoogleSub(googleSub);
  const now = new Date().toISOString();

  if (existingId) {
    const row = store.users[existingId]!;
    if (email && row.email !== email) {
      row.email = email;
      row.updatedAt = now;
      writeStore(store);
    }
    if (
      linkUserId &&
      linkUserId !== existingId &&
      store.users[linkUserId] &&
      !store.users[linkUserId]!.googleSub
    ) {
      mergeAnonymousIntoUser(existingId, linkUserId);
    }
    return getProfile(existingId)!;
  }

  const userId = canonicalUserId;
  if (!store.users[userId]) {
    store.users[userId] = {
      createdAt: now,
      updatedAt: now,
      displayName: "",
      fighter: DEFAULT_FIGHTER as FighterSkinId,
      building: DEFAULT_BUILDING as BuildingSkinId,
    };
  }

  const row = store.users[userId]!;
  row.googleSub = googleSub;
  if (email) row.email = email;
  row.updatedAt = now;
  writeStore(store);

  if (
    linkUserId &&
    linkUserId !== userId &&
    store.users[linkUserId] &&
    !store.users[linkUserId]!.googleSub
  ) {
    mergeAnonymousIntoUser(userId, linkUserId);
  }

  return getProfile(userId)!;
}
