import type { CombatCell } from "./combat.js";
import { pauseCellGrowth } from "./combat.js";
import { readCellUnits } from "./cellUnits.js";
import { SHOT } from "./constants.js";

/** Снаряд в очереди / в полёте — для учёта силы на клетке-источнике. */
export type LaunchPowerSim = {
  power: number;
  spawnApplied?: boolean;
  landApplied?: boolean;
  destroyed?: boolean;
};

/** Все снаряды залпа уже вылетели с клетки (или сняты). */
export function salvoBatchFullySpawned(
  sims: readonly LaunchPowerSim[]
): boolean {
  return sims.every(
    (s) => s.spawnApplied || s.landApplied || s.destroyed
  );
}

/** Есть снаряды, ещё не вылетевшие с клетки. */
export function salvoHasUnspawnedSims(
  sims: readonly LaunchPowerSim[]
): boolean {
  return sims.some(
    (s) => !s.spawnApplied && !s.landApplied && !s.destroyed
  );
}

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

/** Сколько снарядов выпустить в одном залпе (боты, лимит очереди). */
export function salvoProjectileCount(
  availableCount: number,
  maxUnitsPerSource?: number
): number {
  let n = Math.max(0, availableCount);
  if (maxUnitsPerSource != null) {
    n = Math.min(n, maxUnitsPerSource);
  }
  return Math.min(n, SHOT.maxProjectilesPerSalvo);
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

export type FlightWithSource = {
  readonly fromIndex: number;
  readonly sims: readonly LaunchPowerSim[];
};

/** Индексы клеток-источников с ещё не вылетевшими снарядами (блокируют рост). */
export function sourceIndicesWithUnspawnedSims(
  flights: readonly FlightWithSource[]
): ReadonlySet<number> {
  const out = new Set<number>();
  for (const f of flights) {
    if (salvoHasUnspawnedSims(f.sims)) out.add(f.fromIndex);
  }
  return out;
}
