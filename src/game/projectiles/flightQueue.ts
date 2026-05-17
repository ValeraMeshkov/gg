import type { FlightPayload, ProjectileSim } from "./types";

export function compactFlights(flights: FlightPayload[]): void {
  const kept = flights.filter((f) => !f.sims.every((s) => s.landApplied));
  flights.length = 0;
  for (const f of kept) flights.push(f);
}

function stripFullyQueuedWavesFromEndOfFlight(
  flight: FlightPayload,
  untrackTid: (tid: number) => void
): void {
  const byWave = new Map<number, ProjectileSim[]>();
  for (const s of flight.sims) {
    const arr = byWave.get(s.releaseWave);
    if (arr) arr.push(s);
    else byWave.set(s.releaseWave, [s]);
  }
  const wavesDescending = [...byWave.keys()].sort((a, b) => b - a);
  for (const w of wavesDescending) {
    const row = byWave.get(w)!;
    const allQueued = row.every((s) => !s.spawnApplied && !s.landApplied);
    if (!allQueued) break;
    const tidS = flight.waveSpawnTids[w];
    if (tidS != null) {
      window.clearTimeout(tidS);
      untrackTid(tidS);
      delete flight.waveSpawnTids[w];
    }
    for (const s of row) {
      const tidL = flight.simLandTids[s.id];
      if (tidL != null) {
        window.clearTimeout(tidL);
        untrackTid(tidL);
        delete flight.simLandTids[s.id];
      }
      s.landApplied = true;
    }
  }
}

export function stripPendingTailTowardsOtherTargets(
  fromI: number,
  newToIndex: number,
  flights: FlightPayload[],
  untrackTid: (tid: number) => void
): void {
  for (const flight of flights) {
    if (flight.fromIndex !== fromI) continue;
    if (flight.toIndex === newToIndex) continue;
    stripFullyQueuedWavesFromEndOfFlight(flight, untrackTid);
  }
  compactFlights(flights);
}

export function cancelPendingLaunchesFromSource(
  fromI: number,
  flights: FlightPayload[],
  untrackTid: (tid: number) => void
): void {
  for (const flight of flights) {
    if (flight.fromIndex !== fromI) continue;
    stripFullyQueuedWavesFromEndOfFlight(flight, untrackTid);
  }
  compactFlights(flights);
}

export function pendingLaunchFromIndicesForPlayer(
  localPlayerId: string,
  flights: readonly FlightPayload[]
): number[] {
  const fromIndices = new Set<number>();
  for (const flight of flights) {
    const attackerId = flight.sims[0]?.hitAffiliationId;
    if (attackerId !== localPlayerId) continue;
    const hasQueued = flight.sims.some(
      (s) => !s.spawnApplied && !s.landApplied
    );
    if (hasQueued) fromIndices.add(flight.fromIndex);
  }
  return [...fromIndices];
}

export function cancelAllPendingLaunchesForPlayer(
  localPlayerId: string,
  flights: FlightPayload[],
  untrackTid: (tid: number) => void
): void {
  for (const fromI of pendingLaunchFromIndicesForPlayer(
    localPlayerId,
    flights
  )) {
    cancelPendingLaunchesFromSource(fromI, flights, untrackTid);
  }
}
