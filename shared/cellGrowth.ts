import { CELL } from "./constants.js";
import {
  capForCellOwner,
  clampCellUnits,
  readCellUnits,
} from "./cellUnits.js";
import type { CombatCell } from "./combat.js";
import type { BuildingSkinId } from "./skinIds.js";
import {
  passiveGrowthIntervalMsForBuilding,
  passiveGrowthMsForBuilding,
} from "./buildingMechanics.js";

export type BumpCellsGrowthOpts = {
  buildingForOwner?: (ownerId: string | undefined) => BuildingSkinId | undefined;
  /** Растим только клетки владельца с этим зданием. */
  onlyOwnerBuilding?: BuildingSkinId;
  /** Не трогаем клетки владельца с этим зданием (у них свой тик). */
  skipOwnerBuilding?: BuildingSkinId;
};

/**
 * Пассивный +1: нейтраль и своя территория — к капу (20 / ownedCap).
 * Выше ownedCap клетка растёт только передачей снарядами на свою/союзную.
 * Не растёт, пока с клетки-источника не вылетели запланированные пули,
 * и пока не истекла пауза после обстрела / вылета / попадания (1 с, таймер сбрасывается).
 */
export function bumpCellsTowardsCap<T extends CombatCell>(
  prev: readonly T[],
  skipIndices: ReadonlySet<number>,
  freezeGrowthAtZeroWhenPendingLaunch: ReadonlySet<number>,
  nowMs: number = Date.now(),
  opts?: BumpCellsGrowthOpts
): T[] | null {
  let changed = false;
  const next = prev.map((cell, idx) => {
    if (skipIndices.has(idx)) return { ...cell };
    const pausedUntil = cell.growthPausedUntil ?? 0;
    if (nowMs < pausedUntil) return { ...cell };
    const u = readCellUnits(cell);
    if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) {
      return { ...cell };
    }
    const ownerBuilding = cell.ownerId
      ? opts?.buildingForOwner?.(cell.ownerId)
      : undefined;
    if (
      opts?.onlyOwnerBuilding &&
      ownerBuilding !== opts.onlyOwnerBuilding
    ) {
      return { ...cell };
    }
    if (
      opts?.skipOwnerBuilding &&
      ownerBuilding === opts.skipOwnerBuilding
    ) {
      return { ...cell };
    }
    const cap = capForCellOwner(cell.ownerId, ownerBuilding);
    if (u >= cap) return { ...cell };
    changed = true;
    const dedicatedInterval =
      passiveGrowthIntervalMsForBuilding(ownerBuilding);
    const growthMs = passiveGrowthMsForBuilding(ownerBuilding);
    const extraPauseMs =
      dedicatedInterval != null
        ? dedicatedInterval
        : Math.max(0, growthMs - CELL.growthMs);
    const pauseUntil =
      extraPauseMs > 0
        ? Math.max(nowMs + extraPauseMs, cell.growthPausedUntil ?? 0)
        : cell.growthPausedUntil;
    return {
      ...cell,
      units: clampCellUnits(u + 1, cell.ownerId, ownerBuilding),
      ...(pauseUntil != null ? { growthPausedUntil: pauseUntil } : {}),
    };
  });
  return changed ? next : null;
}
