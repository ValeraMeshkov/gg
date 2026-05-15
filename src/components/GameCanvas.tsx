import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyIncrementalLandHit } from "../game/combat";
import { CELL, SHOT } from "../game/constants";
import {
  cellIndex,
  cellPosFromIndex,
  DEFAULT_MAP_ID,
  mapDotCenter,
  requireMap,
  type CellPos,
  type GameMap,
  type MapCell,
} from "../game/maps";
import {
  mapAspectRatio,
  mapProjectileRadius,
  mapShotSpeedPerMs,
} from "../game/maps";
import { fetchRoom, restartRoom } from "../api/roomApi";
import {
  useRoomGameSync,
  type AttackLaunchEvent,
} from "../hooks/useRoomGameSync";
import { shareBarColorForView } from "../game/playerColors";
import {
  appearancesFromSync,
  type MyAppearancePatch,
  type PlayerAppearancesMap,
} from "../game/appearance";
import { createMockSession, MOCK_USER, MOCK_PLAYERS } from "../game/mock";
import type { SyncAppearance } from "../../shared/wsProtocol";
import {
  projectileHitRadius2,
  projectilesCollideDuringInterval,
  type ProjectilePath,
} from "../../shared/projectileMotion";
import { fetchRemoteProfile } from "../api/profileApi";
import { getOrCreateUserId } from "../lib/userId";
import { useSyncedPlayerAppearances } from "../hooks/useSyncedPlayerAppearances";
import { useMapDotLayoutRevision } from "../hooks/useMapDotLayoutRevision";
import { MapView } from "./MapView";
import { PlayerAppearanceSelect } from "./PlayerAppearanceSelect";
import { PlayerShareBar } from "./PlayerShareBar";
import styles from "./GameCanvas.module.scss";

type GameCanvasProps = {
  mapId?: string;
  roomCode?: string | null;
};

type ProjectileSim = {
  id: string;
  flightFid: string;
  /** Индекс пачки (0 — первые `waveSize` пуль с одним `spawnTime`). */
  releaseWave: number;
  spawnTime: number;
  flightDuration: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** Смещение вдоль нормали к выстрелу (шеренга в пачке). */
  offX: number;
  offY: number;
  placeInRow: number;
  rowWidth: number;
  /** Игрок-источник выстрела: цвет, столкновения в воздухе; к клетке не привязана после вылета. */
  hitAffiliationId: string;
  /** Столкновение с другой пулей — без попадания в клетку. */
  destroyed?: boolean;
  spawnApplied?: boolean;
  landApplied?: boolean;
};

type FlightPayload = {
  attackId: string;
  sims: ProjectileSim[];
  fromIndex: number;
  toIndex: number;
  amount: number;
  waveSpawnTids: Partial<Record<number, number>>;
  simLandTids: Partial<Record<string, number>>;
};

function simToPath(sim: ProjectileSim): ProjectilePath {
  return {
    spawnTime: sim.spawnTime,
    flightDuration: sim.flightDuration,
    sx: sim.sx,
    sy: sim.sy,
    tx: sim.tx,
    ty: sim.ty,
  };
}

