import type { MapCell } from "@/game/maps/types";

export function cloneCells(c: readonly MapCell[]): MapCell[] {
  return c.map((x) => ({ ...x }));
}
