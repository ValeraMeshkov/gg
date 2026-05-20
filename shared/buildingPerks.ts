import { extraStartTerritoriesForBuilding } from "./buildingMechanics.js";
import type { BuildingSkinId } from "./skinIds.js";

/**
 * Устаревшие простые перки. Игровые правила зданий — в `buildingMechanics.ts`.
 */
export type BuildingPerk = {
  extraHumanStartTerritories?: number;
};

const BUILDING_PERKS: Partial<Record<BuildingSkinId, BuildingPerk>> = {};

export function buildingPerks(skin: BuildingSkinId): BuildingPerk {
  return BUILDING_PERKS[skin] ?? {};
}

export function humanStartTerritoriesWithBuilding(
  baseTerritories: number,
  building?: BuildingSkinId
): number {
  if (!building) return baseTerritories;
  const legacy = buildingPerks(building).extraHumanStartTerritories ?? 0;
  return (
    baseTerritories +
    extraStartTerritoriesForBuilding(building) +
    Math.max(0, legacy)
  );
}
