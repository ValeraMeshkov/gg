import { randomBytes } from "node:crypto";
import { CELL } from "@/shared/constants.js";
import { applyLandHitWithPower } from "@/shared/combat.js";
import { readCellUnits } from "@/shared/cellUnits.js";
import { mapGameplayScaleForMapId } from "@/shared/mapGameplayScale.js";
import { buildFlightPlan } from "@/shared/flightSchedule.js";
import {
  projectileHitRadius2,
  projectilePositionAt,
  projectilesCollideDuringInterval,
  type ProjectilePath,
} from "@/shared/projectileMotion.js";
import { projectileCollisionShowsExplosion } from "@/shared/collisionFx.js";
import {
  applyMutualProjectileCollision,
  isProjectileSpent,
} from "@/shared/projectileCombat.js";
import { applySpawnFromSourceCell } from "@/shared/launchPower.js";
import {
  projectileCountForLaunchBudget,
  reservedLaunchPower,
} from "@/shared/launchPower.js";
import { pickCollisionExplosionWeapon } from "@/shared/fighterExplosionFx.js";
import {
  weaponStatsForFighter,
  type AttackAnimationId,
  type WeaponId,
} from "@/shared/weaponStats.js";
import type { FighterSkinId } from "./skins.js";
import type { SyncCell } from "@/shared/wsProtocol.js";
import { enqueueRoomCellUpdate } from "./cellUpdateQueue.js";
import { cloneCells, getGameForRoom, updateRoomCells, type RoomGameState } from "./gameState.js";
import { dotCenter } from "./mapDots.js";

type PendingSim = {
  releaseWave: number;
  path: ProjectilePath;
  power: number;
  attackAnimation: AttackAnimationId;
  spawnApplied: boolean;
  landApplied: boolean;
  destroyed: boolean;
};

type PendingFlight = {
  attackId: string;
  attackerId: string;
  fromIndex: number;
  toIndex: number;
  weaponId: WeaponId;
  sims: PendingSim[];
  waveSpawnTimers: Map<number, NodeJS.Timeout>;
  simLandTimers: Map<number, NodeJS.Timeout>;
};

export type ProjectileCollisionDestroy = {
  attackId: string;
  simIndex: number;
};

export type ProjectileCollisionExplosion = {
  x: number;
  y: number;
  weapon: AttackAnimationId;
};

const pendingByRoom = new Map<string, PendingFlight[]>();
const collisionLoops = new Map<string, NodeJS.Timeout>();
const lastCollisionTickAt = new Map<string, number>();

let onProjectileCollision:
  | ((
      roomCode: string,
      destroyed: ProjectileCollisionDestroy[],
      explosions: ProjectileCollisionExplosion[]
    ) => void)
  | null = null;

const COLLISION_TICK_MS = 16;

export function setProjectileCollisionHandler(
  handler: (
    roomCode: string,
    destroyed: ProjectileCollisionDestroy[],
    explosions: ProjectileCollisionExplosion[]
  ) => void
): void {
  onProjectileCollision = handler;
}

export function clearRoomCombat(roomCode: string): void {
  const key = roomCode.toUpperCase();
  const flights = pendingByRoom.get(key);
  if (flights) {
    for (const f of flights) clearFlightTimers(f);
  }
  pendingByRoom.delete(key);
  const loop = collisionLoops.get(key);
  if (loop != null) {
    clearInterval(loop);
    collisionLoops.delete(key);
  }
  lastCollisionTickAt.delete(key);
}

function targetCell(cells: SyncCell[], toIndex: number): SyncCell {
  return cells[toIndex] ?? { units: CELL.neutralStart };
}

function commitCells(
  roomCode: string,
  next: SyncCell[],
  onCells: (cells: SyncCell[]) => void
): void {
  const key = roomCode.toUpperCase();
  const g = getGameForRoom(key);
  if (!g) return;
  const cloned = cloneCells(next);
  g.cells = cloned;
  updateRoomCells(key, cloned);
  onCells(cloneCells(cloned));
}

function clearFlightTimers(flight: PendingFlight): void {
  for (const t of flight.waveSpawnTimers.values()) clearTimeout(t);
  for (const t of flight.simLandTimers.values()) clearTimeout(t);
  flight.waveSpawnTimers.clear();
  flight.simLandTimers.clear();
}

function destroySim(flight: PendingFlight, idx: number): void {
  const slot = flight.sims[idx];
  if (!slot || slot.landApplied || slot.destroyed) return;
  slot.destroyed = true;
  slot.landApplied = true;
  const landTimer = flight.simLandTimers.get(idx);
  if (landTimer != null) {
    clearTimeout(landTimer);
    flight.simLandTimers.delete(idx);
  }
}

