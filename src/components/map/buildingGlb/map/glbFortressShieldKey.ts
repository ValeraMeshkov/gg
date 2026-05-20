import { getCell, type TerritoryGameMap } from "@/game/maps";
import { readFortressShield } from "@/shared/fortressShield";
import type { GlbBuildingSpot } from "./collectGlbBuildings";

const FORTRESS_SKINS = new Set(["freedomCastle", "freedomCastle4441"]);

/**
 * Меняется только при щите крепостей — для отдельного слоя куполов без ре-рендера пинов.
 */
export function glbFortressShieldKey(
  map: TerritoryGameMap,
  spots: readonly GlbBuildingSpot[]
): string {
  const parts: string[] = [];
  for (const spot of spots) {
    if (!FORTRESS_SKINS.has(spot.skin)) continue;
    const cell = getCell(map, spot.cellIndex);
    parts.push(
      `${spot.cellIndex}:${readFortressShield(cell)}:${cell.fortressShieldRegenPausedUntil ?? 0}`
    );
  }
  return parts.join("|");
}