function cancelProjectileSim(
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

type MapProjectile = {
  id: string;
  x: number;
  y: number;
  angle: number;
  attackerId: string;
  gridRow: number;
  rowWidth: number;
  placeInRow: number;
  flightFid: string;
};

type ExplosionFx = {
  id: string;
  x: number;
  y: number;
  start: number;
};

function cloneCells(c: MapCell[]): MapCell[] {
  return c.map((x) => ({ ...x }));
}

type RoomGameOutcome = "won" | "lost" | "draw";

/** Победа/поражение в комнате на 2 игроков: у кого-то из пары 0 очков. */
function roomGameOutcomeForLocal(
  roomSlotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (roomSlotIds.length < 2) return null;
  const alive = roomSlotIds.filter((id) => (scores.get(id) ?? 0) > 0);
  if (alive.length >= 2) return null;
  if (alive.length === 0) return "draw";
  const winnerId = alive[0]!;
  return winnerId === localPlayerId ? "won" : "lost";
}

/** Сумма юнитов на всех клетках игрока. */
function playerScoresFromCells(cells: readonly MapCell[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const p of MOCK_PLAYERS) totals.set(p.id, 0);
  for (const cell of cells) {
    const id = cell.ownerId;
    if (!id || !totals.has(id)) continue;
    totals.set(id, totals.get(id)! + (cell.units ?? 0));
  }
  return totals;
}

/**
 * Комната: клетки + пули после вылета (ещё в воздухе). Пока летят — очки не «пропали».
 */
function playerScoresForRoom(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): Map<string, number> {
  const totals = playerScoresFromCells(cells);
  for (const flight of flights) {
    for (const sim of flight.sims) {
      if (!sim.spawnApplied || sim.landApplied || sim.destroyed) continue;
      const id = sim.hitAffiliationId;
      if (!totals.has(id)) continue;
      totals.set(id, totals.get(id)! + 1);
    }
  }
  return totals;
}

/**
 * Очки для полосы: клетки + пули в полёте на **свою** клетку (подкрепление).
 * Пули по чужой/нейтральной цели не считаем — иначе полоса «захватывает»
 * территорию раньше, чем на карте уменьшается куча.
 */
function playerScoresForShareBar(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): Map<string, number> {
  const totals = playerScoresFromCells(cells);
  for (const flight of flights) {
    const targetOwner = cells[flight.toIndex]?.ownerId;
    for (const sim of flight.sims) {
      if (!sim.spawnApplied || sim.landApplied) continue;
      const id = sim.hitAffiliationId;
      if (!totals.has(id) || targetOwner !== id) continue;
      totals.set(id, totals.get(id)! + 1);
    }
  }
  return totals;
}

function bumpCellsTowardsCap(
  prev: MapCell[],
  skipIndices: Set<number>,
  /** Не давать +1 с 0, пока на клетке ещё ждут выпуска пули (не вылетели). В полёте пуля ни на каком круге не «живёт». */
  freezeGrowthAtZeroWhenPendingLaunch: Set<number>
): MapCell[] {
  let changed = false;
  const next = prev.map((cell, idx) => {
    if (skipIndices.has(idx)) return cell;
    const u = cell.units ?? 0;
    if (u === 0 && freezeGrowthAtZeroWhenPendingLaunch.has(idx)) return cell;
    const cap = cell.ownerId ? CELL.ownedCap : CELL.neutralStart;
    if (u >= cap) return cell;
    changed = true;
    return { ...cell, units: Math.min(cap, u + 1) };
  });
  return changed ? next : prev;
}

function countUnspawnedFromSourceCell(
  fromI: number,
  flights: readonly FlightPayload[]
): number {
  let n = 0;
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    for (const s of f.sims) {
      if (!s.spawnApplied && !s.landApplied) n += 1;
    }
  }
  return n;
}

/** Клетки-источники, где ещё есть пули, не покинувшие круг (ожидают волны выстрела). */
function sourceCellsWithUnspawnedProjectiles(
  flights: readonly FlightPayload[]
): Set<number> {
  const s = new Set<number>();
  for (const f of flights) {
    const fromI = f.fromIndex;
    for (const x of f.sims) {
      if (!x.spawnApplied && !x.landApplied) {
        s.add(fromI);
        break;
      }
    }
  }
  return s;
}

function flightMsForMapDistance(dist: number, map: GameMap): number {
  if (dist <= 0) return 0;
  return dist / mapShotSpeedPerMs(map);
}

/** Отрезок между центрами кружков + поперечное смещение пачки; движение по времени. */
function projectileDrawPosition(
  sim: ProjectileSim,
  now: number
): { x: number; y: number } | null {
  const t = now - sim.spawnTime;
  if (t < 0) return null;
  const ax = sim.sx + sim.offX;
  const ay = sim.sy + sim.offY;
  const bx = sim.tx + sim.offX;
  const by = sim.ty + sim.offY;
  const fd = sim.flightDuration;
  if (fd <= 0) return { x: bx, y: by };
  if (t >= fd) return null;
  const k = t / fd;
  return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k };
}

function projectileFlightAngle(sim: ProjectileSim): number {
  const ax = sim.sx + sim.offX;
  const ay = sim.sy + sim.offY;
  const bx = sim.tx + sim.offX;
  const by = sim.ty + sim.offY;
  return Math.atan2(by - ay, bx - ax);
}