function roomHasActiveFlights(flights: PendingFlight[]): boolean {
  return flights.some((f) => f.sims.some((s) => !s.landApplied));
}

function stopCollisionLoopIfIdle(key: string): void {
  const flights = pendingByRoom.get(key);
  if (flights && roomHasActiveFlights(flights)) return;
  const loop = collisionLoops.get(key);
  if (loop != null) {
    clearInterval(loop);
    collisionLoops.delete(key);
  }
}

function ensureCollisionLoop(key: string): void {
  if (collisionLoops.has(key)) return;
  const loop = setInterval(() => tickProjectileCollisions(key), COLLISION_TICK_MS);
  collisionLoops.set(key, loop);
}

function tickProjectileCollisions(key: string): void {
  const flights = pendingByRoom.get(key);
  if (!flights || flights.length === 0) {
    stopCollisionLoopIfIdle(key);
    return;
  }

  const now = Date.now();
  const prev = lastCollisionTickAt.get(key) ?? now - COLLISION_TICK_MS;
  lastCollisionTickAt.set(key, now);
  const t0 = Math.max(prev, now - COLLISION_TICK_MS * 2);
  const destroyedBroadcast: ProjectileCollisionDestroy[] = [];
  const explosionsBroadcast: ProjectileCollisionExplosion[] = [];

  const hitR2 = projectileHitRadius2();

  type Active = { flight: PendingFlight; idx: number };
  const active: Active[] = [];
  for (const flight of flights) {
    for (let idx = 0; idx < flight.sims.length; idx++) {
      const slot = flight.sims[idx]!;
      if (slot.landApplied || slot.destroyed) continue;
      active.push({ flight, idx });
    }
  }

  for (let i = 0; i < active.length; i++) {
    const a = active[i]!;
    if (a.flight.sims[a.idx]!.destroyed) continue;
    for (let j = i + 1; j < active.length; j++) {
      const b = active[j]!;
      if (b.flight.sims[b.idx]!.destroyed) continue;
      if (a.flight.attackerId === b.flight.attackerId) continue;
      const pa = projectilePositionAt(a.flight.sims[a.idx]!.path, now);
      const pb = projectilePositionAt(b.flight.sims[b.idx]!.path, now);
      let collides =
        pa != null &&
        pb != null &&
        (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2 < hitR2;
      if (!collides) {
        collides = projectilesCollideDuringInterval(
          a.flight.sims[a.idx]!.path,
          b.flight.sims[b.idx]!.path,
          t0,
          now
        );
      }
      if (!collides) continue;

      const slotA = a.flight.sims[a.idx]!;
      const slotB = b.flight.sims[b.idx]!;
      const { aDestroyed, bDestroyed } = applyMutualProjectileCollision(
        slotA,
        slotB
      );

      let bx = pa && pb ? (pa.x + pb.x) / 2 : pa?.x ?? pb?.x ?? 0;
      let by = pa && pb ? (pa.y + pb.y) / 2 : pa?.y ?? pb?.y ?? 0;
      if (!pa || !pb) {
        const ts = (t0 + now) / 2;
        const qa = projectilePositionAt(slotA.path, ts);
        const qb = projectilePositionAt(slotB.path, ts);
        if (qa && qb) {
          bx = (qa.x + qb.x) / 2;
          by = (qa.y + qb.y) / 2;
        } else if (qa) {
          bx = qa.x;
          by = qa.y;
        } else if (qb) {
          bx = qb.x;
          by = qb.y;
        }
      }
      const idA = `proj-${a.flight.attackId}-${a.idx}`;
      const idB = `proj-${b.flight.attackId}-${b.idx}`;
      if (
        (aDestroyed || bDestroyed) &&
        projectileCollisionShowsExplosion(idA, idB)
      ) {
        explosionsBroadcast.push({
          x: bx,
          y: by,
          weapon: pickCollisionExplosionWeapon(
            {
              attackAnimation: slotA.attackAnimation,
              power: slotA.power,
              id: idA,
            },
            {
              attackAnimation: slotB.attackAnimation,
              power: slotB.power,
              id: idB,
            }
          ),
        });
      }

      if (aDestroyed && !slotA.destroyed) {
        destroySim(a.flight, a.idx);
        destroyedBroadcast.push({
          attackId: a.flight.attackId,
          simIndex: a.idx,
        });
      }
      if (bDestroyed && !slotB.destroyed) {
        destroySim(b.flight, b.idx);
        destroyedBroadcast.push({
          attackId: b.flight.attackId,
          simIndex: b.idx,
        });
      }
    }
  }

  for (const a of active) {
    const slot = a.flight.sims[a.idx]!;
    if (slot.destroyed || slot.landApplied) continue;
    if (!isProjectileSpent(slot.power)) continue;
    destroySim(a.flight, a.idx);
    destroyedBroadcast.push({
      attackId: a.flight.attackId,
      simIndex: a.idx,
    });
  }

  if (destroyedBroadcast.length > 0 && onProjectileCollision) {
    onProjectileCollision(key, destroyedBroadcast, explosionsBroadcast);
  }

  compactFlights(flights);
  stopCollisionLoopIfIdle(key);
}

/** Клетки-источники с пулями в очереди (блокируют рост с 0). */
export function sourcesWithPendingLaunch(roomCode: string): Set<number> {
  const out = new Set<number>();
  const flights = pendingByRoom.get(roomCode.toUpperCase()) ?? [];
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

function reservedPowerOnSource(
  fromI: number,
  flights: PendingFlight[]
): number {
  const sims: PendingSim[] = [];
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    sims.push(...f.sims);
  }
  return reservedLaunchPower(sims);
}

function compactFlights(flights: PendingFlight[]): void {
  const kept = flights.filter((f) => f.sims.some((s) => !s.landApplied));
  for (const f of flights) {
    if (kept.includes(f)) continue;
    // Снятые с очереди волны — только spawn; land-таймеры должны дожать попадания.
    for (const t of f.waveSpawnTimers.values()) clearTimeout(t);
    f.waveSpawnTimers.clear();
  }
  flights.length = 0;
  for (const f of kept) flights.push(f);
}

/** Снять с конца только полностью ещё не вылетевшие волны. */
function stripFullyQueuedWavesFromEndOfFlight(flight: PendingFlight): void {
  const byWave = new Map<number, number[]>();
  flight.sims.forEach((s, idx) => {
    const arr = byWave.get(s.releaseWave);
    if (arr) arr.push(idx);
    else byWave.set(s.releaseWave, [idx]);
  });
  const wavesDescending = [...byWave.keys()].sort((a, b) => b - a);
  for (const w of wavesDescending) {
    const indices = byWave.get(w)!;
    const allQueued = indices.every(
      (idx) =>
        !flight.sims[idx]!.spawnApplied && !flight.sims[idx]!.landApplied
    );
    if (!allQueued) break;

    const spawnTimer = flight.waveSpawnTimers.get(w);
    if (spawnTimer != null) {
      clearTimeout(spawnTimer);
      flight.waveSpawnTimers.delete(w);
    }
    for (const idx of indices) {
      destroySim(flight, idx);
    }
  }
}

/**
 * Новый залп с той же клетки на другую цель: снять с прежних целей только очередь
 * (ещё не вылетевшие волны с конца). Уже вылетевшие пули продолжают лететь.
 */
function stripPendingTailTowardsOtherTargets(
  fromI: number,
  newToIndex: number,
  flights: PendingFlight[]
): void {
  for (const flight of flights) {
    if (flight.fromIndex !== fromI) continue;
    if (flight.toIndex === newToIndex) continue;
    stripFullyQueuedWavesFromEndOfFlight(flight);
  }
  compactFlights(flights);
}

export function cancelPendingFromSource(
  roomCode: string,
  fromIndex: number
): void {
  const key = roomCode.toUpperCase();
  const flights = pendingByRoom.get(key);
  if (!flights) return;
  for (const flight of flights) {
    if (flight.fromIndex !== fromIndex) continue;
    stripFullyQueuedWavesFromEndOfFlight(flight);
  }
  compactFlights(flights);
  stopCollisionLoopIfIdle(key);
}

export type AttackLaunch = {
  attackId: string;
  attackerId: string;
  fighter: FighterSkinId;
  fromIndex: number;
  toIndex: number;
  amount: number;
  issuedAt: number;
  serverTime: number;
};

export function processAttack(
  roomCode: string,
  state: RoomGameState,
  attackerId: string,
  fighter: FighterSkinId,
  fromIndices: number[],
  toIndex: number,
  onLaunch: (launch: AttackLaunch) => void,
  onCells: (cells: SyncCell[]) => void,
  onPendingTailStrip?: (fromIndex: number, keepToIndex: number) => void
): void {
  const key = roomCode.toUpperCase();
  const flights = pendingByRoom.get(key) ?? [];
  pendingByRoom.set(key, flights);

  const seen = new Set<number>();

  for (const fromIndex of fromIndices) {
    if (seen.has(fromIndex)) continue;
    seen.add(fromIndex);

    const owner = state.cells[fromIndex]?.ownerId;
    if (owner !== attackerId) continue;

    stripPendingTailTowardsOtherTargets(fromIndex, toIndex, flights);
    onPendingTailStrip?.(fromIndex, toIndex);

    const weapon = weaponStatsForFighter(fighter);
    const u = readCellUnits(state.cells[fromIndex]);
    const reserved = reservedPowerOnSource(fromIndex, flights);
    const amount = projectileCountForLaunchBudget(
      Math.max(0, u - reserved),
      weapon.power
    );
    if (amount <= 0) continue;

    const from = dotCenter(state.mapId, fromIndex);
    const to = dotCenter(state.mapId, toIndex);
    if (!from || !to) continue;

    const issuedAt = Date.now();
    const attackId = randomBytes(8).toString("hex");
    const plan = buildFlightPlan(
      amount,
      from.x,
      from.y,
      to.x,
      to.y,
      issuedAt,
      attackId,
      weapon,
      mapGameplayScaleForMapId(state.mapId)
    );

    const pending: PendingFlight = {
      attackId,
      attackerId,
      fromIndex,
      toIndex,
      weaponId: weapon.id,
      sims: plan.sims.map((sim) => ({
        releaseWave: sim.releaseWave,
        path: {
          spawnTime: sim.spawnTime,
          flightDuration: sim.flightDuration,
          sx: sim.sx,
          sy: sim.sy,
          tx: sim.tx,
          ty: sim.ty,
          arcPerpX: sim.arcPerpX,
          arcPerpY: sim.arcPerpY,
        },
        power: sim.power,
        attackAnimation: weapon.id,
        spawnApplied: false,
        landApplied: false,
        destroyed: false,
      })),
      waveSpawnTimers: new Map(),
      simLandTimers: new Map(),
    };
    flights.push(pending);

    onLaunch({
      attackId,
      attackerId,
      fighter,
      fromIndex,
      toIndex,
      amount,
      issuedAt,
      serverTime: Date.now(),
    });

    const bySpawn = new Map<number, number[]>();
    plan.sims.forEach((sim, idx) => {
      const arr = bySpawn.get(sim.spawnTime);
      if (arr) arr.push(idx);
      else bySpawn.set(sim.spawnTime, [idx]);
    });

    for (const [spawnAt, indices] of bySpawn) {
      const delay = Math.max(0, spawnAt - issuedAt);
      const spawnTimer = setTimeout(() => {
        pending.waveSpawnTimers.delete(spawnAt);
        enqueueRoomCellUpdate(key, () => {
          const flightsLive = pendingByRoom.get(key);
          if (!flightsLive?.includes(pending)) return;
          const g = getGameForRoom(key);
          if (!g) return;
          const pendingIndices = indices.filter(
            (idx) =>
              !pending.sims[idx]!.spawnApplied &&
              !pending.sims[idx]!.landApplied
          );
          if (pendingIndices.length === 0) return;
          for (const idx of pendingIndices) {
            pending.sims[idx]!.spawnApplied = true;
          }
          const cur = cloneCells(g.cells);
          const spawning = pendingIndices.map((idx) => pending.sims[idx]!);
          cur[fromIndex] = applySpawnFromSourceCell(
            cur[fromIndex] ?? { units: CELL.neutralStart },
            spawning,
            Date.now()
          );
          commitCells(key, cur, onCells);
        });
      }, delay);
      pending.waveSpawnTimers.set(spawnAt, spawnTimer);
    }

    plan.sims.forEach((sim, idx) => {
      const landTimer = setTimeout(() => {
        pending.simLandTimers.delete(idx);
        enqueueRoomCellUpdate(key, () => {
          const g = getGameForRoom(key);
          if (!g) return;
          const slot = pending.sims[idx];
          if (!slot || slot.landApplied || slot.destroyed) return;
          if (isProjectileSpent(slot.power)) {
            destroySim(pending, idx);
            return;
          }
          slot.landApplied = true;
          const cur = cloneCells(g.cells);
          cur[toIndex] = applyLandHitWithPower(
            targetCell(cur, toIndex),
            attackerId,
            slot.power,
            Date.now()
          );
          commitCells(key, cur, onCells);
          const flightsLive = pendingByRoom.get(key);
          if (flightsLive) compactFlights(flightsLive);
          stopCollisionLoopIfIdle(key);
        });
      }, Math.max(0, sim.landDelayMs));
      pending.simLandTimers.set(idx, landTimer);
    });
  }

  if (roomHasActiveFlights(flights)) {
    ensureCollisionLoop(key);
  }
}
