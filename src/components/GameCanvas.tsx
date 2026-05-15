import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyIncrementalLandHit } from "../game/combat";
import { CELL, SHOT } from "../game/constants";
import {
  cellIndex,
  cellPosFromIndex,
  DEFAULT_MAP_ID,
  getMapCatalogEntry,
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
import { appearanceForPlayer } from "../game/appearance";
import { createMockSession, MOCK_USER, MOCK_PLAYERS } from "../game/mock";
import { useSyncedPlayerAppearances } from "../hooks/useSyncedPlayerAppearances";
import { useMapDotLayoutRevision } from "../hooks/useMapDotLayoutRevision";
import { MapView } from "./MapView";
import { PlayerAppearanceSelect } from "./PlayerAppearanceSelect";
import { PlayerShareBar } from "./PlayerShareBar";
import styles from "./GameCanvas.module.scss";

type GameCanvasProps = {
  mapId?: string;
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
  sims: ProjectileSim[];
  fromIndex: number;
  toIndex: number;
  amount: number;
  waveSpawnTids: Partial<Record<number, number>>;
  simLandTids: Partial<Record<string, number>>;
};

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

/** Очки для полосы: клетки + пули в полёте (после вылета, до приземления). */
function playerScoresForShareBar(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[]
): Map<string, number> {
  const totals = playerScoresFromCells(cells);
  for (const flight of flights) {
    for (const sim of flight.sims) {
      if (!sim.spawnApplied || sim.landApplied) continue;
      const id = sim.hitAffiliationId;
      if (!totals.has(id)) continue;
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
  attackerId: string
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
  const base = performance.now();
  const fid = `${base}-${Math.random().toString(36).slice(2, 10)}`;
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

export function GameCanvas({ mapId: mapIdProp }: GameCanvasProps) {
  const mapId = mapIdProp ?? DEFAULT_MAP_ID;
  const layoutRevision = useMapDotLayoutRevision(mapId);
  const session = useMemo(() => createMockSession(requireMap(mapId)), [mapId]);
  const [controlledPlayerId, setControlledPlayerId] = useState<string>(
    MOCK_USER.id
  );
  const { playerAppearances, patchPlayerAppearance } =
    useSyncedPlayerAppearances();
  const activePlayerRef = useRef(controlledPlayerId);
  activePlayerRef.current = controlledPlayerId;

  const adoptPlayerForCell = useCallback((ownerId: string) => {
    activePlayerRef.current = ownerId;
    setControlledPlayerId(ownerId);
  }, []);
  const cellsRef = useRef<MapCell[]>(cloneCells(session.map.cells));
  const [cells, setCells] = useState<MapCell[]>(() =>
    cloneCells(session.map.cells)
  );

  const [projectiles, setProjectiles] = useState<readonly MapProjectile[]>([]);
  const [explosions, setExplosions] = useState<readonly ExplosionFx[]>([]);
  /** Пересчёт полосы, когда меняются полёты без обновления cells (столкновения пуль). */
  const [scoreEpoch, setScoreEpoch] = useState(0);
  const bumpScoreDisplay = () => setScoreEpoch((e) => e + 1);

  const flightsRef = useRef<FlightPayload[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  const pushCellsToReact = () => {
    setCells(cloneCells(cellsRef.current));
  };

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

  const ensureDrawLoop = () => {
    if (rafRef.current != null) return;
    const hitR = mapProjectileRadius(session.map) * 2 * 0.92;

    const tick = () => {
      const now = performance.now();
      const active = flightsRef.current;
      const hitR2 = hitR * hitR;

      type Live = {
        flight: FlightPayload;
        sim: ProjectileSim;
        x: number;
        y: number;
      };
      const live: Live[] = [];
      for (const data of active) {
        for (const sim of data.sims) {
          if (sim.landApplied) continue;
          const p = projectileDrawPosition(sim, now);
          if (p) live.push({ flight: data, sim, x: p.x, y: p.y });
        }
      }

      const newBooms: ExplosionFx[] = [];
      for (let i = 0; i < live.length; i++) {
        const a = live[i]!;
        if (a.sim.landApplied) continue;
        for (let j = i + 1; j < live.length; j++) {
          if (a.sim.landApplied) break;
          const b = live[j]!;
          if (b.sim.landApplied) continue;
          if (a.sim.flightFid === b.sim.flightFid) continue;
          if (a.sim.hitAffiliationId === b.sim.hitAffiliationId) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy >= hitR2) continue;
          a.sim.destroyed = true;
          b.sim.destroyed = true;
          a.sim.landApplied = true;
          b.sim.landApplied = true;
          newBooms.push({
            id: `boom-${now.toFixed(0)}-${i}-${j}-${Math.random()
              .toString(36)
              .slice(2, 7)}`,
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
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
          if (sim.landApplied) continue;
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
    if (sim.landApplied) return;
    sim.landApplied = true;
    const toI = flight.toIndex;
    const cell = cellsRef.current[toI]!;
    const attackerId = sim.hitAffiliationId;
    const friendly = cell.ownerId != null && cell.ownerId === attackerId;
    const center = mapDotCenter(
      session.map,
      cellPosFromIndex(session.map, toI)
    );
    const next = cloneCells(cellsRef.current);
    next[toI] = applyIncrementalLandHit(next[toI]!, attackerId);
    cellsRef.current = next;
    pushCellsToReact();
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
  }, []);

  useEffect(
    () => () => {
      clearScheduledTimeouts();
      stopDrawLoop();
    },
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      for (let i = 0; i < MOCK_PLAYERS.length; i++) {
        if (e.key === String(i + 1)) adoptPlayerForCell(MOCK_PLAYERS[i]!.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adoptPlayerForCell]);

  const liveMap = useMemo(
    () => ({ ...session.map, cells }),
    [session.map, cells]
  );

  const liveScores = useMemo(
    () => playerScoresForShareBar(cells, flightsRef.current),
    [cells, scoreEpoch]
  );

  const shareBarPlayers = useMemo(
    () =>
      session.players.map((slot, slotIndex) => ({
        id: slot.user.id,
        displayName: slot.user.displayName,
        score: liveScores.get(slot.user.id) ?? 0,
        colorIndex: slotIndex + 1,
      })),
    [session.players, liveScores]
  );

  const catalog = getMapCatalogEntry(mapId);
  const mapTitle = catalog
    ? `Карта №${catalog.number}: ${catalog.name}`
    : requireMap(mapId).name;

  const controlledSlot = session.players.find(
    (s) => s.user.id === controlledPlayerId
  );
  const controlledAppearance = appearanceForPlayer(
    playerAppearances,
    controlledPlayerId
  );

  const handleCancelPendingFrom = useCallback(
    (cell: CellPos) => {
      const mapBase = session.map;
      const fromI = cellIndex(mapBase, cell);
      queueMicrotask(() => {
        cancelPendingLaunchesFromSource(
          fromI,
          flightsRef.current,
          untrackTimeoutId
        );
        ensureDrawLoop();
      });
    },
    [session.map]
  );

  const handleCommitAttacks = (froms: readonly CellPos[], to: CellPos) => {
    if (froms.length === 0) return;
    const mapBase = session.map;
    queueMicrotask(() => {
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
          controlledPlayerId
        );
        flightsRef.current = [...flightsRef.current, payload];
        scheduleFlightTimeouts(payload);
      }
      ensureDrawLoop();
    });
  };

  return (
    <div className={styles.root}>
      <PlayerShareBar
        players={shareBarPlayers}
        activePlayerId={controlledPlayerId}
        onSelectPlayer={adoptPlayerForCell}
      />
      <PlayerAppearanceSelect
        playerName={controlledSlot?.user.displayName ?? "Игрок"}
        fighter={controlledAppearance.fighter}
        building={controlledAppearance.building}
        onFighterChange={(fighter) =>
          patchPlayerAppearance(controlledPlayerId, { fighter })
        }
        onBuildingChange={(building) =>
          patchPlayerAppearance(controlledPlayerId, { building })
        }
      />
      <p className={styles.mapCatalog} aria-live="polite">
        <span className={styles.mapCatalogTitle}>{mapTitle}</span>
        {catalog ? (
          <span className={styles.mapCatalogMeta}>
            {" "}
            (id: {catalog.id}, точек: {liveMap.cells.length})
          </span>
        ) : null}
      </p>
      <div
        className={styles.wrap}
        style={{ aspectRatio: mapAspectRatio(liveMap) }}
        aria-label="Игровое поле"
      >
        <MapView
          key={layoutRevision}
          map={liveMap}
          activePlayerRef={activePlayerRef}
          adoptPlayerForCell={adoptPlayerForCell}
          playerAppearances={playerAppearances}
          projectiles={projectiles}
          explosions={explosions}
          onCommitAttacks={handleCommitAttacks}
          onCancelPendingFrom={handleCancelPendingFrom}
        />
      </div>
    </div>
  );
}