function buildFlightPayload(
  amount: number,
  from: CellPos,
  to: CellPos,
  map: GameMap,
  attackerId: string,
  baseTime: number = performance.now(),
  attackId?: string
): FlightPayload {
  const { x: sx, y: sy } = mapDotCenter(map, from);
  const { x: tx, y: ty } = mapDotCenter(map, to);
  const dx = tx - sx;
  const dy = ty - sy;
  const len = Math.hypot(dx, dy) || 1;
  /** Нормаль к направлению на цель — вдоль неё шеренга пачки. */
  const px = -dy / len;
  const py = dx / len;

  const ballD = mapProjectileRadius(map) * 2;
  const lateralStep = ballD * SHOT.neighborCenterDistBallDiameters;

  const ux = dx / len;
  const uy = dy / len;
  const wedgeStep = ballD * SHOT.wedgeAlongBallDiametersPerRank;
  const base = baseTime;
  const fid =
    attackId ?? `${base}-${Math.random().toString(36).slice(2, 10)}`;
  const sims: ProjectileSim[] = Array.from({ length: amount }, (_, i) => {
    const releaseWave = Math.floor(i / SHOT.waveSize);
    const kInWave = i - releaseWave * SHOT.waveSize;
    const inWave = Math.min(
      SHOT.waveSize,
      amount - releaseWave * SHOT.waveSize
    );
    const half = (inWave - 1) / 2;
    const lateral = (kInWave - half) * lateralStep;
    const distFromCenter = Math.abs(kInWave - half);
    const wedgeRank = half - distFromCenter;
    const along0 = wedgeStep * wedgeRank;
    const offXL = px * lateral;
    const offYL = py * lateral;
    const sxSim = sx + ux * along0 + offXL;
    const sySim = sy + uy * along0 + offYL;
    const txSim = tx + offXL;
    const tySim = ty + offYL;
    const segDx = txSim - sxSim;
    const segDy = tySim - sySim;
    const segLen = Math.hypot(segDx, segDy) || 1;
    const flightDuration = flightMsForMapDistance(segLen, map);
    return {
      id: `proj-${fid}-${i}`,
      flightFid: fid,
      releaseWave,
      spawnTime: base + releaseWave * SHOT.bulletBatchGapMs,
      flightDuration,
      sx: sxSim,
      sy: sySim,
      tx: txSim,
      ty: tySim,
      offX: 0,
      offY: 0,
      placeInRow: kInWave + 1,
      rowWidth: inWave,
      hitAffiliationId: attackerId,
    };
  });
  return {
    attackId: fid,
    sims,
    fromIndex: cellIndex(map, from),
    toIndex: cellIndex(map, to),
    amount,
    waveSpawnTids: {},
    simLandTids: {},
  };
}

function compactFlights(flights: FlightPayload[]): void {
  const kept = flights.filter((f) => !f.sims.every((s) => s.landApplied));
  flights.length = 0;
  for (const f of kept) flights.push(f);
}

/** Снять с конца только полностью ещё не вылетевшие волны (таймеры отменить, `landApplied` без списания юнитов). */
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

/**
 * Новый залп с той же клетки на другую цель: снять с прежних целей только очередь
 * (ещё не вылетевшие волны с конца). Уже вылетевшие пули продолжают лететь на старую цель.
 */
