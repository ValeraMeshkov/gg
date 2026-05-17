import { useEffect, type MutableRefObject } from "react";
import { bumpCellsTowardsCap } from "@/shared/cellGrowth";
import { CELL } from "@/game/constants";
import type { MapCell } from "@/game/maps/types";

type FlightLike = {
  readonly fromIndex: number;
  readonly sims: ReadonlyArray<{
    readonly spawnApplied?: boolean;
    readonly landApplied?: boolean;
  }>;
};

function sourceCellsWithUnspawnedProjectiles(
  flights: readonly FlightLike[]
): ReadonlySet<number> {
  const out = new Set<number>();
  for (const f of flights) {
    for (const s of f.sims) {
      if (!s.spawnApplied && !s.landApplied) {
        out.add(f.fromIndex);
        break;
      }
    }
  }
  return out;
}

/**
 * Оффлайн-пассивный рост клеток (+1 к капу). В комнате рост на сервере.
 */
export function useOfflineCellGrowth(
  enabled: boolean,
  cellsRef: MutableRefObject<MapCell[]>,
  flightsRef: MutableRefObject<readonly FlightLike[]>,
  onCellsChanged: () => void
): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const pendingLaunch = sourceCellsWithUnspawnedProjectiles(
        flightsRef.current
      );
      const bumped = bumpCellsTowardsCap(
        cellsRef.current,
        new Set(),
        pendingLaunch
      );
      if (bumped) {
        cellsRef.current = bumped;
        onCellsChanged();
      }
    }, CELL.growthMs);
    return () => window.clearInterval(id);
  }, [enabled, cellsRef, flightsRef, onCellsChanged]);
}
