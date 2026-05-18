import type { CombatCell } from "./combat.js";
import { pauseCellGrowth } from "./combat.js";
import { readCellUnits } from "./cellUnits.js";

/** Снаряд в очереди / в полёте — для учёта силы на клетке-источнике. */
export type LaunchPowerSim = {
  power: number;
  spawnApplied?: boolean;
  landApplied?: boolean;
  destroyed?: boolean;
};

/** Сколько силы клетки зарезервировано под ещё не вылетевшие снаряды. */
export function reservedLaunchPower(
  sims: readonly LaunchPowerSim[]
): number {
  let sum = 0;
  for (const s of sims) {
    if (s.spawnApplied || s.landApplied || s.destroyed) continue;
    sum += Math.max(0, s.power);
  }
  return sum;
}

/** Списание с клетки-источника при вылете группы снарядов. */
export function spawnPowerCost(sims: readonly LaunchPowerSim[]): number {
  let sum = 0;
  for (const s of sims) {
    sum += Math.max(0, s.power);
  }
  return sum;
}

/** Сколько патронов можно выпустить при силе клетки `availableUnits` и цене вылета `launchPower`. */
export function projectileCountForLaunchBudget(
  availableUnits: number,
  launchPower: number
): number {
  if (launchPower <= 0 || availableUnits < launchPower) return 0;
  return Math.floor(availableUnits / launchPower);
}

/** Списать силу вылета и поставить паузу роста на клетке-источнике. */
export function applySpawnFromSourceCell<T extends CombatCell>(
  cell: T,
  sims: readonly LaunchPowerSim[],
  nowMs: number = Date.now()
): T {
  const cost = spawnPowerCost(sims);
  const u = readCellUnits(cell);
  return pauseCellGrowth(
    {
      ...cell,
      units: Math.max(0, u - cost),
    },
    nowMs
  );
}