function stripPendingTailTowardsOtherTargets(
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

/** Повторное нажатие на кружок-источник: убрать все ожидающие вылета пули с этой клетки (уже в полёте — без изменений). */
function cancelPendingLaunchesFromSource(
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

export function GameCanvas({
  mapId: mapIdProp,
  roomCode = null,
}: GameCanvasProps) {
  const [roomMapId, setRoomMapId] = useState<string | null>(null);
  const mapId = roomMapId ?? mapIdProp ?? DEFAULT_MAP_ID;
  const layoutRevision = useMapDotLayoutRevision(mapId);
  const session = useMemo(() => {
    const map = requireMap(mapId);
    if (roomCode) {
      return {
        map: { ...map, cells: map.cells.map((c) => ({ ...c })) },
        players: MOCK_PLAYERS.map((user) => ({
          user,
          score: user.initialScore,
        })),
      };
    }
    return createMockSession(map);
  }, [mapId, roomCode]);
  const [localPlayerId, setLocalPlayerId] = useState<string>(MOCK_USER.id);
  const [syncReady, setSyncReady] = useState(!roomCode);
  const [isHost, setIsHost] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomSlotIds, setRoomSlotIds] = useState<string[]>([]);
  type MatchCountdownPhase = 3 | 2 | 1 | "go";
  const [matchCountdown, setMatchCountdown] =
    useState<MatchCountdownPhase | null>(null);
  const countdownTimersRef = useRef<number[]>([]);
  const { playerAppearances, controlledAppearance, patchMyAppearance } =
    useSyncedPlayerAppearances(localPlayerId);
  const [roomAppearances, setRoomAppearances] = useState<PlayerAppearancesMap>(
    {}
  );
  const activePlayerRef = useRef(localPlayerId);
  activePlayerRef.current = localPlayerId;

  const cellsRef = useRef<MapCell[]>(cloneCells(session.map.cells));
  const [cells, setCells] = useState<MapCell[]>(() =>
    cloneCells(session.map.cells)
  );

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    void fetchRoom(roomCode).then((room) => {
      if (cancelled || !room) return;
      setRoomMapId(room.mapId);
      setIsHost(room.hostUserId === getOrCreateUserId());
      setRoomSlotIds(
        room.players
          .map((p) => p.slotId)
          .filter((id): id is string => Boolean(id))
      );
      const me = room.players.find((p) => p.userId === getOrCreateUserId());
      if (me?.slotId) {
        setLocalPlayerId(me.slotId);
        activePlayerRef.current = me.slotId;
      }
      if (room.game?.cells) {
        const next = room.game.cells.map((c) => ({ ...c }));
        cellsRef.current = next;
        setCells(cloneCells(next));
        setSyncReady(true);
      }
      void Promise.all(
        room.players.map(async (p) => {
          if (!p.slotId) return null;
          const profile = await fetchRemoteProfile(p.userId);
          if (!profile) return null;
          return {
            slotId: p.slotId,
            fighter: profile.fighter,
            building: profile.building,
          };
        })
      ).then((rows) => {
        if (cancelled) return;
        const valid: SyncAppearance[] = [];
        for (const r of rows) {
          if (r) valid.push(r);
        }
        if (valid.length > 0) {
          setRoomAppearances((prev) => ({
            ...prev,
            ...appearancesFromSync(valid),
          }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const [projectiles, setProjectiles] = useState<readonly MapProjectile[]>([]);
  const [explosions, setExplosions] = useState<readonly ExplosionFx[]>([]);
  /** Пересчёт полосы, когда меняются полёты без обновления cells (столкновения пуль). */
  const [scoreEpoch, setScoreEpoch] = useState(0);
  const bumpScoreDisplay = () => setScoreEpoch((e) => e + 1);

  const flightsRef = useRef<FlightPayload[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastCollisionFrameRef = useRef(0);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  const pushCellsToReact = () => {
    setCells(cloneCells(cellsRef.current));
  };

  const applyCellsFromServer = useCallback((next: MapCell[]) => {
    cellsRef.current = cloneCells(next);
    setCells(cloneCells(next));
  }, []);

  const clearScheduledTimeouts = () => {
    for (const tid of timeoutIdsRef.current) {
      window.clearTimeout(tid);
    }
    timeoutIdsRef.current = [];
  };

  const stopDrawLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setProjectiles([]);
    setExplosions([]);
  };

  const resetLocalCombat = useCallback(() => {
    clearScheduledTimeouts();
    flightsRef.current = [];
    lastCollisionFrameRef.current = 0;
    stopDrawLoop();
  }, []);

  const clearMatchCountdown = useCallback(() => {
    for (const tid of countdownTimersRef.current) {
      window.clearTimeout(tid);
    }
    countdownTimersRef.current = [];
    setMatchCountdown(null);
  }, []);

  const startMatchCountdown = useCallback(() => {
    clearMatchCountdown();
    const steps: (MatchCountdownPhase | null)[] = [3, 2, 1, "go", null];
    steps.forEach((phase, index) => {
      const tid = window.setTimeout(() => {
        setMatchCountdown(phase);
      }, index * 1000);
      countdownTimersRef.current.push(tid);
    });
  }, [clearMatchCountdown]);

  const applyRemoteAppearances = useCallback((players: SyncAppearance[]) => {
    if (players.length === 0) return;
    setRoomAppearances((prev) => ({
      ...prev,
      ...appearancesFromSync(players),
    }));
  }, []);

  const applyGameReset = useCallback(
    (
      snapMapId: string,
      snapCells: MapCell[],
      appearances: SyncAppearance[] = [],
      startCountdown = false
    ) => {
      resetLocalCombat();
      setRoomMapId(snapMapId);
      applyCellsFromServer(snapCells);
      applyRemoteAppearances(appearances);
      setSyncReady(true);
      if (startCountdown) startMatchCountdown();
    },
    [
      applyCellsFromServer,
      applyRemoteAppearances,
      resetLocalCombat,
      startMatchCountdown,
    ]
  );

  const ensureDrawLoop = () => {
    if (rafRef.current != null) return;

    const tick = () => {
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
      const newBooms: ExplosionFx[] = [];
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
          const bx = pa && pb ? (pa.x + pb.x) / 2 : pa?.x ?? pb?.x ?? 0;
          const by = pa && pb ? (pa.y + pb.y) / 2 : pa?.y ?? pb?.y ?? 0;
          cancelProjectileSim(a.flight, a.sim, untrackTimeoutId);
          cancelProjectileSim(b.flight, b.sim, untrackTimeoutId);
          newBooms.push({
            id: `boom-${now.toFixed(0)}-${i}-${j}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
            x: bx,
            y: by,
            start: now,
          });
          removeFlightIfComplete(a.flight);
          removeFlightIfComplete(b.flight);
          bumpScoreDisplay();
        }
      }

      const pts: MapProjectile[] = [];
      for (const data of active) {
        for (const sim of data.sims) {
          if (sim.landApplied || sim.destroyed) continue;
          const p = projectileDrawPosition(sim, now);
          if (p) {
            pts.push({
              id: sim.id,
              x: p.x,
              y: p.y,
              angle: projectileFlightAngle(sim),
              attackerId: sim.hitAffiliationId,
              gridRow: sim.releaseWave,
              rowWidth: sim.rowWidth,
              placeInRow: sim.placeInRow,
              flightFid: sim.flightFid,
            });
          }
        }
      }
      setProjectiles(pts);

      const boomDur = SHOT.explosionDurationMs;
      setExplosions((prev) => {
        const kept = prev.filter((e) => now - e.start < boomDur);
        if (newBooms.length === 0 && kept.length === prev.length)
          return kept as readonly ExplosionFx[];
        return [...kept, ...newBooms];
      });

      if (flightsRef.current.length === 0) {
        rafRef.current = null;
        setProjectiles([]);
        setExplosions([]);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const removeFlightIfComplete = (flight: FlightPayload) => {
    if (flight.sims.every((s) => s.landApplied)) {
      flightsRef.current = flightsRef.current.filter((f) => f !== flight);
    }
  };

  const untrackTimeoutId = (tid: number) => {
    timeoutIdsRef.current = timeoutIdsRef.current.filter((x) => x !== tid);
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
    const u = next[fromI]?.units ?? 0;
    next[fromI] = {
      ...next[fromI]!,
      units: Math.max(0, u - pending.length),
    };
    cellsRef.current = next;
    pushCellsToReact();
  };

  const applySimLand = (flight: FlightPayload, sim: ProjectileSim) => {
    if (sim.landApplied || sim.destroyed) return;
    sim.landApplied = true;
    const toI = flight.toIndex;
    const cell = cellsRef.current[toI]!;
    const attackerId = sim.hitAffiliationId;
    const friendly = cell.ownerId != null && cell.ownerId === attackerId;
    const center = mapDotCenter(
      session.map,
      cellPosFromIndex(session.map, toI)
    );
    if (!roomCodeRef.current) {
      const next = cloneCells(cellsRef.current);
      next[toI] = applyIncrementalLandHit(next[toI]!, attackerId);
      cellsRef.current = next;
      pushCellsToReact();
    }
    // В комнате клетки меняет сервер, но взрыв на чужой/нейтральной точке — только визуал.
    if (!friendly) {
      const now = performance.now();
      setExplosions((prev) => {
        const kept = prev.filter(
          (e) => now - e.start < SHOT.explosionDurationMs
        );
        return [
          ...kept,
          {
            id: `boom-land-${sim.id}`,
            x: center.x,
            y: center.y,
            start: now,
          },
        ];
      });
    }
    removeFlightIfComplete(flight);
    if (roomCodeRef.current) bumpScoreDisplay();
  };

  const scheduleFlightTimeouts = (flight: FlightPayload) => {
    const t0 = performance.now();

    const byWave = new Map<number, ProjectileSim[]>();
    for (const s of flight.sims) {
      const arr = byWave.get(s.releaseWave);
      if (arr) arr.push(s);
      else byWave.set(s.releaseWave, [s]);
    }
    for (const row of byWave.values()) {
      const wave = row[0]!.releaseWave;
      const delay = Math.max(0, row[0]!.spawnTime - t0);
      scheduleWaveSpawn(flight, wave, delay, row);
    }

    for (const sim of flight.sims) {
      scheduleSimLand(
        flight,
        sim,
        Math.max(0, sim.spawnTime + sim.flightDuration - t0)
      );
    }
  };

  useEffect(() => {
    if (roomCode) return;
    const id = window.setInterval(() => {
      const busy = new Set<number>();
      const pendingLaunch = sourceCellsWithUnspawnedProjectiles(
        flightsRef.current
      );
      const bumped = bumpCellsTowardsCap(cellsRef.current, busy, pendingLaunch);
      if (bumped !== cellsRef.current) {
        cellsRef.current = bumped;
        pushCellsToReact();
      }
    }, CELL.growthMs);
    return () => window.clearInterval(id);
  }, [roomCode]);

  useEffect(
    () => () => {
      clearScheduledTimeouts();
      clearMatchCountdown();
      stopDrawLoop();
    },
    [clearMatchCountdown]
  );

  const liveMap = useMemo(
    () => ({ ...session.map, cells }),
    [session.map, cells]
  );

  const liveScores = useMemo(
    () =>
      roomCode
        ? playerScoresForRoom(cells, flightsRef.current)
        : playerScoresForShareBar(cells, flightsRef.current),
    [cells, scoreEpoch, roomCode]
  );

  const shareBarPlayers = useMemo(() => {
    const slots =
      roomCode && roomSlotIds.length > 0
        ? session.players.filter((s) => roomSlotIds.includes(s.user.id))
        : session.players;
    return slots.map((slot) => {
      const bar = shareBarColorForView(
        slot.user.id,
        localPlayerId,
        controlledAppearance.displayColor
      );
      return {
        id: slot.user.id,
        displayName: slot.user.displayName,
        score: liveScores.get(slot.user.id) ?? 0,
        colorIndex: bar.colorIndex,
        barBackground: bar.background,
      };
    });
  }, [
    session.players,
    liveScores,
    localPlayerId,
    roomCode,
    roomSlotIds,
    controlledAppearance.displayColor,
  ]);

  const gameOutcome = useMemo(
    (): RoomGameOutcome | null =>
      roomCode
        ? roomGameOutcomeForLocal(roomSlotIds, liveScores, localPlayerId)
        : null,
    [roomCode, roomSlotIds, liveScores, localPlayerId, scoreEpoch]
  );

  const localSlot = session.players.find((s) => s.user.id === localPlayerId);

  const runAttackLocally = useCallback(
    (
      froms: readonly CellPos[],
      to: CellPos,
      attackerId: string,
      baseTime?: number
    ) => {
      const mapBase = session.map;
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
        const u = cellsRef.current[fromI]?.units ?? 0;
        const reserved = countUnspawnedFromSourceCell(
          fromI,
          flightsRef.current
        );
        const amount = Math.max(0, u - reserved);
        if (amount <= 0) continue;
        const payload = buildFlightPayload(
          amount,
          from,
          to,
          mapForFlight,
          attackerId,
          baseTime
        );
        flightsRef.current = [...flightsRef.current, payload];
        scheduleFlightTimeouts(payload);
      }
      ensureDrawLoop();
    },
    [session.map, localPlayerId]
  );

  const handleProjectileCollision = useCallback(
    (destroyed: readonly { attackId: string; simIndex: number }[]) => {
      for (const d of destroyed) {
        for (const flight of flightsRef.current) {
          if (flight.attackId !== d.attackId) continue;
          const sim = flight.sims[d.simIndex];
          if (sim) cancelProjectileSim(flight, sim, untrackTimeoutId);
        }
      }
      compactFlights(flightsRef.current);
      ensureDrawLoop();
    },
    []
  );

  const runRemoteAttack = useCallback(
    (launch: AttackLaunchEvent) => {
      if (launch.amount <= 0) return;
      const mapBase = session.map;
      const from = cellPosFromIndex(mapBase, launch.fromIndex);
      const to = cellPosFromIndex(mapBase, launch.toIndex);
      const clockSkew = Date.now() - launch.issuedAt;
      const baseTime = performance.now() - clockSkew;
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
        const payload = buildFlightPayload(
          launch.amount,
          from,
          to,
          mapForFlight,
          launch.attackerId,
          baseTime,
          launch.attackId
        );
        flightsRef.current = [...flightsRef.current, payload];
        scheduleFlightTimeouts(payload);
        ensureDrawLoop();
      });
    },
    [session.map]
  );

  const { connected: wsConnected, sendAttack, sendCancelPending, sendAppearance, reconnect } =
    useRoomGameSync({
      roomCode,
      onSnapshot: (snapMapId, snapCells, appearances) => {
        applyGameReset(snapMapId, snapCells, appearances);
      },
      onCells: (snapCells) => {
        applyCellsFromServer(snapCells);
      },
      onAttackLaunch: runRemoteAttack,
      onGameReset: (mapId, snapCells, appearances, countdown) => {
        applyGameReset(mapId, snapCells, appearances, countdown);
      },
      onAppearances: applyRemoteAppearances,
      onAppearance: (slotId, fighter, building) => {
        applyRemoteAppearances([{ slotId, fighter, building }]);
      },
      onProjectileCollision: handleProjectileCollision,
    });

  const playerAppearancesMerged = useMemo((): PlayerAppearancesMap => {
    return {
      ...playerAppearances,
      ...roomAppearances,
      [localPlayerId]: controlledAppearance,
    };
  }, [
    playerAppearances,
    roomAppearances,
    localPlayerId,
    controlledAppearance,
  ]);

  const patchMyAppearanceRoom = useCallback(
    (patch: MyAppearancePatch) => {
      const next = { ...controlledAppearance, ...patch };
      patchMyAppearance(patch);
      if (roomCode && wsConnected) {
        sendAppearance(next.fighter, next.building);
      }
    },
    [
      controlledAppearance,
      patchMyAppearance,
      roomCode,
      wsConnected,
      sendAppearance,
    ]
  );

  const handleRefreshState = useCallback(async () => {
    if (!roomCode) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      const room = await fetchRoom(roomCode);
      if (!room?.game?.cells) {
        setRoomActionError("Нет данных игры на сервере");
        return;
      }
      applyGameReset(room.game.mapId, room.game.cells);
      reconnect();
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : "Не удалось обновить"
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, applyGameReset, reconnect]);

  const handleNewGame = useCallback(async () => {
    if (!roomCode || !isHost) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      await restartRoom(roomCode, getOrCreateUserId());
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : "Не удалось начать новую игру"
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, isHost]);

  const handleCancelPendingFrom = useCallback(
    (cell: CellPos) => {
      if (roomCode && (gameOutcome || matchCountdown !== null)) return;
      const mapBase = session.map;
      const fromI = cellIndex(mapBase, cell);
      if (roomCode && wsConnected) {
        sendCancelPending(fromI);
      }
      queueMicrotask(() => {
        cancelPendingLaunchesFromSource(
          fromI,
          flightsRef.current,
          untrackTimeoutId
        );
        ensureDrawLoop();
      });
    },
    [
      session.map,
      roomCode,
      wsConnected,
      sendCancelPending,
      gameOutcome,
      matchCountdown,
    ]
  );

  const handleCommitAttacks = (froms: readonly CellPos[], to: CellPos) => {
    if (froms.length === 0) return;
    if (roomCode && (gameOutcome || matchCountdown !== null)) return;
    if (roomCode) {
      if (wsConnected) {
        const mapBase = session.map;
        const toI = cellIndex({ ...mapBase, cells: cellsRef.current }, to);
        const fromIndices: number[] = [];
        const seen = new Set<number>();
        for (const from of froms) {
          const fromI = cellIndex(
            { ...mapBase, cells: cellsRef.current },
            from
          );
          if (seen.has(fromI)) continue;
          seen.add(fromI);
          fromIndices.push(fromI);
          stripPendingTailTowardsOtherTargets(
            fromI,
            toI,
            flightsRef.current,
            untrackTimeoutId
          );
        }
        sendAttack(fromIndices, toI);
        ensureDrawLoop();
        return;
      }
      setRoomActionError("Нет связи с сервером — переподключение…");
      reconnect();
      return;
    }
    queueMicrotask(() => {
      runAttackLocally(froms, to, localPlayerId);
    });
  };

  return (
    <div className={styles.root}>
      {roomCode ? (
        <div className={styles.roomBanner}>
          <p className={styles.roomBannerText}>
            Комната {roomCode}
            {wsConnected ? " — онлайн" : " — подключение…"}
            {!syncReady ? " — загрузка поля…" : null}
          </p>
          {isHost ? (
            <div className={styles.roomBannerActions}>
              <button
                type="button"
                className={styles.roomBtn}
                disabled={roomBusy}
                onClick={() => void handleRefreshState()}
              >
                Обновить
              </button>
              <button
                type="button"
                className={styles.roomBtnPrimary}
                disabled={roomBusy}
                onClick={() => void handleNewGame()}
              >
                Новая игра
              </button>
            </div>
          ) : null}
          {roomActionError ? (
            <p className={styles.roomBannerError}>{roomActionError}</p>
          ) : null}
        </div>
      ) : null}
      <PlayerShareBar
        players={shareBarPlayers}
        activePlayerId={localPlayerId}
        readOnly
      />
      <PlayerAppearanceSelect
        playerName={
          localSlot ? `${localSlot.user.displayName} (вы)` : "Ваш игрок"
        }
        fighter={controlledAppearance.fighter}
        building={controlledAppearance.building}
        displayColor={controlledAppearance.displayColor}
        onFighterChange={(fighter) => patchMyAppearanceRoom({ fighter })}
        onBuildingChange={(building) => patchMyAppearanceRoom({ building })}
        onDisplayColorChange={(displayColor) =>
          patchMyAppearance({ displayColor })
        }
      />
      <div className={styles.wrap} aria-label="Игровое поле">
        {matchCountdown !== null && roomCode ? (
          <div
            className={`${styles.mapToast} ${styles.mapToastCountdown}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {matchCountdown === "go" ? (
              <p className={styles.mapToastCountdownGo}>Поехали!</p>
            ) : (
              <>
                <p className={styles.mapToastCountdownLabel}>Старт через</p>
                <p className={styles.mapToastCountdownNumber}>
                  {matchCountdown}
                </p>
              </>
            )}
          </div>
        ) : null}
        {gameOutcome && roomCode && matchCountdown === null ? (
          <div
            className={styles.mapToast}
            role="status"
            aria-live="polite"
            aria-labelledby="game-over-title"
          >
            <p
              id="game-over-title"
              className={
                gameOutcome === "won"
                  ? styles.mapToastTitleWin
                  : gameOutcome === "lost"
                    ? styles.mapToastTitleLose
                    : styles.mapToastTitleDraw
              }
            >
              {gameOutcome === "won"
                ? "Ура, победа!"
                : gameOutcome === "lost"
                  ? "Вы проиграли"
                  : "Ничья"}
            </p>
            {isHost ? (
              <button
                type="button"
                className={styles.mapToastBtn}
                disabled={roomBusy}
                onClick={() => void handleNewGame()}
              >
                Новая игра
              </button>
            ) : (
              <p className={styles.mapToastHint}>Ждём хоста…</p>
            )}
          </div>
        ) : null}
        <div
          className={styles.mapSurface}
          style={{ aspectRatio: mapAspectRatio(liveMap) }}
        >
        <MapView
          key={layoutRevision}
          map={liveMap}
          localPlayerId={localPlayerId}
          localDisplayColor={controlledAppearance.displayColor}
          activePlayerRef={activePlayerRef}
          playerAppearances={playerAppearancesMerged}
          projectiles={projectiles}
          explosions={explosions}
          syncMapLayout={Boolean(roomCode)}
          onCommitAttacks={handleCommitAttacks}
          onCancelPendingFrom={handleCancelPendingFrom}
        />
        </div>
      </div>
    </div>
  );
}
