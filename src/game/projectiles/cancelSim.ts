import type { FlightPayload, ProjectileSim } from "./types";

export function cancelProjectileSim(
  flight: FlightPayload,
  sim: ProjectileSim,
  untrackTid: (tid: number) => void
): void {
  if (sim.landApplied || sim.destroyed) return;
  sim.destroyed = true;
  sim.landApplied = true;
  const tid = flight.simLandTids[sim.id];
  if (tid != null) {
    window.clearTimeout(tid);
    untrackTid(tid);
    delete flight.simLandTids[sim.id];
  }
}
