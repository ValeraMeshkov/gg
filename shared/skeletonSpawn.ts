import type { BuildingSkinId } from "./skinIds.js";
import { pickDistinctIndices } from "./pickDistinct.js";
import type { CombatCell } from "./landHit.js";
import { skeletonSpawnConfig } from "./buildingMechanics.js";

export function neutralPlayableIndices(
  cells: readonly CombatCell[],
  playable: readonly number[]
): number[] {
  return playable.filter((i) => !cells[i]?.ownerId);
}

export function spawnSkeletonOnNeutralCell<T extends CombatCell>(
  cells: readonly T[],
  cellIndex: number,
  ownerId: string,
  spawnUnits: number
): T[] | null {
  const cell = cells[cellIndex];
  if (!cell || cell.ownerId) return null;
  const next = cells.slice() as T[];
  next[cellIndex] = {
    ...cell,
    ownerId,
    units: spawnUnits,
    growthPausedUntil: undefined,
  };
  return next;
}

export function trySpawnOneSkeleton<T extends CombatCell>(
  cells: readonly T[],
  playable: readonly number[],
  ownerId: string,
  building: BuildingSkinId | undefined,
  rng: () => number = Math.random
): T[] | null {
  const cfg = skeletonSpawnConfig(building);
  if (!cfg) return null;
  const neutrals = neutralPlayableIndices(cells, playable);
  if (neutrals.length === 0) return null;
  const [index] = pickDistinctIndices(neutrals, 1, rng);
  return spawnSkeletonOnNeutralCell(
    cells,
    index!,
    ownerId,
    cfg.spawnUnits
  );
}

export function spawnSecondSkeletonAtStart<T extends CombatCell>(
  cells: readonly T[],
  playable: readonly number[],
  ownerId: string,
  building: BuildingSkinId | undefined,
  rng: () => number = Math.random
): T[] | null {
  const cfg = skeletonSpawnConfig(building);
  if (!cfg?.startSecondMinion) return null;
  return trySpawnOneSkeleton(cells, playable, ownerId, building, rng);
}

export function tickSkeletonSpawnsForOwners<T extends CombatCell>(
  cells: readonly T[],
  playable: readonly number[],
  ownerIds: readonly string[],
  buildingForOwner: (ownerId: string) => BuildingSkinId | undefined,
  rng: () => number = Math.random
): T[] | null {
  let current: readonly T[] = cells;
  let changed = false;
  for (const ownerId of ownerIds) {
    const building = buildingForOwner(ownerId);
    const next = trySpawnOneSkeleton(
      current,
      playable,
      ownerId,
      building,
      rng
    );
    if (!next) continue;
    current = next;
    changed = true;
  }
  return changed ? [...current] : null;
}
