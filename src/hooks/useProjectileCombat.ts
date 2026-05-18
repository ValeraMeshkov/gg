import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import type { AttackLaunchEvent } from "./useRoomGameSync";
import { applyLandHitWithPower } from "@/game/combat";
import { cloneCells } from "@/game/cells/cloneCells";
import { SHOT } from "@/game/constants";
import {
  collisionHitFxSeed,
  hasActiveLandHitFx,
  jitterExplosionPosition,
  pruneLandHitFx,
  type LandHitFx,
  LAND_HIT_FX_COLOR,
} from "@/game/hitEffects";
import {
  cellIndex,
  cellPosFromIndex,
  type CellPos,
  type GameMap,
  type MapCell,
} from "@/game/maps";
import { mapProjectileRadius } from "@/game/maps";
import { cancelProjectileSim } from "@/game/projectiles/cancelSim";
import { buildFlightPayload } from "@/game/projectiles/flightPayload";
import {
  cancelAllPendingLaunchesForPlayer,
  cancelPendingLaunchesFromSource,
  compactFlights,
  stripPendingTailTowardsOtherTargets,
} from "@/game/projectiles/flightQueue";
import {
  projectileDrawPosition,
  projectileFlightAngle,
  projectileLandPosition,
  simToPath,
} from "@/game/projectiles/flightMath";
import type {
  FlightPayload,
  MapProjectileDraw,
  ProjectileSim,
} from "@/game/projectiles/types";
import {
  applyEliminationStrikes,
  captureScoreCombatSnapshot,
} from "@/game/scoring/eliminationStrikes";
import { availableProjectileCountFromSource } from "@/game/scoring/playerScores";
import { applySpawnFromSourceCell } from "@/shared/launchPower";
import {
  projectileHitRadius2,
  projectilesCollideDuringInterval,
} from "@/shared/projectileMotion";
import {
  applyMutualProjectileCollision,
  isProjectileSpent,
} from "@/shared/projectileCombat";
import { projectileCollisionShowsExplosion } from "@/shared/collisionFx";
import {
  appearanceForPlayer,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import { weaponStatsForFighter } from "@/shared/weaponStats";
import type { MapProjectilesCanvasHandle } from "@/components/map";

type UseProjectileCombatOpts = {
  roomCode: string | null;
  sessionMap: GameMap;
  localPlayerId: string;
  cellsRef: MutableRefObject<MapCell[]>;
  pushCellsToReact: () => void;
  bumpScoreDisplay: () => void;
  markScoreBarStale: () => void;
  flushScoreBarIfDirty: () => void;
  eliminationPenaltyRef: MutableRefObject<Map<string, number>>;
  scoreSlotIdsRef: MutableRefObject<readonly string[]>;
  projectilesCanvasRef: RefObject<MapProjectilesCanvasHandle | null>;
  liveMapRef: MutableRefObject<GameMap>;
  explosionJitterSpreadRef: MutableRefObject<number>;
  landHitFxRef: MutableRefObject<readonly LandHitFx[]>;
  landHitFxMetaRef: MutableRefObject<string>;
  setLandHitFx: Dispatch<SetStateAction<readonly LandHitFx[]>>;
  playerAppearancesRef: RefObject<PlayerAppearancesMap>;
  onLocalAttack?: () => void;
  /** Вкладка в фоне — без RAF, таймеров и новых залпов. */
  paused?: boolean;
  /** Актуальный meet и радиус точки с карты (для масштаба пуль). */
  mapFlightMetricsRef?: MutableRefObject<{
    meetScale: number;
    dotRadius: number;
  }>;
};

export function useProjectileCombat({
  roomCode,
  sessionMap,
  localPlayerId,
  cellsRef,
  pushCellsToReact,
  bumpScoreDisplay,
  markScoreBarStale,
  flushScoreBarIfDirty,
  eliminationPenaltyRef,
  scoreSlotIdsRef,
  projectilesCanvasRef,
  liveMapRef,
  explosionJitterSpreadRef,
  landHitFxRef,
  landHitFxMetaRef,
  setLandHitFx,
  playerAppearancesRef,
  onLocalAttack,
  paused = false,
  mapFlightMetricsRef,
}: UseProjectileCombatOpts) {
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const pauseStartedRef = useRef(0);

  const flightsRef = useRef<FlightPayload[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastCollisionFrameRef = useRef(0);
  const scoreCombatSnapshotRef = useRef<ReturnType<
    typeof captureScoreCombatSnapshot
  > | null>(null);

  const captureEliminationBaseline = useCallback(() => {
    const slotIds = scoreSlotIdsRef.current;
    if (slotIds.length === 0) return;
    scoreCombatSnapshotRef.current = captureScoreCombatSnapshot(
      cellsRef.current,
      flightsRef.current,
      slotIds
    );
  }, [cellsRef, scoreSlotIdsRef]);

  const commitEliminationStrikes = useCallback(() => {
    const before = scoreCombatSnapshotRef.current;
    const slotIds = scoreSlotIdsRef.current;
    if (!before || slotIds.length === 0) return;
    applyEliminationStrikes(
      before,
      cellsRef.current,
      flightsRef.current,
      slotIds,
      eliminationPenaltyRef.current
    );
    scoreCombatSnapshotRef.current = captureScoreCombatSnapshot(
      cellsRef.current,
      flightsRef.current,
      slotIds
    );
  }, [cellsRef, eliminationPenaltyRef, scoreSlotIdsRef]);

  const untrackTimeoutId = (tid: number) => {
    timeoutIdsRef.current = timeoutIdsRef.current.filter((x) => x !== tid);
  };

  const removeFlightIfComplete = (flight: FlightPayload) => {
    if (flight.sims.every((s) => s.landApplied)) {
      flightsRef.current = flightsRef.current.filter((f) => f !== flight);
    }
  };

  const pauseDrawLoop = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const stopDrawLoop = useCallback(() => {
    pauseDrawLoop();
    projectilesCanvasRef.current?.clear();
    landHitFxRef.current = [];
    landHitFxMetaRef.current = "";
    setLandHitFx([]);
  }, [pauseDrawLoop, setLandHitFx]);

  const ensureDrawLoop = () => {
    if (pausedRef.current || rafRef.current != null) return;

    const tick = () => {
      if (pausedRef.current) {
        rafRef.current = null;
        return;
      }
      const now = performance.now();
      const active = flightsRef.current;
      const t0 =
        lastCollisionFrameRef.current > 0
          ? lastCollisionFrameRef.current
          : now - 32;
      lastCollisionFrameRef.current = now;

      type ActiveSim = { flight: FlightPayload; sim: ProjectileSim };
      const inAir: ActiveSim[] = [];
      for (const data of active) {
        for (const sim of data.sims) {
          if (sim.landApplied || sim.destroyed) continue;
          inAir.push({ flight: data, sim });
        }
      }

      const hitR2 = projectileHitRadius2();
      const newBooms: LandHitFx[] = [];
      captureEliminationBaseline();
      for (let i = 0; i < inAir.length; i++) {
        const a = inAir[i]!;
        if (a.sim.destroyed) continue;
        for (let j = i + 1; j < inAir.length; j++) {
          if (a.sim.destroyed) break;
          const b = inAir[j]!;
          if (b.sim.destroyed) continue;
          if (a.sim.flightFid === b.sim.flightFid) continue;
          if (a.sim.hitAffiliationId === b.sim.hitAffiliationId) continue;
          const pa = projectileDrawPosition(a.sim, now);
          const pb = projectileDrawPosition(b.sim, now);
          let collides =
            pa != null &&
            pb != null &&
            (pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2 < hitR2;
          if (!collides) {
            collides = projectilesCollideDuringInterval(
              simToPath(a.sim),
              simToPath(b.sim),
              t0,
              now
            );
          }
          if (!collides) continue;

          const { aDestroyed, bDestroyed } = applyMutualProjectileCollision(
            a.sim,
            b.sim
          );
          const bx = pa && pb ? (pa.x + pb.x) / 2 : pa?.x ?? pb?.x ?? 0;
          const by = pa && pb ? (pa.y + pb.y) / 2 : pa?.y ?? pb?.y ?? 0;
          if (aDestroyed) {
            cancelProjectileSim(a.flight, a.sim, untrackTimeoutId);
          }
          if (bDestroyed) {
            cancelProjectileSim(b.flight, b.sim, untrackTimeoutId);
          }
          if (
            (aDestroyed || bDestroyed) &&
            projectileCollisionShowsExplosion(a.sim.id, b.sim.id)
          ) {
            const collideSeed = collisionHitFxSeed(a.sim.id, b.sim.id);
            const spread = explosionJitterSpreadRef.current;
            const boomPos = jitterExplosionPosition(collideSeed, bx, by, spread);
            newBooms.push({
              id: `boom-${collideSeed}`,
              x: boomPos.x,
              y: boomPos.y,
              start: now,
              color: LAND_HIT_FX_COLOR,
            });
          }
          removeFlightIfComplete(a.flight);
          removeFlightIfComplete(b.flight);
          markScoreBarStale();
        }
      }
      commitEliminationStrikes();

      flushScoreBarIfDirty();

      const pts: MapProjectileDraw[] = [];
      for (const data of active) {
        for (const sim of data.sims) {
          if (sim.landApplied || sim.destroyed) continue;
          if (isProjectileSpent(sim.power)) {
            cancelProjectileSim(data, sim, untrackTimeoutId);
            removeFlightIfComplete(data);
            continue;
          }
          const p = projectileDrawPosition(sim, now);
          if (p) {
            pts.push({
              id: sim.id,
              x: p.x,
              y: p.y,
              angle: projectileFlightAngle(sim, now),
              attackAnimation: sim.attackAnimation,
              attackerId: sim.hitAffiliationId,
              gridRow: sim.releaseWave,
              rowWidth: sim.rowWidth,
              placeInRow: sim.placeInRow,
              flightFid: sim.flightFid,
            });
          }
        }
      }
      const boomDur = SHOT.explosionDurationMs;
      const prunedFx = pruneLandHitFx(landHitFxRef.current, now, boomDur);
      const nextFx =
        newBooms.length > 0 ? [...prunedFx, ...newBooms] : prunedFx;
      landHitFxRef.current = nextFx;
      const fxMeta = nextFx.map((e) => e.id).join("|");
      if (fxMeta !== landHitFxMetaRef.current) {
        landHitFxMetaRef.current = fxMeta;
        setLandHitFx(nextFx);
      }

      const flightsLeft = flightsRef.current.length > 0;
      const fxLeft = hasActiveLandHitFx(nextFx, now, boomDur);
      const meetScale = mapFlightMetricsRef?.current.meetScale;
      projectilesCanvasRef.current?.setFrame(
        pts,
        mapProjectileRadius(
          liveMapRef.current,
          meetScale && meetScale > 0 ? meetScale : undefined
        )
      );

      if (!flightsLeft && !fxLeft) {
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const spawnLandHitFx = (
    _seed: string,
    x: number,
    y: number,
    _attackerId: string,
    fxId: string
  ) => {
    const now = performance.now();
    const spread = explosionJitterSpreadRef.current;
    const boomPos = jitterExplosionPosition(fxId, x, y, spread);
    setLandHitFx((prev) => {
      const kept = pruneLandHitFx(prev, now, SHOT.explosionDurationMs);
      const next = [
        ...kept,
        {
          id: fxId,
          x: boomPos.x,
          y: boomPos.y,
          start: now,
          color: LAND_HIT_FX_COLOR,
        },
      ];
      landHitFxRef.current = next;
      landHitFxMetaRef.current = next.map((e) => e.id).join("|");
      return next;
    });
    ensureDrawLoop();
  };

  const scheduleWaveSpawn = (
    flight: FlightPayload,
    wave: number,
    delayMs: number,
    row: ProjectileSim[]
  ) => {
    const tid = window.setTimeout(() => {
      untrackTimeoutId(tid);
      delete flight.waveSpawnTids[wave];
      applyBatchSpawn(flight, row);
    }, delayMs);
    flight.waveSpawnTids[wave] = tid;
    timeoutIdsRef.current.push(tid);
  };

  const scheduleSimLand = (
    flight: FlightPayload,
    sim: ProjectileSim,
    delayMs: number
  ) => {
    const tid = window.setTimeout(() => {
      untrackTimeoutId(tid);
      delete flight.simLandTids[sim.id];
      applySimLand(flight, sim);
    }, delayMs);
    flight.simLandTids[sim.id] = tid;
    timeoutIdsRef.current.push(tid);
  };

  const applyBatchSpawn = (flight: FlightPayload, row: ProjectileSim[]) => {
    const pending = row.filter((s) => !s.spawnApplied && !s.landApplied);
    if (pending.length === 0) return;
    for (const s of pending) s.spawnApplied = true;
    if (roomCodeRef.current) {
      bumpScoreDisplay();
      return;
    }
    const fromI = flight.fromIndex;
    const next = cloneCells(cellsRef.current);
    next[fromI] = applySpawnFromSourceCell(
      next[fromI] ?? { units: 0 },
      pending,
      Date.now()
    );
    cellsRef.current = next;
    pushCellsToReact();
  };

  const applySimLand = (flight: FlightPayload, sim: ProjectileSim) => {
    if (sim.landApplied || sim.destroyed) return;
    if (isProjectileSpent(sim.power)) {
      cancelProjectileSim(flight, sim, untrackTimeoutId);
      removeFlightIfComplete(flight);
      return;
    }
    sim.landApplied = true;
    const toI = flight.toIndex;
    const attackerId = sim.hitAffiliationId;
    const landPos = projectileLandPosition(sim);
    if (!roomCodeRef.current) {
      captureEliminationBaseline();
      const next = cloneCells(cellsRef.current);
      next[toI] = applyLandHitWithPower(
        next[toI]!,
        attackerId,
        sim.power,
        Date.now()
      );
      cellsRef.current = next;
      pushCellsToReact();
      commitEliminationStrikes();
    }
    const cell = cellsRef.current[toI]!;
    const isOwnCell =
      cell.ownerId != null && cell.ownerId === attackerId;
    if (flight.visualCombat && !isOwnCell) {
      spawnLandHitFx(
        sim.id,
        landPos.x,
        landPos.y,
        attackerId,
        `land-${sim.id}`
      );
    }
    removeFlightIfComplete(flight);
    if (roomCodeRef.current) bumpScoreDisplay();
  };

  function shiftFlightsAfterPause(deltaMs: number): void {
    if (deltaMs <= 0) return;
    const shifted = flightsRef.current.map((flight) => ({
      ...flight,
      sims: flight.sims.map((sim) =>
        !sim.landApplied
          ? { ...sim, spawnTime: sim.spawnTime + deltaMs }
          : sim
      ),
      waveSpawnTids: {},
      simLandTids: {},
    }));
    flightsRef.current = shifted;
    for (const flight of shifted) {
      if (flight.sims.some((s) => !s.landApplied)) {
        scheduleFlightTimeouts(flight);
      }
    }
    setLandHitFx((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.map((e) => ({ ...e, start: e.start + deltaMs }));
      landHitFxRef.current = next;
      landHitFxMetaRef.current = next.map((e) => e.id).join("|");
      return next;
    });
  }

  const scheduleFlightTimeouts = (flight: FlightPayload) => {
    if (pausedRef.current) return;
    const t0 = performance.now();
    const bySpawn = new Map<number, ProjectileSim[]>();
    for (const s of flight.sims) {
      const arr = bySpawn.get(s.spawnTime);
      if (arr) arr.push(s);
      else bySpawn.set(s.spawnTime, [s]);
    }
    for (const row of bySpawn.values()) {
      const spawnKey = row[0]!.spawnTime;
      const delay = Math.max(0, spawnKey - t0);
      scheduleWaveSpawn(flight, spawnKey, delay, row);
    }
    for (const sim of flight.sims) {
      scheduleSimLand(
        flight,
        sim,
        Math.max(0, sim.spawnTime + sim.flightDuration - t0)
      );
    }
  };

  const clearScheduledTimeouts = useCallback(() => {
    for (const tid of timeoutIdsRef.current) {
      window.clearTimeout(tid);
    }
    timeoutIdsRef.current = [];
  }, []);

  const resetLocalCombat = useCallback(() => {
    clearScheduledTimeouts();
    flightsRef.current = [];
    lastCollisionFrameRef.current = 0;
    scoreCombatSnapshotRef.current = null;
    eliminationPenaltyRef.current.clear();
    stopDrawLoop();
  }, [clearScheduledTimeouts, eliminationPenaltyRef, stopDrawLoop]);

  useEffect(() => {
    if (paused) {
      pauseStartedRef.current = performance.now();
      pauseDrawLoop();
      clearScheduledTimeouts();
      return;
    }
    const hiddenMs = performance.now() - pauseStartedRef.current;
    if (!roomCodeRef.current && hiddenMs > 0) {
      shiftFlightsAfterPause(hiddenMs);
    }
    if (
      flightsRef.current.length > 0 ||
      landHitFxRef.current.length > 0
    ) {
      ensureDrawLoop();
    }
  }, [paused, pauseDrawLoop, clearScheduledTimeouts]);

  const runAttackLocally = useCallback(
    (
      froms: readonly CellPos[],
      to: CellPos,
      attackerId: string,
      baseTime?: number,
      maxUnitsPerSource?: number
    ) => {
      if (pausedRef.current) return;
      if (attackerId === localPlayerId) {
        onLocalAttack?.();
      }
      const mapBase = sessionMap;
      const mapForFlight: GameMap = { ...mapBase, cells: cellsRef.current };
      const toI = cellIndex(mapForFlight, to);
      const seenFrom = new Set<number>();
      for (const from of froms) {
        const fromI = cellIndex(mapForFlight, from);
        if (seenFrom.has(fromI)) continue;
        seenFrom.add(fromI);
        stripPendingTailTowardsOtherTargets(
          fromI,
          toI,
          flightsRef.current,
          untrackTimeoutId
        );
        const fighter = appearanceForPlayer(
          playerAppearancesRef.current,
          attackerId
        ).fighter;
        const weapon = weaponStatsForFighter(fighter);
        let amount = availableProjectileCountFromSource(
          fromI,
          cellsRef.current,
          flightsRef.current,
          weapon.power
        );
        if (maxUnitsPerSource != null) {
          amount = Math.min(amount, maxUnitsPerSource);
        }
        if (amount <= 0) continue;
        const metrics = mapFlightMetricsRef?.current;
        const payload = buildFlightPayload(
          amount,
          from,
          to,
          mapForFlight,
          attackerId,
          weapon,
          baseTime,
          undefined,
          false,
          metrics?.meetScale,
          metrics?.dotRadius
        );
        flightsRef.current = [...flightsRef.current, payload];
        scheduleFlightTimeouts(payload);
      }
      ensureDrawLoop();
    },
    [sessionMap, localPlayerId, onLocalAttack, pushCellsToReact]
  );

  const handleProjectileCollision = useCallback(
    (
      destroyed: readonly { attackId: string; simIndex: number }[],
      explosions?: readonly { x: number; y: number }[]
    ) => {
      if (pausedRef.current) return;
      for (const d of destroyed) {
        for (const flight of flightsRef.current) {
          if (flight.attackId !== d.attackId) continue;
          const sim = flight.sims[d.simIndex];
          if (sim) cancelProjectileSim(flight, sim, untrackTimeoutId);
        }
      }
      compactFlights(flightsRef.current);
      if (explosions && explosions.length > 0) {
        const now = performance.now();
        const spread = explosionJitterSpreadRef.current;
        setLandHitFx((prev) => {
          const kept = pruneLandHitFx(prev, now, SHOT.explosionDurationMs);
          const additions: LandHitFx[] = explosions.map((p, i) => {
            const id = `net-boom-${now}-${i}-${p.x}-${p.y}`;
            const boomPos = jitterExplosionPosition(id, p.x, p.y, spread);
            return {
              id,
              x: boomPos.x,
              y: boomPos.y,
              start: now,
              color: LAND_HIT_FX_COLOR,
            };
          });
          const next = [...kept, ...additions];
          landHitFxRef.current = next;
          landHitFxMetaRef.current = next.map((e) => e.id).join("|");
          return next;
        });
      }
      ensureDrawLoop();
    },
    []
  );

  const runRemoteAttack = useCallback(
    (launch: AttackLaunchEvent) => {
      if (launch.amount <= 0) return;
      if (pausedRef.current) return;
      if (flightsRef.current.some((f) => f.attackId === launch.attackId)) {
        return;
      }
      const mapBase = sessionMap;
      const from = cellPosFromIndex(mapBase, launch.fromIndex);
      const to = cellPosFromIndex(mapBase, launch.toIndex);
      /** Одинаково на всех клиентах: якорь serverTime из рассылки. */
      const elapsedMs = launch.serverTime - launch.issuedAt;
      const baseTime = launch.perfAtReceive - elapsedMs;
      queueMicrotask(() => {
        const mapForFlight: GameMap = { ...mapBase, cells: cellsRef.current };
        const toI = cellIndex(mapForFlight, to);
        const fromI = cellIndex(mapForFlight, from);
        stripPendingTailTowardsOtherTargets(
          fromI,
          toI,
          flightsRef.current,
          untrackTimeoutId
        );
        const metrics = mapFlightMetricsRef?.current;
        const payload = buildFlightPayload(
          launch.amount,
          from,
          to,
          mapForFlight,
          launch.attackerId,
          weaponStatsForFighter(launch.fighter),
          baseTime,
          launch.attackId,
          true,
          metrics?.meetScale,
          metrics?.dotRadius
        );
        flightsRef.current = [...flightsRef.current, payload];
        scheduleFlightTimeouts(payload);
        ensureDrawLoop();
      });
    },
    [sessionMap]
  );

  const cancelPendingAtCell = useCallback(
    (fromI: number) => {
      cancelPendingLaunchesFromSource(
        fromI,
        flightsRef.current,
        untrackTimeoutId
      );
      ensureDrawLoop();
    },
    []
  );

  const cancelAllPendingLocal = useCallback(() => {
    cancelAllPendingLaunchesForPlayer(
      localPlayerId,
      flightsRef.current,
      untrackTimeoutId
    );
  }, [localPlayerId]);

  const stripPendingTail = useCallback((fromI: number, toI: number) => {
    stripPendingTailTowardsOtherTargets(
      fromI,
      toI,
      flightsRef.current,
      untrackTimeoutId
    );
    ensureDrawLoop();
  }, []);

  return {
    flightsRef,
    resetLocalCombat,
    stopDrawLoop,
    clearScheduledTimeouts,
    runAttackLocally,
    runRemoteAttack,
    handleProjectileCollision,
    cancelPendingAtCell,
    cancelAllPendingLocal,
    stripPendingTail,
    captureEliminationBaseline,
    commitEliminationStrikes,
  };
}
