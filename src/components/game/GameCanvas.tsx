import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cloneCells } from "@/game/cells/cloneCells";
import { patchCellsForReact } from "@/game/cells/patchCellsForReact";
import { useOfflineCellGrowth } from "@/hooks/useOfflineCellGrowth";
import { useMergedPlayerAppearances } from "@/hooks/useMergedPlayerAppearances";
import { useGameScoring } from "@/hooks/useGameScoring";
import { useOfflineBotLoop } from "@/hooks/useOfflineBotLoop";
import { usePageVisible } from "@/hooks/usePageVisible";
import { useProjectileCombat } from "@/hooks/useProjectileCombat";
import { UI } from "@/constants/uiStrings";
import {
  cellIndex,
  DEFAULT_MAP_ID,
  type CellPos,
  type MapCell,
} from "@/game/maps";
import {
  mapAspectRatio,
  mapAspectRatioValue,
  mapProjectileRadius,
  mapProjectileRadiusFromDotRadius,
} from "@/game/maps";
import { pendingLaunchFromIndicesForPlayer } from "@/game/projectiles/flightQueue";
import { type LandHitFx } from "@/game/hitEffects";
import type {
  BuildingSkinId,
  DisplayColorId,
  FighterSkinId,
  PlayerAppearancesMap,
} from "@/game/appearance";
import { useRoomSession } from "@/hooks/useRoomSession";
import {
  buildOfflineSession,
  buildRoomPlaceholderSession,
  offlineSessionSeed,
  playableCellIndices,
  MOCK_USER,
} from "@/game/mock";
import { appearanceForPlayer } from "@/game/appearance";
import { useUserId } from "@/hooks/useUserId";
import { useSyncedPlayerAppearances } from "@/hooks/useSyncedPlayerAppearances";
import { useShareBarSync } from "@/hooks/useShareBarSync";
import { useMapDotLayoutRevision } from "@/hooks/useMapDotLayoutRevision";
import { useGameShell } from "@/context/GameShellContext";
import { MatchOutcomeModal } from "./MatchOutcomeModal";
import { SoloPlayDock } from "./SoloPlayDock";
import { MapView } from "./MapView";
import { isPlayerAliveInMatch } from "@/game/scoring/matchElimination";
import { canEditAppearanceInRoom } from "@/shared/roomRoster";
import { serverNowMs } from "@/game/serverClock";
import type { MapProjectilesCanvasHandle } from "@/components/map";
import { RoomChat } from "@/components/room/RoomChat";
import styles from "./GameCanvas.module.scss";
type SoloCommitted = {
  mapId: string;
  botCount: number;
  botDifficulty: number;
  fighter: FighterSkinId;
  building: BuildingSkinId;
  displayColor: DisplayColorId;
  displayName: string;
};

type SoloSetup = SoloCommitted & { randomMapOnStart: boolean };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

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
  onOfflineBotCountChange?: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  onOfflineBotDifficultyChange?: (value: number) => void;
  /** Оффлайн: сброс сессии (новый seed / карта) только после исхода партии или из шапки. */
  onOfflineNewGame?: () => void;
  /** >0 после «Новая игра» в оффлайне — запускает 3-2-1. */
  soloRestartNonce?: number;
};

