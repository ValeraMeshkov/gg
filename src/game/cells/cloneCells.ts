import type { MapCell } from "@/game/maps/types";
import { sanitizeCombatCell } from "@/shared/cellUnits";

export function cloneCells(c: readonly MapCell[]): MapCell[] {
  return c.map((x) => sanitizeCombatCell({ ...x }));
}
