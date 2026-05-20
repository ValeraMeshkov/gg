import type { MapCell } from "@/game/maps/types";
import { cloneCombatCells } from "@/shared/cellUnits";

export function cloneCells(c: readonly MapCell[]): MapCell[] {
  return cloneCombatCells(c);
}