export function GameCanvas({
  mapId: mapIdProp,
  roomCode = null,
  onMapIdChange,
  mapSelectHint,
  randomMapOnStart,
  onRandomMapOnStartChange,
  offlineBotDifficulty,
  offlineBotCount,
  onOfflineBotCountChange,
  onOfflineBotCountCommit,
  onOfflineBotDifficultyChange,
  onOfflineNewGame,
  soloRestartNonce = 0,
}: GameCanvasProps) {
  const userId = useUserId();
  const pageVisible = usePageVisible();

  const {
    setShareBar,
    setSoloDockBlocksMapOverlays,
    registerSoloBattleDockExpander,
  } = useGameShell();

  const [localPlayerId, setLocalPlayerId] = useState<string>(MOCK_USER.id);
  const [firstMoveHintDismissed, setFirstMoveHintDismissed] = useState(false);
  const [soloAwaitingStart, setSoloAwaitingStart] = useState(() => !roomCode);
  const [soloDockExpanded, setSoloDockExpanded] = useState(() => Boolean(roomCode));

  const {
    playerAppearances,
    controlledAppearance,
    patchMyAppearance,
    displayName,
    patchDisplayName,
  } = useSyncedPlayerAppearances(localPlayerId);

  const [committedSolo, setCommittedSolo] = useState<SoloCommitted>(() => ({
    mapId: mapIdProp ?? DEFAULT_MAP_ID,
    botCount: offlineBotCount ?? 2,
    botDifficulty: offlineBotDifficulty ?? 50,
    fighter: controlledAppearance.fighter,
    building: controlledAppearance.building,
    displayColor: controlledAppearance.displayColor,
    displayName,
  }));

  const [soloDraft, setSoloDraft] = useState<SoloSetup>(() => ({
    mapId: mapIdProp ?? DEFAULT_MAP_ID,
    randomMapOnStart: Boolean(randomMapOnStart),
    botCount: offlineBotCount ?? 2,
    botDifficulty: offlineBotDifficulty ?? 50,
    fighter: controlledAppearance.fighter,
    building: controlledAppearance.building,
    displayColor: controlledAppearance.displayColor,
    displayName,
  }));

  const [soloPreGamePhase, setSoloPreGamePhase] = useState<
    "idle" | "goodluck" | "count"
  >("idle");
  const [soloPreGameN, setSoloPreGameN] = useState<3 | 2 | 1 | null>(null);
  const [soloPreGameBusy, setSoloPreGameBusy] = useState(false);
  const [outcomeModalDismissed, setOutcomeModalDismissed] = useState(false);

  const soloBuilding = roomCode
    ? controlledAppearance.building
    : committedSolo.building;
  const soloBotCount = roomCode
    ? (offlineBotCount ?? 2)
    : committedSolo.botCount;
  const soloBotDifficulty = roomCode
    ? (offlineBotDifficulty ?? 50)
    : committedSolo.botDifficulty;

  const offlineBootstrapDisplayColor = roomCode
    ? controlledAppearance.displayColor
    : committedSolo.displayColor;

  const activePlayerRef = useRef(localPlayerId);
  activePlayerRef.current = localPlayerId;

  const bootstrapMapId = roomCode
    ? (mapIdProp ?? DEFAULT_MAP_ID)
    : committedSolo.mapId;
  const offlineSessionSeedBootstrap = useMemo(
    () =>
      roomCode
        ? ""
        : offlineSessionSeed({
            mapId: bootstrapMapId,
            botCount: soloBotCount,
            botDifficulty: soloBotDifficulty,
            soloRestartNonce,
            building: soloBuilding,
          }),
    [
      roomCode,
      bootstrapMapId,
      soloBotCount,
      soloBotDifficulty,
      soloRestartNonce,
      soloBuilding,
    ]
  );
  const bootstrapSession = useMemo(() => {
    if (roomCode) return buildRoomPlaceholderSession(bootstrapMapId);
    return buildOfflineSession(
      bootstrapMapId,
      soloBotCount,
      soloBotDifficulty,
      soloBuilding,
      offlineSessionSeedBootstrap,
      offlineBootstrapDisplayColor
    );
  }, [
    bootstrapMapId,
    roomCode,
    soloBotCount,
    soloBotDifficulty,
    soloBuilding,
    offlineSessionSeedBootstrap,
    offlineBootstrapDisplayColor,
  ]);

  const cellsRef = useRef<MapCell[]>(cloneCells(bootstrapSession.map.cells));
  const [cells, setCells] = useState<MapCell[]>(() =>
    cloneCells(bootstrapSession.map.cells)
  );

  const onMapIdChangeRef = useRef(onMapIdChange);
  onMapIdChangeRef.current = onMapIdChange;

  const [landHitFx, setLandHitFx] = useState<readonly LandHitFx[]>([]);
  const landHitFxRef = useRef<readonly LandHitFx[]>([]);
  landHitFxRef.current = landHitFx;
  /** Список id эффектов; без смены не дергаем setLandHitFx (анимация фазы — в LandHitFxLayer). */
  const landHitFxMetaRef = useRef<string>("");
  const playerAppearancesRef = useRef<PlayerAppearancesMap>({});
  /** Пересчёт полосы, когда меняются полёты без обновления cells (столкновения пуль). */
  const [scoreEpoch, setScoreEpoch] = useState(0);
  /** 1 → на полосе очков 0 отображается как −1 (выбыл). */
  const eliminationPenaltyRef = useRef(new Map<string, number>());
  const scoreSlotIdsRef = useRef<string[]>([]);
  const scoreBarDirtyRef = useRef(false);
  const markScoreBarStale = useCallback(() => {
    scoreBarDirtyRef.current = true;
  }, []);
  const flushScoreBarIfDirty = useCallback(() => {
    if (!scoreBarDirtyRef.current) return;
    scoreBarDirtyRef.current = false;
    setScoreEpoch((e) => e + 1);
  }, []);
  /** Вне rAF (таймауты и т.д.) — сразу обновить очки в UI. */
  const bumpScoreDisplay = useCallback(() => {
    markScoreBarStale();
    flushScoreBarIfDirty();
  }, [markScoreBarStale, flushScoreBarIfDirty]);

  const projectilesCanvasRef = useRef<MapProjectilesCanvasHandle | null>(null);

  const pushCellsToReact = useCallback(() => {
    setCells((prev) => patchCellsForReact(prev, cellsRef.current));
  }, []);

  const eliminationHooksRef = useRef<{
    capture: () => void;
    commit: () => void;
  } | null>(null);
  const applyCellsFromServer = useCallback((next: MapCell[]) => {
    eliminationHooksRef.current?.capture();
    cellsRef.current = cloneCells(next);
    setCells(cloneCells(next));
    eliminationHooksRef.current?.commit();
  }, []);

  const liveMapRef = useRef({
    ...bootstrapSession.map,
    cells: cellsRef.current,
  });
  const explosionJitterSpreadRef = useRef(0);
  const mapFlightMetricsRef = useRef({ meetScale: 0, dotRadius: 0 });
  explosionJitterSpreadRef.current =
    mapProjectileRadius(bootstrapSession.map) * 3.4;

  const onMapFlightMetricsChange = useCallback(
    (metrics: { meetScale: number; dotRadius: number }) => {
      mapFlightMetricsRef.current = metrics;
      explosionJitterSpreadRef.current =
        mapProjectileRadiusFromDotRadius(metrics.dotRadius) * 3.4;
    },
    []
  );

  const {
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
  } = useProjectileCombat({
    roomCode,
    sessionMap: bootstrapSession.map,
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
    onLocalAttack: () => setFirstMoveHintDismissed(true),
    paused: !pageVisible,
    mapFlightMetricsRef,
  });

  const appearanceEditAllowedRef = useRef(true);

  const assignLocalPlayerId = useCallback((id: string) => {
    setLocalPlayerId(id);
    activePlayerRef.current = id;
  }, []);

  const room = useRoomSession({
    roomCode,
    userId,
    mapIdProp,
    onMapIdChange,
    localPlayerId,
    setLocalPlayerId: assignLocalPlayerId,
    cellsRef,
    applyCellsFromServer,
    resetLocalCombat,
    runRemoteAttack,
    cancelPendingAtCell,
    stripPendingTail,
    handleProjectileCollision,
    controlledAppearance,
    displayName,
    patchMyAppearance,
    onFirstMoveHintReset: () => setFirstMoveHintDismissed(false),
    pageVisible,
    appearanceEditAllowedRef,
  });

  const roomSettingsDock = Boolean(roomCode);

  useEffect(() => {
    if (roomCode) {
      setSoloDockBlocksMapOverlays(false);
      return;
    }
    setSoloDockBlocksMapOverlays(soloDockExpanded);
  }, [roomCode, soloDockExpanded, setSoloDockBlocksMapOverlays]);

  useEffect(() => {
    if (!roomCode) {
      registerSoloBattleDockExpander(() => {
        setSoloDockExpanded(true);
      });
      return () => registerSoloBattleDockExpander(null);
    }
    if (room.isHost) {
      registerSoloBattleDockExpander(() => {
        setSoloDockExpanded(true);
      });
      return () => registerSoloBattleDockExpander(null);
    }
    registerSoloBattleDockExpander(null);
    return undefined;
  }, [roomCode, room.isHost, registerSoloBattleDockExpander]);

  useEffect(() => {
    if (roomCode) setSoloDockExpanded(true);
  }, [roomCode]);

  useEffect(() => {
    if (room.inRoomSetup) setSoloDockExpanded(true);
  }, [room.inRoomSetup]);

  const tabWasHiddenRef = useRef(false);
  useEffect(() => {
    if (!pageVisible) {
      tabWasHiddenRef.current = true;
      return;
    }
    if (!roomCode || !tabWasHiddenRef.current) return;
    tabWasHiddenRef.current = false;
    room.reconnect();
  }, [pageVisible, roomCode, room.reconnect]);

  const mapId = roomCode
    ? (room.roomMapId ?? mapIdProp ?? DEFAULT_MAP_ID)
    : committedSolo.mapId;
  const sessionSeedKey = useMemo(
    () =>
      roomCode
        ? ""
        : offlineSessionSeed({
            mapId,
            botCount: soloBotCount,
            botDifficulty: soloBotDifficulty,
            soloRestartNonce,
            building: soloBuilding,
          }),
    [
      roomCode,
      mapId,
      soloBotCount,
      soloBotDifficulty,
      soloRestartNonce,
      soloBuilding,
    ]
  );
  const settingsMapId = roomCode ? (mapIdProp ?? DEFAULT_MAP_ID) : mapId;
  const layoutRevision = useMapDotLayoutRevision(mapId);
  const hintSessionKey = roomCode ?? sessionSeedKey;
  const session = useMemo(() => {
    if (roomCode) return buildRoomPlaceholderSession(mapId);
    return buildOfflineSession(
      mapId,
      soloBotCount,
      soloBotDifficulty,
      soloBuilding,
      sessionSeedKey,
      offlineBootstrapDisplayColor
    );
  }, [
    mapId,
    roomCode,
    soloBotCount,
    soloBotDifficulty,
    soloBuilding,
    sessionSeedKey,
    offlineBootstrapDisplayColor,
  ]);

  const meetScale = mapFlightMetricsRef.current.meetScale;
  explosionJitterSpreadRef.current =
    (mapFlightMetricsRef.current.dotRadius > 0
      ? mapProjectileRadiusFromDotRadius(mapFlightMetricsRef.current.dotRadius)
      : mapProjectileRadius(
          session.map,
          meetScale > 0 ? meetScale : undefined
        )) * 3.4;

  useEffect(() => {
    setFirstMoveHintDismissed(false);
  }, [hintSessionKey]);

  const offlineSeedResetPrev = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (roomCode) return;
    if (offlineSeedResetPrev.current === null) {
      offlineSeedResetPrev.current = offlineSessionSeedBootstrap;
      return;
    }
    if (offlineSeedResetPrev.current === offlineSessionSeedBootstrap) return;
    offlineSeedResetPrev.current = offlineSessionSeedBootstrap;
    resetLocalCombat();
    const nextCells = cloneCells(bootstrapSession.map.cells);
    cellsRef.current = nextCells;
    setCells(nextCells);
    liveMapRef.current = { ...bootstrapSession.map, cells: nextCells };
    explosionJitterSpreadRef.current =
      mapProjectileRadius(bootstrapSession.map) * 3.4;
  }, [roomCode, offlineSessionSeedBootstrap, bootstrapSession, resetLocalCombat]);

  const liveMap = useMemo(
    () => ({ ...session.map, cells }),
    [session.map, cells]
  );
  liveMapRef.current = liveMap;

  const playableIndices = useMemo(
    () => playableCellIndices(session.map),
    [session.map, layoutRevision]
  );
  const playableIndicesRef = useRef(playableIndices);
  playableIndicesRef.current = playableIndices;

  const skeletonSpawnOpts = useMemo(
    () =>
      roomCode
        ? undefined
        : {
            ownerId: localPlayerId,
            playableIndices: () => playableIndicesRef.current,
            buildingForOwner: (ownerId: string) =>
              appearanceForPlayer(playerAppearancesRef.current, ownerId)
                .building,
          },
    [roomCode, localPlayerId]
  );

  const clearCombatOnUnmountRef = useRef({
    clearScheduledTimeouts,
    clearMatchCountdown: room.clearMatchCountdown,
    stopDrawLoop,
  });
  clearCombatOnUnmountRef.current = {
    clearScheduledTimeouts,
    clearMatchCountdown: room.clearMatchCountdown,
    stopDrawLoop,
  };
  useEffect(
    () => () => {
      const teardown = clearCombatOnUnmountRef.current;
      teardown.clearScheduledTimeouts();
      teardown.clearMatchCountdown();
      teardown.stopDrawLoop();
    },
    []
  );

  const scoreSlotIds = useMemo(
    () =>
      roomCode
        ? room.roomSlotIds
        : session.players.map((s) => s.user.id),
    [roomCode, room.roomSlotIds, session.players]
  );
  const matchScoringActive =
    !roomCode ||
    (room.roomStatus === "playing" &&
      room.roomMatchParticipantCount >= 2 &&
      room.roomSlotIds.length >= 2 &&
      room.myInMatch);
  scoreSlotIdsRef.current = scoreSlotIds;

  useEffect(() => {
    eliminationHooksRef.current = {
      capture: captureEliminationBaseline,
      commit: () => {
        commitEliminationStrikes();
        bumpScoreDisplay();
      },
    };
  }, [
    captureEliminationBaseline,
    commitEliminationStrikes,
    bumpScoreDisplay,
  ]);

  const { liveScores, gameOutcome, offlineAliveCount } = useGameScoring({
    cells,
    flightsRef,
    eliminationPenaltyRef,
    scoreSlotIds,
    localPlayerId,
    roomCode,
    scoreEpoch,
    matchActive: matchScoringActive,
  });

  useEffect(() => {
    if (roomCode && room.roomStatus !== "playing") {
      eliminationPenaltyRef.current.clear();
      bumpScoreDisplay();
    }
  }, [roomCode, room.roomStatus, bumpScoreDisplay]);

  useEffect(() => {
    if (gameOutcome == null) setOutcomeModalDismissed(false);
  }, [gameOutcome]);

  const showOutcomeModal =
    matchScoringActive &&
    gameOutcome != null &&
    room.matchCountdown === null &&
    !outcomeModalDismissed;

  useEffect(() => {
    if (roomCode && room.roomStatus === "playing") {
      setOutcomeModalDismissed(false);
    }
  }, [roomCode, room.roomStatus]);

  useEffect(() => {
    if (!showOutcomeModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOutcomeModalDismissed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showOutcomeModal]);

  const playerAppearancesMerged = useMergedPlayerAppearances({
    base: playerAppearances,
    room: room.roomAppearances,
    localPlayerId,
    localAppearance: controlledAppearance,
    offlineBotCount: soloBotCount,
    offlineSessionSeed: sessionSeedKey,
    isRoom: Boolean(roomCode),
  });
  useLayoutEffect(() => {
    playerAppearancesRef.current = playerAppearancesMerged;
  }, [playerAppearancesMerged]);

  useOfflineCellGrowth(
    !roomCode && pageVisible,
    cellsRef,
    flightsRef,
    playerAppearancesRef,
    pushCellsToReact,
    skeletonSpawnOpts,
    () => playableIndicesRef.current
  );

  const localDisplayColorResolved = useMemo(
    () =>
      playerAppearancesMerged[localPlayerId]?.displayColor ??
      controlledAppearance.displayColor,
    [
      playerAppearancesMerged,
      localPlayerId,
      controlledAppearance.displayColor,
    ]
  );

  const shareBarSlots = useMemo(() => {
    return roomCode && room.roomSlotIds.length > 0
      ? session.players.filter((s) => room.roomSlotIds.includes(s.user.id))
      : session.players;
  }, [session.players, roomCode, room.roomSlotIds]);

  const shareBarNameBySlot = useMemo(() => {
    const localShareName =
      !roomCode && soloAwaitingStart ? soloDraft.displayName : displayName;
    return {
      ...room.roomDisplayNames,
      [localPlayerId]: localShareName,
    };
  }, [
    room.roomDisplayNames,
    localPlayerId,
    roomCode,
    soloAwaitingStart,
    soloDraft.displayName,
    displayName,
  ]);

  useShareBarSync({
    setShareBar,
    slots: shareBarSlots,
    liveScores,
    localPlayerId,
    localDisplayColor: localDisplayColorResolved,
    playerAppearances: playerAppearancesMerged,
    nameBySlot: shareBarNameBySlot,
  });

  const localMatchScore = liveScores.get(localPlayerId) ?? 0;
  const localAlive = isPlayerAliveInMatch(localMatchScore);
  const roomCanEditAppearance =
    !roomCode ||
    canEditAppearanceInRoom({
      inMatch: room.myInMatch,
      roomStatus: room.roomStatus,
      matchDisplayScore: localMatchScore,
    });
  appearanceEditAllowedRef.current = roomCanEditAppearance;
  const showReadyForNext =
    Boolean(roomCode) &&
    !room.isHost &&
    room.roomStatus === "playing" &&
    (!room.myInMatch || !localAlive);
  const roomInSetup = !room.syncReady || room.inRoomSetup;
  const roomDockVariant = !roomCode
    ? "solo"
    : roomInSetup
      ? room.isHost
        ? "roomHost"
        : "roomGuest"
      : room.isHost
        ? "roomHost"
        : !room.myInMatch
          ? "roomWaiting"
          : "roomGuest";
  const soloSpectating =
    !roomCode && !localAlive && gameOutcome == null && !soloAwaitingStart;

  useEffect(() => {
    if (roomCode && room.matchCountdown !== null) {
      setSoloDockExpanded(false);
    }
  }, [roomCode, room.matchCountdown]);

  useEffect(() => {
    if (roomCode) return;
    if (gameOutcome != null && room.matchCountdown === null) {
      setSoloAwaitingStart(true);
      setSoloDockExpanded(false);
      setOutcomeModalDismissed(false);
    }
  }, [roomCode, gameOutcome, room.matchCountdown]);

  useEffect(() => {
    if (roomCode || !soloAwaitingStart) return;
    setSoloDraft({
      mapId: mapIdProp ?? DEFAULT_MAP_ID,
      randomMapOnStart: Boolean(randomMapOnStart),
      botCount: offlineBotCount ?? 2,
      botDifficulty: offlineBotDifficulty ?? 50,
      fighter: controlledAppearance.fighter,
      building: controlledAppearance.building,
      displayColor: controlledAppearance.displayColor,
      displayName,
    });
  }, [
    roomCode,
    soloAwaitingStart,
    mapIdProp,
    randomMapOnStart,
    offlineBotCount,
    offlineBotDifficulty,
    controlledAppearance.fighter,
    controlledAppearance.building,
    controlledAppearance.displayColor,
    displayName,
  ]);

  useEffect(() => {
    if (roomCode) return;
    if (!soloDockExpanded || soloAwaitingStart || gameOutcome != null) return;
    setSoloDraft({
      mapId: committedSolo.mapId,
      randomMapOnStart: Boolean(randomMapOnStart),
      botCount: committedSolo.botCount,
      botDifficulty: committedSolo.botDifficulty,
      fighter: committedSolo.fighter,
      building: committedSolo.building,
      displayColor: committedSolo.displayColor,
      displayName: committedSolo.displayName,
    });
  }, [
    roomCode,
    soloDockExpanded,
    soloAwaitingStart,
    gameOutcome,
    committedSolo,
    randomMapOnStart,
  ]);

  useEffect(() => {
    if (roomCode || gameOutcome != null || soloAwaitingStart) return;
    if (!localAlive) setSoloDockExpanded(true);
  }, [roomCode, gameOutcome, soloAwaitingStart, localAlive]);

  const offlineBotsEnabled =
    !roomCode &&
    !soloAwaitingStart &&
    room.syncReady &&
    room.matchCountdown === null &&
    offlineAliveCount >= 2 &&
    gameOutcome !== "won";

  useOfflineBotLoop({
    enabled: offlineBotsEnabled && pageVisible,
    sessionMap: session.map,
    cellsRef,
    flightsRef,
    botCount: soloBotCount,
    difficulty: soloBotDifficulty,
    playerAppearancesRef,
    runAttack: runAttackLocally,
  });

  const showFirstMoveHint = useMemo(
    () =>
      !firstMoveHintDismissed &&
      room.syncReady &&
      gameOutcome == null,
    [firstMoveHintDismissed, room.syncReady, gameOutcome]
  );

  const handleRandomMapOnStartChange = useCallback(
    (value: boolean) =>
      room.handleRandomMapOnStartChange(value, onRandomMapOnStartChange),
    [room.handleRandomMapOnStartChange, onRandomMapOnStartChange]
  );

  const handleFighterChange = useCallback(
    (fighter: FighterSkinId) => {
      if (roomCode) {
        room.patchMyAppearanceRoom({ fighter }, roomCanEditAppearance);
      } else {
        patchMyAppearance({ fighter });
      }
    },
    [
      roomCode,
      room.patchMyAppearanceRoom,
      patchMyAppearance,
      roomCanEditAppearance,
    ]
  );

  const handleBuildingChange = useCallback(
    (building: BuildingSkinId) => {
      if (roomCode) {
        room.patchMyAppearanceRoom({ building }, roomCanEditAppearance);
      } else {
        patchMyAppearance({ building });
      }
    },
    [
      roomCode,
      room.patchMyAppearanceRoom,
      patchMyAppearance,
      roomCanEditAppearance,
    ]
  );

  const handleDisplayColorChange = useCallback(
    (displayColor: DisplayColorId) => {
      if (roomCode) {
        room.patchMyAppearanceRoom({ displayColor }, roomCanEditAppearance);
      } else {
        patchMyAppearance({ displayColor });
      }
    },
    [
      roomCode,
      room.patchMyAppearanceRoom,
      patchMyAppearance,
      roomCanEditAppearance,
    ]
  );

  const handleRoomDisplayNameChange = useCallback(
    (value: string) => {
      if (roomCode && !roomCanEditAppearance) return;
      patchDisplayName(value.slice(0, 32));
      if (roomCode && room.wsConnected) {
        room.patchMyAppearanceRoom({}, roomCanEditAppearance);
      }
    },
    [
      patchDisplayName,
      roomCode,
      room.wsConnected,
      room.patchMyAppearanceRoom,
      roomCanEditAppearance,
    ]
  );

  const handleDraftFighterChange = useCallback((fighter: FighterSkinId) => {
    setSoloDraft((d) => ({ ...d, fighter }));
  }, []);

  const handleDraftBuildingChange = useCallback((building: BuildingSkinId) => {
    setSoloDraft((d) => ({ ...d, building }));
  }, []);

  const handleDraftDisplayColorChange = useCallback(
    (displayColor: DisplayColorId) => {
      setSoloDraft((d) => ({ ...d, displayColor }));
    },
    []
  );

  const handleDraftMapIdChange = useCallback((nextMapId: string) => {
    setSoloDraft((d) => ({ ...d, mapId: nextMapId }));
  }, []);

  const handleDraftRandomMapOnStartChange = useCallback((value: boolean) => {
    setSoloDraft((d) => ({ ...d, randomMapOnStart: value }));
  }, []);

  const handleDraftBotCountChange = useCallback((value: number) => {
    setSoloDraft((d) => ({ ...d, botCount: value }));
  }, []);

  const handleDraftBotDifficultyChange = useCallback((value: number) => {
    setSoloDraft((d) => ({ ...d, botDifficulty: value }));
  }, []);

  const handleDraftDisplayNameChange = useCallback((raw: string) => {
    setSoloDraft((d) => ({ ...d, displayName: raw.slice(0, 32) }));
  }, []);

  const handleCommitSoloPlay = useCallback(async () => {
    if (roomCode || soloPreGameBusy) return;
    if (
      !onOfflineNewGame ||
      !onOfflineBotCountChange ||
      !onOfflineBotDifficultyChange
    ) {
      return;
    }

    const d = soloDraft;
    setSoloPreGameBusy(true);
    setSoloDockExpanded(false);

    try {
      for (const n of [3, 2, 1] as const) {
        setSoloPreGamePhase("count");
        setSoloPreGameN(n);
        await sleep(800);
      }
      setSoloPreGamePhase("goodluck");
      setSoloPreGameN(null);
      await sleep(1500);
      setSoloPreGamePhase("idle");
      setSoloPreGameN(null);

      onMapIdChange(d.mapId);
      onRandomMapOnStartChange?.(d.randomMapOnStart);
      onOfflineBotCountChange(d.botCount);
      onOfflineBotDifficultyChange(d.botDifficulty);
      patchMyAppearance({
        fighter: d.fighter,
        building: d.building,
        displayColor: d.displayColor,
      });
      patchDisplayName(d.displayName);
      setCommittedSolo({
        mapId: d.mapId,
        botCount: d.botCount,
        botDifficulty: d.botDifficulty,
        fighter: d.fighter,
        building: d.building,
        displayColor: d.displayColor,
        displayName: d.displayName,
      });

      onOfflineNewGame();
      setSoloAwaitingStart(false);
      setFirstMoveHintDismissed(false);
    } finally {
      setSoloPreGameBusy(false);
    }
  }, [
    roomCode,
    soloPreGameBusy,
    onOfflineNewGame,
    onOfflineBotCountChange,
    onOfflineBotDifficultyChange,
    onRandomMapOnStartChange,
    onMapIdChange,
    patchMyAppearance,
    patchDisplayName,
    soloDraft,
  ]);

  const handleCancelPendingFrom = useCallback(
    (cell: CellPos) => {
      if (gameOutcome || room.matchCountdown !== null) return;
      const fromI = cellIndex(session.map, cell);
      if (roomCode && room.wsConnected) {
        room.sendCancelPending(fromI);
      }
      queueMicrotask(() => {
        cancelPendingAtCell(fromI);
      });
    },
    [
      session.map,
      roomCode,
      room.wsConnected,
      room.sendCancelPending,
      gameOutcome,
      room.matchCountdown,
      cancelPendingAtCell,
    ]
  );

  const handleCancelAllPending = useCallback(() => {
    if (gameOutcome || room.matchCountdown !== null) return;
    if (roomCode && room.wsConnected) {
      for (const fromI of pendingLaunchFromIndicesForPlayer(
        localPlayerId,
        flightsRef.current
      )) {
        room.sendCancelPending(fromI);
      }
    }
    queueMicrotask(() => {
      cancelAllPendingLocal();
    });
  }, [
    gameOutcome,
    room.matchCountdown,
    localPlayerId,
    roomCode,
    room.wsConnected,
    room.sendCancelPending,
    cancelAllPendingLocal,
    flightsRef,
  ]);

  const handleCommitAttacks = useCallback(
    (froms: readonly CellPos[], to: CellPos) => {
      if (froms.length === 0) return;
      if (!pageVisible) return;
      if (gameOutcome || room.matchCountdown !== null) return;
      setFirstMoveHintDismissed(true);
      if (roomCode) {
        if (!room.myInMatch) return;
        if (room.wsConnected) {
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
            stripPendingTail(fromI, toI);
          }
          queueMicrotask(() => {
            runAttackLocally(froms, to, localPlayerId, serverNowMs());
          });
          room.sendAttack(fromIndices, toI);
          return;
        }
        room.setRoomActionError(UI.roomReconnecting);
        room.reconnect();
        return;
      }
      queueMicrotask(() => {
        runAttackLocally(froms, to, localPlayerId);
      });
    },
    [
      gameOutcome,
      room.matchCountdown,
      pageVisible,
      roomCode,
      room.wsConnected,
      session.map,
      room.sendAttack,
      room.reconnect,
      room.myInMatch,
      stripPendingTail,
      runAttackLocally,
      localPlayerId,
    ]
  );

  return (
    <div className={styles.root}>
      <div className={styles.wrap} aria-label={UI.gameField}>
        <div
          className={styles.mapSurface}
          style={
            {
              aspectRatio: mapAspectRatio(liveMap),
              "--map-ar": mapAspectRatioValue(liveMap),
            } as React.CSSProperties
          }
        >
          <MapView
            key={layoutRevision}
            map={liveMap}
            localPlayerId={localPlayerId}
            localDisplayColor={localDisplayColorResolved}
            activePlayerRef={activePlayerRef}
            playerAppearances={playerAppearancesMerged}
            projectileCanvasRef={projectilesCanvasRef}
            playerAppearancesRef={playerAppearancesRef}
            landHitFx={landHitFx}
            syncMapLayout={Boolean(roomCode)}
            showFirstMoveHint={showFirstMoveHint}
            mapInteractionLocked={Boolean(
              !room.syncReady ||
                room.matchCountdown !== null ||
                gameOutcome !== null ||
                soloAwaitingStart
            )}
            onCommitAttacks={handleCommitAttacks}
            onCancelPendingFrom={handleCancelPendingFrom}
            onCancelAllPending={handleCancelAllPending}
            onMapFlightMetricsChange={onMapFlightMetricsChange}
            offlineBotCount={
              roomCode ? undefined : offlineBotCount
            }
            onOfflineBotCountChange={
              roomCode ? undefined : onOfflineBotCountChange
            }
            onOfflineBotCountCommit={
              roomCode ? undefined : onOfflineBotCountCommit
            }
            offlineBotDifficulty={
              roomCode ? undefined : offlineBotDifficulty
            }
            onOfflineBotDifficultyChange={
              roomCode ? undefined : onOfflineBotDifficultyChange
            }
            fighter={controlledAppearance.fighter}
            onFighterChange={handleFighterChange}
            mapId={settingsMapId}
            onMapIdChange={
              roomCode ? room.handleRoomMapIdChange : onMapIdChange
            }
            mapSelectHint={mapSelectHint}
            mapCatalogDisabled={Boolean(
              roomCode && (!room.isHost || room.roomBusy)
            )}
            randomMapOnStart={
              roomCode ? room.roomRandomMapOnStart : randomMapOnStart
            }
            onRandomMapOnStartChange={
              roomCode || onRandomMapOnStartChange
                ? handleRandomMapOnStartChange
                : undefined
            }
            randomMapLabel={roomCode ? UI.randomMapInRoom : undefined}
            hideSideMapPicker
            hideSideHotkeys
            hideSideSoloControls
          />
        </div>
        {room.matchCountdown !== null ? (
          <div className={styles.countdownInputBlocker} aria-hidden />
        ) : null}
        {roomCode && room.roomActionError ? (
          <div
            className={`${styles.mapToast} ${styles.mapToastError}`}
            role="alert"
          >
            <p className={styles.mapToastErrorText}>{room.roomActionError}</p>
            <button
              type="button"
              className={styles.mapToastErrorDismiss}
              onClick={() => room.setRoomActionError(null)}
            >
              {UI.dismiss}
            </button>
          </div>
        ) : null}
        {showOutcomeModal && gameOutcome ? (
          <MatchOutcomeModal
            outcome={gameOutcome}
            onDismiss={() => setOutcomeModalDismissed(true)}
            onSoloNewGame={
              !roomCode &&
              onOfflineNewGame &&
              onOfflineBotCountChange &&
              onOfflineBotDifficultyChange
                ? () => void handleCommitSoloPlay()
                : undefined
            }
            soloStartDisabled={soloPreGameBusy}
            roomCode={roomCode}
            roomIsHost={room.isHost}
            roomBusy={room.roomBusy}
            onRoomNewGame={
              roomCode ? () => void room.openNextRound() : undefined
            }
            showReadyForNext={showReadyForNext}
            readyForNext={room.myReady}
            readyForNextBusy={room.roomBusy}
            onReadyForNext={() => void room.toggleReadyForNext()}
          />
        ) : null}
        {!roomCode && soloPreGamePhase !== "idle"
          ? createPortal(
              <div
                className={styles.soloPreGameOverlay}
                role="status"
                aria-live="assertive"
              >
                {soloPreGamePhase === "goodluck" ? (
                  <p className={styles.soloPreGameTitle}>
                    {UI.soloPreGameGoodLuck}
                  </p>
                ) : (
                  <p className={styles.soloPreGameCount}>{soloPreGameN}</p>
                )}
              </div>,
              document.body
            )
          : null}
        {roomCode && room.matchCountdown !== null
          ? createPortal(
              <div
                className={styles.soloPreGameOverlay}
                role="status"
                aria-live="assertive"
              >
                {room.matchCountdown === "goodluck" ? (
                  <p className={styles.soloPreGameTitle}>
                    {UI.soloPreGameGoodLuck}
                  </p>
                ) : (
                  <p className={styles.soloPreGameCount}>
                    {room.matchCountdown}
                  </p>
                )}
              </div>,
              document.body
            )
          : null}
        {roomSettingsDock ? (
          <SoloPlayDock
            variant={roomDockVariant}
            appearanceLocked={roomCode ? !roomCanEditAppearance : false}
            expanded={soloDockExpanded}
            onExpandedChange={(open) => {
              if (room.isHost && room.roomBusy) return;
              setSoloDockExpanded(open);
            }}
            fighter={controlledAppearance.fighter}
            building={controlledAppearance.building}
            displayColor={controlledAppearance.displayColor}
            draftDisplayName={displayName}
            onDraftDisplayNameChange={handleRoomDisplayNameChange}
            onFighterChange={handleFighterChange}
            onBuildingChange={handleBuildingChange}
            onDisplayColorChange={handleDisplayColorChange}
            onStartGame={() => void room.openNextRound()}
            gameOutcome={gameOutcome}
            awaitingStart={false}
            spectating={
              Boolean(
                roomCode &&
                  !room.inRoomSetup &&
                  room.myInMatch &&
                  !localAlive &&
                  !showReadyForNext
              )
            }
            showReadyForNext={showReadyForNext}
            readyForNext={room.myReady}
            readyForNextBusy={room.roomBusy}
            onToggleReadyForNext={() => void room.toggleReadyForNext()}
            mapId={settingsMapId}
            onMapIdChange={
              room.isHost ? room.handleRoomMapIdChange : () => {}
            }
            mapSelectHint={mapSelectHint}
            randomMapOnStart={room.roomRandomMapOnStart}
            onRandomMapOnStartChange={
              room.isHost ? handleRandomMapOnStartChange : undefined
            }
            randomMapLabel={UI.randomMapInRoom}
            mapCatalogDisabled={room.roomStatus === "playing"}
            startDisabled={room.roomBusy}
            roomCode={roomCode}
            roomLifecycle={
              room.syncReady ? room.roomDockLifecycle : "lobby"
            }
            roomDockPlayers={room.roomDockPlayers}
            roomPlayerCount={room.roomDockPlayers.length}
            roomMaxPlayers={room.roomMaxPlayers}
            isRoomHost={room.isHost}
            onRoomSearch={() => void room.handleOpenSearch()}
            onRoomStart={() => void room.handleStartMatch()}
            onRoomLobbyReady={() => void room.handleLobbyReady()}
            roomLobbyReady={room.myReady}
            canStartMatch={room.canStartMatch}
            roomReadyCount={room.roomReadyCount}
          />
        ) : null}
        {!roomCode &&
        onOfflineBotCountChange &&
        onOfflineBotDifficultyChange &&
        onOfflineNewGame ? (
          <SoloPlayDock
            variant="solo"
            expanded={soloDockExpanded}
            onExpandedChange={(open) => {
              if (soloPreGameBusy) return;
              setSoloDockExpanded(open);
            }}
            fighter={soloDraft.fighter}
            building={soloDraft.building}
            displayColor={soloDraft.displayColor}
            draftDisplayName={soloDraft.displayName}
            onDraftDisplayNameChange={handleDraftDisplayNameChange}
            onFighterChange={handleDraftFighterChange}
            onBuildingChange={handleDraftBuildingChange}
            onDisplayColorChange={handleDraftDisplayColorChange}
            onStartGame={handleCommitSoloPlay}
            gameOutcome={gameOutcome}
            awaitingStart={soloAwaitingStart}
            spectating={soloSpectating}
            offlineBotCount={soloDraft.botCount}
            onOfflineBotCountChange={handleDraftBotCountChange}
            offlineBotDifficulty={soloDraft.botDifficulty}
            onOfflineBotDifficultyChange={handleDraftBotDifficultyChange}
            mapId={soloDraft.mapId}
            onMapIdChange={handleDraftMapIdChange}
            mapSelectHint={mapSelectHint}
            randomMapOnStart={soloDraft.randomMapOnStart}
            onRandomMapOnStartChange={handleDraftRandomMapOnStartChange}
            mapCatalogDisabled={false}
            onNewSoloSession={handleCommitSoloPlay}
            startDisabled={soloPreGameBusy}
          />
        ) : null}
        {roomCode ? (
          <RoomChat
            lines={room.chatLines}
            connected={room.wsConnected}
            localPlayerId={localPlayerId}
            appearances={playerAppearancesMerged}
            localDisplayColor={localDisplayColorResolved}
            onSend={room.sendChat}
          />
        ) : null}
      </div>
    </div>
  );
}
