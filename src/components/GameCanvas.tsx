import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { applyIncrementalLandHit } from "../game/combat";
import { CELL, SHOT } from "../game/constants";
import {
  cellIndex,
  cellPosFromIndex,
  DEFAULT_MAP_ID,
  mapDotCenter,
  requireMap,
  isTerritoryMap,
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
import {
  collisionHitFxSeed,
  hasActiveLandHitFx,
  jitterExplosionPosition,
  pruneLandHitFx,
  type LandHitFx,
  LAND_HIT_FX_COLOR,
} from "../game/hitEffects";
import { shareBarColorForView } from "../game/playerColors";
import {
  appearancesFromSync,
  type MyAppearancePatch,
  type PlayerAppearancesMap,
} from "../game/appearance";
import {
  createMockSession,
  MOCK_USER,
  MOCK_PLAYERS,
  OFFLINE_BOT_APPEARANCES,
  offlineBotIdsForCount,
  pickOfflineBotAttack,
  type OfflineBotFlightsInput,
} from "../game/mock";
import { firstMoveHintEndpoints } from "../game/firstMoveHint";
import type { SyncAppearance } from "../../shared/wsProtocol";
import {
  projectileHitRadius2,
  projectilesCollideDuringInterval,
  type ProjectilePath,
} from "../../shared/projectileMotion";
import { projectileCollisionShowsExplosion } from "../../shared/collisionFx";
import { offlineBotThinkDelayMs } from "../../shared/offlineBotDifficulty";
import { assignOfflineBotDisplayColors } from "../../shared/offlinePlayerColors";
import { fetchRemoteProfile } from "../api/profileApi";
import { getOrCreateUserId } from "../lib/userId";
import { useSyncedPlayerAppearances } from "../hooks/useSyncedPlayerAppearances";
import { effectiveDisplayName } from "../game/playerDisplayName";
import { useMapDotLayoutRevision } from "../hooks/useMapDotLayoutRevision";
import { useGameShell } from "../context/GameShellContext";
import { GameSettingsPanel } from "./GameSettingsPanel";
import { MapView } from "./MapView";
import type { MapProjectilesCanvasHandle } from "./map/MapProjectilesCanvas";
import { RoomChat } from "./RoomChat";
import styles from "./GameCanvas.module.scss";

type GameCanvasProps = {
  mapId?: string;
  roomCode?: string | null;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  /** Только оффлайн: случайная карта при загрузке и «Новая игра». */
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  /** Только оффлайн: 0 — очень просто, 100 — сложно. */
  offlineBotDifficulty?: number;
  /** Оффлайн: число ботов-соперников (1–5). */
  offlineBotCount?: number;
  /** Оффлайн: сброс партии после «Новая игра» в сообщении о конце игры. */
  onOfflineNewGame?: () => void;
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
  /** Атака по чужой/нейтральной клетке (не подкрепление) — для визуала попаданий. */
  visualCombat: boolean;
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


function cloneCells(c: MapCell[]): MapCell[] {
  return c.map((x) => ({ ...x }));
}

type RoomGameOutcome = "won" | "lost" | "draw";

/** Победа: остался один игрок с очками > 0 (FFA). */
function roomGameOutcomeForLocal(
  roomSlotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (roomSlotIds.length < 2) return null;
  const alive = roomSlotIds.filter((id) => (scores.get(id) ?? 0) > 0);
  if (alive.length > 1) return null;
  if (alive.length === 0) return "draw";
  const winnerId = alive[0]!;
  return winnerId === localPlayerId ? "won" : "lost";
}

/**
 * Одиночка: как только у игрока 0 очков, а у кого-то ещё ещё есть — сразу «проигрыш»,
 * не дожидаясь исхода боя ботов между собой.
 */
function offlineImmediateOutcomeForLocal(
  slotIds: readonly string[],
  scores: ReadonlyMap<string, number>,
  localPlayerId: string
): RoomGameOutcome | null {
  if (slotIds.length < 2) return null;
  const my = scores.get(localPlayerId) ?? 0;
  if (my > 0) return null;
  const rivalAlive = slotIds.some(
    (id) => id !== localPlayerId && (scores.get(id) ?? 0) > 0
  );
  if (rivalAlive) return "lost";
  if (slotIds.every((id) => (scores.get(id) ?? 0) <= 0)) return "draw";
  return null;
}

/** Сумма юнитов на всех клетках игрока. */
function playerScoresFromCells(
  cells: readonly MapCell[],
  slotIds: readonly string[] = []
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const id of slotIds) totals.set(id, 0);
  for (const cell of cells) {
    const id = cell.ownerId;
    if (!id) continue;
    if (!totals.has(id)) totals.set(id, 0);
    totals.set(id, totals.get(id)! + (cell.units ?? 0));
  }
  return totals;
}

/**
 * Очки для полосы (и комната, и оффлайн): юниты на клетках **+** уже вылетевшие,
 * но ещё не приземлившиеся снаряды (до взрыва/отмены). На карте куча у источника уже
 * уменьшена при вылете — без этой поправки полоска преждевременно «теряет» очки.
 */
function playerScoresForRoom(
  cells: readonly MapCell[],
  flights: readonly FlightPayload[],
  slotIds: readonly string[]
): Map<string, number> {
  const totals = playerScoresFromCells(cells, slotIds);
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

/** Точка приземления конкретной пули (с учётом шеренги/клина пачки). */
function projectileLandPosition(sim: ProjectileSim): { x: number; y: number } {
  return { x: sim.tx + sim.offX, y: sim.ty + sim.offY };
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
  const toI = cellIndex(map, to);
  const targetOwner = map.cells[toI]?.ownerId ?? null;
  const visualCombat = targetOwner !== attackerId;

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
    toIndex: toI,
    amount,
    visualCombat,
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
  onMapIdChange,
  mapSelectHint,
  randomMapOnStart,
  onRandomMapOnStartChange,
  offlineBotDifficulty,
  offlineBotCount,
  onOfflineNewGame,
}: GameCanvasProps) {
  const [roomMapId, setRoomMapId] = useState<string | null>(null);
  const mapId = roomMapId ?? mapIdProp ?? DEFAULT_MAP_ID;
  /** В комнате селект редактирует `mapId` в маршруте (карта для «Новая игра»), иначе он был бы жёстко привязан к `roomMapId` и смена пункта не отображалась. */
  const settingsMapId = roomCode ? (mapIdProp ?? DEFAULT_MAP_ID) : mapId;
  const layoutRevision = useMapDotLayoutRevision(mapId);
  const soloBotCount = offlineBotCount ?? 2;
  const hintSessionKey =
    roomCode ?? `offline:${mapId}:${soloBotCount}`;
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
    return createMockSession(map, soloBotCount);
  }, [mapId, roomCode, soloBotCount]);
  const explosionJitterSpreadRef = useRef(0);
  explosionJitterSpreadRef.current = mapProjectileRadius(session.map) * 3.4;

  const { setShareBar, setSettingsPanel, setRoomChromeActions } = useGameShell();

  const [localPlayerId, setLocalPlayerId] = useState<string>(MOCK_USER.id);
  const [syncReady, setSyncReady] = useState(!roomCode);
  const [isHost, setIsHost] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomSlotIds, setRoomSlotIds] = useState<string[]>([]);
  const [roomDisplayNames, setRoomDisplayNames] = useState<
    Record<string, string>
  >({});
  const chatLineKeyRef = useRef(0);
  const [chatLines, setChatLines] = useState<
    { key: string; slotId: string; name: string; text: string; sentAt: number }[]
  >([]);
  type MatchCountdownPhase = 3 | 2 | 1 | "go";
  const [matchCountdown, setMatchCountdown] =
    useState<MatchCountdownPhase | null>(null);
  const [firstMoveHintDismissed, setFirstMoveHintDismissed] = useState(false);
  const countdownTimersRef = useRef<number[]>([]);
  const {
    playerAppearances,
    controlledAppearance,
    patchMyAppearance,
    displayName,
    patchDisplayName,
  } = useSyncedPlayerAppearances(localPlayerId);
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
    setFirstMoveHintDismissed(false);
  }, [hintSessionKey]);

  const onMapIdChangeRef = useRef(onMapIdChange);
  onMapIdChangeRef.current = onMapIdChange;

  useEffect(() => {
    setChatLines([]);
    chatLineKeyRef.current = 0;
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    void fetchRoom(roomCode).then((room) => {
      if (cancelled || !room) return;
      setRoomMapId(room.mapId);
      onMapIdChangeRef.current(room.mapId);
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
            displayName: profile.displayName ?? "",
          };
        })
      ).then((rows) => {
        if (cancelled) return;
        const valid: SyncAppearance[] = [];
        const names: Record<string, string> = {};
        for (const r of rows) {
          if (!r) continue;
          valid.push({
            slotId: r.slotId,
            fighter: r.fighter,
            building: r.building,
          });
          names[r.slotId] = r.displayName;
        }
        if (valid.length > 0) {
          setRoomAppearances((prev) => ({
            ...prev,
            ...appearancesFromSync(valid),
          }));
        }
        if (Object.keys(names).length > 0) {
          setRoomDisplayNames((prev) => ({ ...prev, ...names }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    const poll = async () => {
      const room = await fetchRoom(roomCode);
      if (cancelled || !room) return;
      const slotIds = room.players
        .map((p) => p.slotId)
        .filter((id): id is string => Boolean(id));
      if (slotIds.length > roomSlotIds.length && room.game?.cells) {
        const next = room.game.cells.map((c) => ({ ...c }));
        cellsRef.current = next;
        setCells(cloneCells(next));
        setRoomSlotIds(slotIds);
      }
    };
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomCode, roomSlotIds.length]);

  const [landHitFx, setLandHitFx] = useState<readonly LandHitFx[]>([]);
  const landHitFxRef = useRef<readonly LandHitFx[]>([]);
  landHitFxRef.current = landHitFx;
  /** Список id эффектов; без смены не дергаем setLandHitFx (анимация фазы — в LandHitFxLayer). */
  const landHitFxMetaRef = useRef<string>("");
  const playerAppearancesRef = useRef<PlayerAppearancesMap>({});
  /** Пересчёт полосы, когда меняются полёты без обновления cells (столкновения пуль). */
  const [scoreEpoch, setScoreEpoch] = useState(0);
  const scoreBarDirtyRef = useRef(false);
  const markScoreBarStale = () => {
    scoreBarDirtyRef.current = true;
  };
  const flushScoreBarIfDirty = () => {
    if (!scoreBarDirtyRef.current) return;
    scoreBarDirtyRef.current = false;
    setScoreEpoch((e) => e + 1);
  };
  /** Вне rAF (таймауты и т.д.) — сразу обновить очки в UI. */
  const bumpScoreDisplay = () => {
    markScoreBarStale();
    flushScoreBarIfDirty();
  };

  const flightsRef = useRef<FlightPayload[]>([]);
  const timeoutIdsRef = useRef<number[]>([]);
  const projectilesCanvasRef = useRef<MapProjectilesCanvasHandle | null>(null);
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
    projectilesCanvasRef.current?.clear();
    landHitFxRef.current = [];
    landHitFxMetaRef.current = "";
    setLandHitFx([]);
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
      startCountdown = false,
      clearFirstMoveHint = false
    ) => {
      resetLocalCombat();
      setRoomMapId(snapMapId);
      onMapIdChangeRef.current(snapMapId);
      applyCellsFromServer(snapCells);
      applyRemoteAppearances(appearances);
      setSyncReady(true);
      if (clearFirstMoveHint) setFirstMoveHintDismissed(false);
      if (startCountdown) startMatchCountdown();
    },
    [
      applyCellsFromServer,
      applyRemoteAppearances,
      resetLocalCombat,
      startMatchCountdown,
    ]
  );

  const liveMap = useMemo(
    () => ({ ...session.map, cells }),
    [session.map, cells]
  );
  const liveMapRef = useRef(liveMap);
  liveMapRef.current = liveMap;

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
      const newBooms: LandHitFx[] = [];
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
          if (projectileCollisionShowsExplosion(a.sim.id, b.sim.id)) {
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

      flushScoreBarIfDirty();

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
      projectilesCanvasRef.current?.setFrame(
        pts,
        mapProjectileRadius(liveMapRef.current)
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
        { id: fxId, x: boomPos.x, y: boomPos.y, start: now, color: LAND_HIT_FX_COLOR },
      ];
      landHitFxRef.current = next;
      landHitFxMetaRef.current = next.map((e) => e.id).join("|");
      return next;
    });
    ensureDrawLoop();
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
    const attackerId = sim.hitAffiliationId;
    const landPos = projectileLandPosition(sim);
    if (!roomCodeRef.current) {
      const next = cloneCells(cellsRef.current);
      next[toI] = applyIncrementalLandHit(next[toI]!, attackerId);
      cellsRef.current = next;
      pushCellsToReact();
    }
    // Эффект только при атаке чужой/нейтральной клетки в момент попадания (не подкрепление).
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

  const scoreSlotIds = useMemo(
    () =>
      roomCode && roomSlotIds.length > 0
        ? roomSlotIds
        : session.players.map((s) => s.user.id),
    [roomCode, roomSlotIds, session.players]
  );

  const liveScores = useMemo(
    () => playerScoresForRoom(cells, flightsRef.current, scoreSlotIds),
    [cells, scoreEpoch, scoreSlotIds]
  );

  const offlineBotAppearancesActive = useMemo((): PlayerAppearancesMap => {
    if (roomCode) return {};
    const botColors = assignOfflineBotDisplayColors(
      controlledAppearance.displayColor,
      soloBotCount
    );
    const out: PlayerAppearancesMap = {};
    offlineBotIdsForCount(soloBotCount).forEach((id, i) => {
      const base = OFFLINE_BOT_APPEARANCES[id];
      if (!base) return;
      out[id] = { ...base, displayColor: botColors[i]! };
    });
    return out;
  }, [roomCode, soloBotCount, controlledAppearance.displayColor]);

  const playerAppearancesMerged = useMemo((): PlayerAppearancesMap => {
    return {
      ...playerAppearances,
      ...roomAppearances,
      ...offlineBotAppearancesActive,
      [localPlayerId]: controlledAppearance,
    };
  }, [
    playerAppearances,
    roomAppearances,
    offlineBotAppearancesActive,
    localPlayerId,
    controlledAppearance,
  ]);
  playerAppearancesRef.current = playerAppearancesMerged;

  const shareBarPlayers = useMemo(() => {
    const slots =
      roomCode && roomSlotIds.length > 0
        ? session.players.filter((s) => roomSlotIds.includes(s.user.id))
        : session.players;
    const nameBySlot = { ...roomDisplayNames, [localPlayerId]: displayName };
    return slots.map((slot) => {
      const bar = shareBarColorForView(
        slot.user.id,
        localPlayerId,
        controlledAppearance.displayColor,
        playerAppearancesMerged
      );
      return {
        id: slot.user.id,
        displayName: effectiveDisplayName(
          slot.user.id,
          nameBySlot[slot.user.id]
        ),
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
    playerAppearancesMerged,
    roomDisplayNames,
    displayName,
  ]);

  useLayoutEffect(() => {
    setShareBar({
      players: shareBarPlayers,
      activePlayerId: localPlayerId,
    });
    return () => setShareBar(null);
  }, [shareBarPlayers, localPlayerId, setShareBar]);

  const gameOutcome = useMemo((): RoomGameOutcome | null => {
    if (scoreSlotIds.length < 2) return null;
    if (!roomCode) {
      const early = offlineImmediateOutcomeForLocal(
        scoreSlotIds,
        liveScores,
        localPlayerId
      );
      if (early != null) return early;
    }
    return roomGameOutcomeForLocal(scoreSlotIds, liveScores, localPlayerId);
  }, [roomCode, scoreSlotIds, liveScores, localPlayerId, scoreEpoch]);

  /** Сколько игроков ещё с очками (оффлайн: чтобы боты доигрывали после поражения человека). */
  const offlineAliveCount = useMemo(
    () =>
      scoreSlotIds.filter((id) => (liveScores.get(id) ?? 0) > 0).length,
    [scoreSlotIds, liveScores, scoreEpoch]
  );

  const offlineBotsShouldRunRef = useRef(false);
  offlineBotsShouldRunRef.current =
    !roomCode &&
    offlineAliveCount >= 2 &&
    gameOutcome !== "won" &&
    gameOutcome !== "draw";

  const showFirstMoveHint = useMemo(
    () =>
      !firstMoveHintDismissed &&
      syncReady &&
      gameOutcome == null,
    [firstMoveHintDismissed, syncReady, gameOutcome]
  );

  const firstMovePulseFromIndex = useMemo(() => {
    if (!showFirstMoveHint || !isTerritoryMap(liveMap)) return null;
    const ep = firstMoveHintEndpoints(
      liveMap,
      localPlayerId,
      roomCode ? { syncMapLayout: true as const } : undefined
    );
    return ep?.fromIndex ?? null;
  }, [showFirstMoveHint, liveMap, localPlayerId, roomCode]);

  const runAttackLocally = useCallback(
    (
      froms: readonly CellPos[],
      to: CellPos,
      attackerId: string,
      baseTime?: number,
      maxUnitsPerSource?: number
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
        const raw = Math.max(0, u - reserved);
        const amount =
          maxUnitsPerSource != null
            ? Math.min(raw, maxUnitsPerSource)
            : raw;
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
    [session.map]
  );

  const runAttackLocallyRef = useRef(runAttackLocally);
  runAttackLocallyRef.current = runAttackLocally;
  const setFirstMoveHintDismissedRef = useRef(setFirstMoveHintDismissed);
  setFirstMoveHintDismissedRef.current = setFirstMoveHintDismissed;
  const offlineBotDifficultyRef = useRef(50);
  offlineBotDifficultyRef.current = offlineBotDifficulty ?? 50;
  const offlineBotCountRef = useRef(2);
  offlineBotCountRef.current = soloBotCount;

  useEffect(() => {
    if (roomCode || !syncReady) return;
    let cancelled = false;
    const timeoutByBot = new Map<string, number>();

    const armBot = (botId: string) => {
      const step = () => {
        if (cancelled) return;
        if (!offlineBotsShouldRunRef.current) return;
        const delay = offlineBotThinkDelayMs(
          Math.random,
          offlineBotDifficultyRef.current
        );
        const tid = window.setTimeout(() => {
          if (cancelled) return;
          if (!offlineBotsShouldRunRef.current) return;
          const mapBase = session.map;
          const move = pickOfflineBotAttack(
            mapBase,
            cellsRef.current,
            botId,
            flightsRef.current as OfflineBotFlightsInput,
            { difficulty: offlineBotDifficultyRef.current }
          );
          if (move) {
            setFirstMoveHintDismissedRef.current(true);
            runAttackLocallyRef.current(
              move.froms,
              move.to,
              move.botId,
              undefined,
              move.maxUnits
            );
          }
          step();
        }, delay);
        timeoutByBot.set(botId, tid);
      };
      step();
    };

    for (const botId of offlineBotIdsForCount(offlineBotCountRef.current)) {
      armBot(botId);
    }

    return () => {
      cancelled = true;
      for (const tid of timeoutByBot.values()) {
        window.clearTimeout(tid);
      }
    };
  }, [roomCode, syncReady, session.map]);

  const handleProjectileCollision = useCallback(
    (
      destroyed: readonly { attackId: string; simIndex: number }[],
      explosions?: readonly { x: number; y: number }[]
    ) => {
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

  const onChatHistory = useCallback(
    (
      messages: {
        slotId: string;
        name: string;
        text: string;
        sentAt: number;
      }[]
    ) => {
      chatLineKeyRef.current = messages.length;
      setChatLines(
        messages.map((m, i) => ({
          key: `hist-${m.sentAt}-${m.slotId}-${i}`,
          slotId: m.slotId,
          name: m.name,
          text: m.text,
          sentAt: m.sentAt,
        }))
      );
    },
    []
  );

  const onChatMessage = useCallback(
    (msg: {
      slotId: string;
      name: string;
      text: string;
      sentAt: number;
    }) => {
      setChatLines((prev) =>
        [
          ...prev,
          {
            key: `${msg.sentAt}-${msg.slotId}-${chatLineKeyRef.current++}`,
            slotId: msg.slotId,
            name: msg.name,
            text: msg.text,
            sentAt: msg.sentAt,
          },
        ].slice(-10)
      );
    },
    []
  );

  const { connected: wsConnected, sendAttack, sendCancelPending, sendAppearance, sendChat, reconnect } =
    useRoomGameSync({
      roomCode,
      onSnapshot: (snapMapId, snapCells, appearances) => {
        applyGameReset(snapMapId, snapCells, appearances, false, false);
      },
      onCells: (snapCells) => {
        applyCellsFromServer(snapCells);
      },
      onAttackLaunch: runRemoteAttack,
      onGameReset: (mapId, snapCells, appearances, countdown) => {
        applyGameReset(mapId, snapCells, appearances, countdown, true);
      },
      onAppearances: applyRemoteAppearances,
      onAppearance: (slotId, fighter, building, displayColor) => {
        applyRemoteAppearances([{ slotId, fighter, building, displayColor }]);
      },
      onProjectileCollision: handleProjectileCollision,
      onChatMessage,
      onChatHistory,
    });

  useEffect(() => {
    if (!roomCode || !wsConnected) return;
    sendAppearance(
      controlledAppearance.fighter,
      controlledAppearance.building,
      controlledAppearance.displayColor
    );
  }, [
    roomCode,
    wsConnected,
    sendAppearance,
    controlledAppearance.fighter,
    controlledAppearance.building,
    controlledAppearance.displayColor,
  ]);

  const patchMyAppearanceRoom = useCallback(
    (patch: MyAppearancePatch) => {
      const next = { ...controlledAppearance, ...patch };
      patchMyAppearance(patch);
      if (roomCode && wsConnected) {
        sendAppearance(next.fighter, next.building, next.displayColor);
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

  const handleNewGame = useCallback(async () => {
    if (!roomCode || !isHost) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      await restartRoom(roomCode, getOrCreateUserId(), mapIdProp);
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : "Не удалось начать новую игру"
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, isHost, mapIdProp]);

  useLayoutEffect(() => {
    if (!roomCode) {
      setRoomChromeActions(null);
      return;
    }
    if (!isHost) {
      setRoomChromeActions(null);
      return () => setRoomChromeActions(null);
    }
    setRoomChromeActions({
      primaryLabel: "Новая игра",
      primaryDisabled: roomBusy,
      onPrimary: () => {
        void handleNewGame();
      },
    });
    return () => setRoomChromeActions(null);
  }, [
    roomCode,
    isHost,
    roomBusy,
    handleNewGame,
    setRoomChromeActions,
  ]);

  const settingsPanelContent = useMemo(
    () => (
      <GameSettingsPanel
        mapId={settingsMapId}
        onMapIdChange={onMapIdChange}
        mapSelectHint={mapSelectHint}
        mapCatalogDisabled={Boolean(roomCode && !isHost)}
        randomMapOnStart={randomMapOnStart}
        onRandomMapOnStartChange={onRandomMapOnStartChange}
        displayName={displayName}
        onDisplayNameChange={patchDisplayName}
        fighter={controlledAppearance.fighter}
        building={controlledAppearance.building}
        displayColor={controlledAppearance.displayColor}
        onFighterChange={(fighter) => patchMyAppearanceRoom({ fighter })}
        onBuildingChange={(building) => patchMyAppearanceRoom({ building })}
        onDisplayColorChange={(displayColor) =>
          patchMyAppearance({ displayColor })
        }
      />
    ),
    [
      settingsMapId,
      onMapIdChange,
      mapSelectHint,
      roomCode,
      isHost,
      displayName,
      patchDisplayName,
      controlledAppearance.fighter,
      controlledAppearance.building,
      controlledAppearance.displayColor,
      patchMyAppearanceRoom,
      patchMyAppearance,
      randomMapOnStart,
      onRandomMapOnStartChange,
    ]
  );

  useLayoutEffect(() => {
    setSettingsPanel(settingsPanelContent);
    return () => setSettingsPanel(null);
  }, [settingsPanelContent, setSettingsPanel]);

  const handleCancelPendingFrom = useCallback(
    (cell: CellPos) => {
      if (gameOutcome || (roomCode && matchCountdown !== null)) return;
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
    if (gameOutcome || (roomCode && matchCountdown !== null)) return;
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
        setFirstMoveHintDismissed(true);
        ensureDrawLoop();
        return;
      }
      setRoomActionError("Нет связи с сервером — переподключение…");
      reconnect();
      return;
    }
    setFirstMoveHintDismissed(true);
    queueMicrotask(() => {
      runAttackLocally(froms, to, localPlayerId);
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.wrap} aria-label="Игровое поле">
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
            projectileCanvasRef={projectilesCanvasRef}
            playerAppearancesRef={playerAppearancesRef}
            landHitFx={landHitFx}
            syncMapLayout={Boolean(roomCode)}
            showFirstMoveHint={showFirstMoveHint}
            firstMovePulseFromIndex={firstMovePulseFromIndex}
            mapInteractionLocked={Boolean(
              !syncReady ||
                (roomCode && matchCountdown !== null) ||
                gameOutcome !== null
            )}
            onCommitAttacks={handleCommitAttacks}
            onCancelPendingFrom={handleCancelPendingFrom}
          />
        </div>
        {matchCountdown !== null && roomCode ? (
          <div className={styles.countdownInputBlocker} aria-hidden />
        ) : null}
        {roomCode && roomActionError ? (
          <div
            className={`${styles.mapToast} ${styles.mapToastError}`}
            role="alert"
          >
            <p className={styles.mapToastErrorText}>{roomActionError}</p>
            <button
              type="button"
              className={styles.mapToastErrorDismiss}
              onClick={() => setRoomActionError(null)}
            >
              Закрыть
            </button>
          </div>
        ) : null}
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
        {gameOutcome && matchCountdown === null ? (
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
            {roomCode ? (
              isHost ? (
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
              )
            ) : onOfflineNewGame ? (
              <button
                type="button"
                className={styles.mapToastBtn}
                onClick={() => onOfflineNewGame()}
              >
                Новая игра
              </button>
            ) : null}
          </div>
        ) : null}
        {roomCode ? (
          <RoomChat
            lines={chatLines}
            connected={wsConnected}
            localPlayerId={localPlayerId}
            appearances={playerAppearancesMerged}
            localDisplayColor={controlledAppearance.displayColor}
            onSend={sendChat}
          />
        ) : null}
      </div>
    </div>
  );
}
