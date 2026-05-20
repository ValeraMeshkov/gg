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
import { serverNowMs } from "@/game/serverClock";
import { applyLandHitWithPower } from "@/game/combat";
import { cloneCells } from "@/game/cells/cloneCells";
import { SHOT } from "@/game/constants";
import {
  collisionHitFxSeed,
  hasActiveLandHitFx,
  jitterExplosionPosition,
  pruneLandHitFx,
  type LandHitFx,
} from "@/game/hitEffects";
import { pickCollisionExplosionWeapon } from "@/shared/fighterExplosionFx";
import {
  type AttackAnimationId,
  weaponStatsById,
  WEAPONS,
} from "@/shared/weaponStats";

function coerceExplosionWeapon(w: unknown): AttackAnimationId {
  if (typeof w === "string" && w in WEAPONS) {
    return weaponStatsById(w as AttackAnimationId).id;
  }
  return "bullet";
}
import {
  cellIndex,
  cellPosFromIndex,
  isTerritoryIndexHidden,
  mapDotCenter,
  territoryCellPos,
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
import {
  applySpawnFromSourceCell,
  salvoBatchFullySpawned,
  salvoHasUnspawnedSims,
  salvoProjectileCount,
} from "@/shared/launchPower";
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
  collectFortressShieldZones,
  projectileFortressShieldHitDuringInterval,
} from "@/shared/fortressShieldPath";
import { spotRingRadiusForMap } from "@/shared/fortressShield";
import {
  appearanceForPlayer,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import { weaponStatsForFighter } from "@/shared/weaponStats";
import type { MapProjectilesCanvasHandle } from "@/components/map";
import type { SalvoIntent } from "@/game/projectiles/salvoIntent";

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

  /** В комнате spawnTime/land — по серверным ms; в соло — performance.now(). */
  const combatClockMs = () =>
    roomCodeRef.current ? serverNowMs() : performance.now();
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const pauseStartedRef = useRef(0);

  const flightsRef = useRef<FlightPayload[]>([]);
  const salvoIntentRef = useRef<Map<number, SalvoIntent>>(new Map());
  const tryContinueSalvoRef = useRef<
    (fromI: number, toI: number, attackerId: string) => void
  >(() => {});
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
    if (!flight.sims.every((s) => s.landApplied)) return;
    flightsRef.current = flightsRef.current.filter((f) => f !== flight);
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
      const now = combatClockMs();
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
              weapon: pickCollisionExplosionWeapon(a.sim, b.sim),
            });
          }
          removeFlightIfComplete(a.flight);
          removeFlightIfComplete(b.flight);
          markScoreBarStale();
        }
      }
      const map = liveMapRef.current;
      const metrics = mapFlightMetricsRef?.current;
      const shieldZones = collectFortressShieldZones(cellsRef.current, {
        cellCenter: (i) => {
          if (isTerritoryIndexHidden(map, i)) return null;
          return mapDotCenter(map, territoryCellPos(i));
        },
        buildingForOwner: (ownerId) =>
          appearanceForPlayer(playerAppearancesRef.current, ownerId)
            .building,
        spotRingRadius: spotRingRadiusForMap(
          map.id,
          metrics?.dotRadius,
          metrics?.meetScale
        ),
        meetScale: metrics?.meetScale,
      });
      for (const { flight, sim } of inAir) {
        if (sim.landApplied || sim.destroyed) continue;
        const hit = projectileFortressShieldHitDuringInterval(
          simToPath(sim),
          shieldZones,
          sim.hitAffiliationId,
          t0,
          now
        );
        if (!hit) continue;
        const landTid = flight.simLandTids[sim.id];
        if (landTid != null) {
          window.clearTimeout(landTid);
          untrackTimeoutId(landTid);
          delete flight.simLandTids[sim.id];
        }
        applySimLandOnCell(flight, sim, hit.zone.cellIndex, {
          x: hit.x,
          y: hit.y,
        });
        removeFlightIfComplete(flight);
        markScoreBarStale();
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
    weapon: AttackAnimationId,
    x: number,
    y: number,
    fxId: string
  ) => {
    const now = combatClockMs();
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
          weapon,
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
      if (roomCodeRef.current) return;
      const attackerId = flight.sims[0]?.hitAffiliationId;
      if (attackerId && salvoBatchFullySpawned(flight.sims)) {
        tryContinueSalvoRef.current(
          flight.fromIndex,
          flight.toIndex,
          attackerId
        );
      }
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
    const fromI = flight.fromIndex;
    const next = cloneCells(cellsRef.current);
    next[fromI] = applySpawnFromSourceCell(
      next[fromI] ?? { units: 0 },
      pending,
      Date.now()
    );
    cellsRef.current = next;
    pushCellsToReact();
    if (roomCodeRef.current) {
      bumpScoreDisplay();
    }
  };

  const applySimLandOnCell = (
    flight: FlightPayload,
    sim: ProjectileSim,
    cellIndex: number,
    landPos: { x: number; y: number }
  ) => {
    if (sim.landApplied || sim.destroyed) return;
    if (isProjectileSpent(sim.power)) {
      cancelProjectileSim(flight, sim, untrackTimeoutId);
      removeFlightIfComplete(flight);
      return;
    }
    sim.landApplied = true;
    const attackerId = sim.hitAffiliationId;
    if (!roomCodeRef.current) {
      captureEliminationBaseline();
    }
    const next = cloneCells(cellsRef.current);
    const appearances = playerAppearancesRef.current;
    const target = next[cellIndex]!;
    const defenderId = target.ownerId;
    const defenderBuilding = defenderId
      ? appearanceForPlayer(appearances, defenderId).building
      : undefined;
    const attackerBuilding = appearanceForPlayer(
      appearances,
      attackerId
    ).building;
    next[cellIndex] = applyLandHitWithPower(
      target,
      attackerId,
      sim.power,
      combatClockMs(),
      { defenderBuilding, attackerBuilding }
    );
    cellsRef.current = next;
    pushCellsToReact();
    if (!roomCodeRef.current) {
      commitEliminationStrikes();
    }
    const cell = cellsRef.current[cellIndex]!;
    const isOwnCell =
      cell.ownerId != null && cell.ownerId === attackerId;
    if (flight.visualCombat && !isOwnCell) {
      spawnLandHitFx(
        sim.attackAnimation,
        landPos.x,
        landPos.y,
        `land-${sim.id}`
      );
    }
    removeFlightIfComplete(flight);
    if (roomCodeRef.current) bumpScoreDisplay();
  };

  const applySimLand = (flight: FlightPayload, sim: ProjectileSim) => {
    applySimLandOnCell(
      flight,
      sim,
      flight.toIndex,
      projectileLandPosition(sim)
    );
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
    const t0 = combatClockMs();
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
    salvoIntentRef.current.clear();
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

  const launchSalvoBatch = useCallback(
    (
      from: CellPos,
      to: CellPos,
      toI: number,
      attackerId: string,
      baseTime?: number,
      maxUnitsPerSource?: number
    ) => {
      const mapBase = sessionMap;
      const mapForFlight: GameMap = { ...mapBase, cells: cellsRef.current };
      const fromI = cellIndex(mapForFlight, from);
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
      const available = availableProjectileCountFromSource(
        fromI,
        cellsRef.current,
        flightsRef.current,
        weapon.power
      );
      const amount = salvoProjectileCount(available, maxUnitsPerSource);
      if (amount <= 0) return;
      const metrics = mapFlightMetricsRef?.current;
      const appearances = playerAppearancesRef.current;
      const payload = buildFlightPayload(
        amount,
        from,
        to,
        mapForFlight,
        attackerId,
        weapon,
        baseTime ?? combatClockMs(),
        undefined,
        Boolean(roomCodeRef.current),
        metrics?.meetScale,
        metrics?.dotRadius,
        {
          buildingForOwner: (ownerId) =>
            ownerId
              ? appearanceForPlayer(appearances, ownerId).building
              : undefined,
        }
      );
      flightsRef.current = [...flightsRef.current, payload];
      scheduleFlightTimeouts(payload);
    },
    [sessionMap]
  );

  const tryContinueSalvo = useCallback(
    (fromI: number, toI: number, attackerId: string) => {
      const intent = salvoIntentRef.current.get(fromI);
      if (!intent || intent.toI !== toI || intent.attackerId !== attackerId) {
        return;
      }
      const stillSpawning = flightsRef.current.some(
        (f) =>
          f.fromIndex === fromI &&
          f.toIndex === toI &&
          f.sims[0]?.hitAffiliationId === attackerId &&
          salvoHasUnspawnedSims(f.sims)
      );
      if (stillSpawning) return;
      const mapForFlight: GameMap = {
        ...sessionMap,
        cells: cellsRef.current,
      };
      launchSalvoBatch(
        cellPosFromIndex(mapForFlight, fromI),
        cellPosFromIndex(mapForFlight, toI),
        toI,
        attackerId
      );
      ensureDrawLoop();
    },
    [sessionMap, launchSalvoBatch]
  );

  tryContinueSalvoRef.current = tryContinueSalvo;

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
        salvoIntentRef.current.set(fromI, { toI, attackerId });
        launchSalvoBatch(from, to, toI, attackerId, baseTime, maxUnitsPerSource);
      }
      ensureDrawLoop();
    },
    [sessionMap, localPlayerId, onLocalAttack, launchSalvoBatch]
  );

  const handleProjectileCollision = useCallback(
    (
      destroyed: readonly { attackId: string; simIndex: number }[],
      explosions?: readonly {
        x: number;
        y: number;
        weapon?: string;
      }[]
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
              weapon: coerceExplosionWeapon(p.weapon),
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
      const mapForFlight: GameMap = { ...mapBase, cells: cellsRef.current };
      const toI = cellIndex(mapForFlight, to);
      const fromI = cellIndex(mapForFlight, from);

      if (launch.attackerId === localPlayerId) {
        const existing = flightsRef.current.find(
          (f) =>
            f.fromIndex === fromI &&
            f.toIndex === toI &&
            f.sims[0]?.hitAffiliationId === launch.attackerId
        );
        if (existing) {
          existing.attackId = launch.attackId;
          if (
            !Object.keys(existing.waveSpawnTids).length &&
            !Object.keys(existing.simLandTids).length
          ) {
            scheduleFlightTimeouts(existing);
          }
          ensureDrawLoop();
          return;
        }
      }

      stripPendingTailTowardsOtherTargets(
        fromI,
        toI,
        flightsRef.current,
        untrackTimeoutId
      );

      /** Гость получает пакет позже — сдвигаем таймлайн, чтобы залп был виден целиком. */
      const nowClock = combatClockMs();
      const latencyMs = Math.max(0, nowClock - launch.serverTime);
      const playbackBase = launch.issuedAt + latencyMs;

      const metrics = mapFlightMetricsRef?.current;
      const appearances = playerAppearancesRef.current;
      const payload = buildFlightPayload(
        launch.amount,
        from,
        to,
        mapForFlight,
        launch.attackerId,
        weaponStatsForFighter(launch.fighter),
        playbackBase,
        launch.attackId,
        true,
        metrics?.meetScale,
        metrics?.dotRadius,
        {
          buildingForOwner: (ownerId) =>
            ownerId
              ? appearanceForPlayer(appearances, ownerId).building
              : undefined,
        }
      );
      flightsRef.current = [...flightsRef.current, payload];
      scheduleFlightTimeouts(payload);
      ensureDrawLoop();
    },
    [sessionMap, localPlayerId]
  );

  const cancelPendingAtCell = useCallback(
    (fromI: number) => {
      salvoIntentRef.current.delete(fromI);
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
    salvoIntentRef.current.clear();
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
