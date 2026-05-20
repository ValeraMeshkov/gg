import {
  extraStartTerritoriesForBuilding,
  playerStartForBuilding,
} from "./buildingMechanics.js";
import type { CombatCell } from "./landHit.js";
import type { BuildingSkinId } from "./skinIds.js";

/** Захватить ещё N нейтральных клеток в начале партии (перк зомби). */
export function grantExtraStartTerritories<T extends CombatCell>(
  cells: readonly T[],
  playable: readonly number[],
  ownerId: string,
  building: BuildingSkinId | undefined,
  rng: () => number = Math.random
): T[] | null {
  const count = extraStartTerritoriesForBuilding(building);
  if (count <= 0) return null;

  const current = cells.slice() as T[];
  let changed = false;
  const units = playerStartForBuilding(building);

  for (let n = 0; n < count; n++) {
    const neutrals = playable.filter((i) => !current[i]?.ownerId);
    if (neutrals.length === 0) break;
    const idx = neutrals[Math.floor(rng() * neutrals.length)]!;
    current[idx] = {
      ...current[idx]!,
      ownerId,
      units,
      growthPausedUntil: undefined,
    };
    changed = true;
  }

  return changed ? current : null;
}
