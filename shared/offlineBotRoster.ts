import { assignOfflineBotDisplayColors } from "./offlinePlayerColors.js";
import type { DisplayColorId } from "./displayColors.js";
import { WEAPON_FIGHTER_SKINS } from "./defaultFighters.js";
import { pickDistinctIndices } from "./pickDistinct.js";
import { seededRandom } from "./seededRandom.js";
import { coerceWeaponFighterSkin } from "./defaultFighters.js";
import {
  BUILDING_SKINS,
  coerceBuildingSkinId,
  type BuildingSkinId,
  type FighterSkinId,
} from "./skinIds.js";

/** Здания, из которых ботам выдаётся случайный скин (без служебного `cube`). */
export const OFFLINE_BOT_BUILDING_POOL = BUILDING_SKINS.filter(
  (id) => id !== "cube"
) as BuildingSkinId[];

export type OfflineBotRosterEntry = {
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
};

function pickFromPool<T>(
  pool: readonly T[],
  count: number,
  rng: () => number
): T[] {
  if (pool.length === 0) return [];
  if (count <= pool.length) {
    const indices = pickDistinctIndices(
      pool.map((_, i) => i),
      count,
      rng
    );
    return indices.map((i) => pool[i]!);
  }
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = a;
  }
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(shuffled[i % shuffled.length]!);
  }
  return out;
}

/**
 * Случайные оружие и здание для каждого бота в партии (детерминировано `sessionSeed`).
 */
export function rollOfflineBotRoster(
  sessionSeed: string,
  botSlotIds: readonly string[],
  localDisplayColor: DisplayColorId
): Record<string, OfflineBotRosterEntry> {
  const n = botSlotIds.length;
  if (n === 0) return {};
  const rng = seededRandom(`offline-bots:${sessionSeed}`);
  const fighters = pickFromPool(WEAPON_FIGHTER_SKINS, n, rng).map((f) =>
    coerceWeaponFighterSkin(f)
  );
  const buildings = pickFromPool(OFFLINE_BOT_BUILDING_POOL, n, rng).map((b) =>
    coerceBuildingSkinId(b)
  );
  const colors = assignOfflineBotDisplayColors(localDisplayColor, n);
  const out: Record<string, OfflineBotRosterEntry> = {};
  for (let i = 0; i < n; i++) {
    const id = botSlotIds[i]!;
    out[id] = {
      fighter: fighters[i]!,
      building: buildings[i]!,
      displayColor: colors[i]!,
    };
  }
  return out;
}
