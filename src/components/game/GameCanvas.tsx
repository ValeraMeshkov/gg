import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cloneCells } from "@/game/cells/cloneCells";
import { useOfflineCellGrowth } from "@/hooks/useOfflineCellGrowth";
import { useMergedPlayerAppearances } from "@/hooks/useMergedPlayerAppearances";
import { useGameScoring } from "@/hooks/useGameScoring";
import { useOfflineBotLoop } from "@/hooks/useOfflineBotLoop";
import { useProjectileCombat } from "@/hooks/useProjectileCombat";
import { UI } from "@/constants/uiStrings";
import {
  cellIndex,
  DEFAULT_MAP_ID,
  requireMap,
  type CellPos,
  type MapCell,
} from "@/game/maps";
import { mapAspectRatio, mapProjectileRadius } from "@/game/maps";
import { pendingLaunchFromIndicesForPlayer } from "@/game/projectiles/flightQueue";
import { type LandHitFx } from "@/game/hitEffects";
import { shareBarColorForView } from "@/game/playerColors";
import type { PlayerAppearancesMap } from "@/game/appearance";
import { useRoomSession } from "@/hooks/useRoomSession";
import {
  createMockSession,
  MOCK_USER,
  MOCK_PLAYERS,
} from "@/game/mock";
import { useAuth } from "@/context/AuthContext";
import { useUserId } from "@/hooks/useUserId";
import { useSyncedPlayerAppearances } from "@/hooks/useSyncedPlayerAppearances";
import { effectiveDisplayName } from "@/game/playerDisplayName";
import { useMapDotLayoutRevision } from "@/hooks/useMapDotLayoutRevision";
import { useGameShell } from "@/context/GameShellContext";
import { GameSettingsPanel } from "./GameSettingsPanel";
import { MapView } from "./MapView";
import type { MapProjectilesCanvasHandle } from "@/components/map";
import { RoomChat } from "@/components/room/RoomChat";
import styles from "./GameCanvas.module.scss";
import type { GameShareBarPayload } from "@/context/GameShellContext";
import type { PlayerShareBarEntry } from "@/components/settings/PlayerShareBar";

function shareBarPayloadEqual(
  prev: GameShareBarPayload,
  players: readonly PlayerShareBarEntry[],
  activePlayerId: string
): boolean {
  if (!prev) return false;
  if (prev.activePlayerId !== activePlayerId) return false;
  if (prev.players.length !== players.length) return false;
  for (let i = 0; i < players.length; i++) {
    const a = prev.players[i]!;
    const b = players[i]!;
    if (
      a.id !== b.id ||
      a.score !== b.score ||
      a.displayName !== b.displayName ||
      a.colorIndex !== b.colorIndex ||
      a.barBackground !== b.barBackground
    ) {
      return false;
    }
  }
  return true;
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
  /** Оффлайн: сброс партии после «Новая игра» в сообщении о конце игры. */
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
  onOfflineNewGame,
  soloRestartNonce = 0,
}: GameCanvasProps) {
  const userId = useUserId();
  const {
    showGoogleSignIn,
    isAuthenticated,
    user: authUser,
    signInWithGoogle,
    authConfigured,
  } = useAuth();
  const soloBotCount = offlineBotCount ?? 2;
  const soloBotDifficulty = offlineBotDifficulty ?? 50;

  const { setShareBar, setSettingsPanel } = useGameShell();

  const [localPlayerId, setLocalPlayerId] = useState<string>(MOCK_USER.id);
  const [firstMoveHintDismissed, setFirstMoveHintDismissed] = useState(false);
  const {
    playerAppearances,
    controlledAppearance,
    patchMyAppearance,
    displayName,
    patchDisplayName,
  } = useSyncedPlayerAppearances(localPlayerId);
  const activePlayerRef = useRef(localPlayerId);
  activePlayerRef.current = localPlayerId;

  const bootstrapMapId = mapIdProp ?? DEFAULT_MAP_ID;
  const bootstrapSession = useMemo(() => {
    const map = requireMap(bootstrapMapId);
    if (roomCode) {
      return {
        map: { ...map, cells: map.cells.map((c) => ({ ...c })) },
        players: MOCK_PLAYERS.map((user) => ({
          user,
          score: user.initialScore,
        })),
      };
    }
    return createMockSession(map, soloBotCount, soloBotDifficulty);
  }, [bootstrapMapId, roomCode, soloBotCount, soloBotDifficulty]);

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
    setCells(cloneCells(cellsRef.current));
  }, []);

  const applyCellsFromServer = useCallback((next: MapCell[]) => {
    cellsRef.current = cloneCells(next);
    setCells(cloneCells(next));
  }, []);

  const liveMapRef = useRef({
    ...bootstrapSession.map,
    cells: cellsRef.current,
  });
  const explosionJitterSpreadRef = useRef(0);
  explosionJitterSpreadRef.current =
    mapProjectileRadius(bootstrapSession.map) * 3.4;

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
  } = useProjectileCombat({
    roomCode,
    sessionMap: bootstrapSession.map,
    localPlayerId,
    cellsRef,
    pushCellsToReact,
    bumpScoreDisplay,
    markScoreBarStale,
    flushScoreBarIfDirty,
    projectilesCanvasRef,
    liveMapRef,
    explosionJitterSpreadRef,
    landHitFxRef,
    landHitFxMetaRef,
    setLandHitFx,
    onLocalAttack: () => setFirstMoveHintDismissed(true),
  });

  const room = useRoomSession({
    roomCode,
    userId,
    mapIdProp,
    onMapIdChange,
    localPlayerId,
    setLocalPlayerId: (id) => {
      setLocalPlayerId(id);
      activePlayerRef.current = id;
    },
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
  });

  const mapId = room.roomMapId ?? mapIdProp ?? DEFAULT_MAP_ID;
  const settingsMapId = roomCode ? (mapIdProp ?? DEFAULT_MAP_ID) : mapId;
  const layoutRevision = useMapDotLayoutRevision(mapId);
  const hintSessionKey =
    roomCode ??
    `offline:${mapId}:${soloBotCount}:${soloBotDifficulty}`;
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
    return createMockSession(map, soloBotCount, soloBotDifficulty);
  }, [mapId, roomCode, soloBotCount, soloBotDifficulty]);

  explosionJitterSpreadRef.current = mapProjectileRadius(session.map) * 3.4;

  useEffect(() => {
    setFirstMoveHintDismissed(false);
  }, [hintSessionKey]);

  useEffect(() => {
    if (roomCode || soloRestartNonce === 0) return;
    room.startMatchCountdown();
  }, [roomCode, soloRestartNonce, room.startMatchCountdown]);

  const liveMap = useMemo(
    () => ({ ...session.map, cells }),
    [session.map, cells]
  );
  liveMapRef.current = liveMap;

  useOfflineCellGrowth(
    !roomCode,
    cellsRef,
    flightsRef,
    pushCellsToReact
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
      roomCode && room.roomSlotIds.length > 0
        ? room.roomSlotIds
        : session.players.map((s) => s.user.id),
    [roomCode, room.roomSlotIds, session.players]
  );

  const { liveScores, gameOutcome, offlineAliveCount } = useGameScoring({
    cells,
    flightsRef,
    scoreSlotIds,
    localPlayerId,
    roomCode,
    scoreEpoch,
  });

  const playerAppearancesMerged = useMergedPlayerAppearances({
    base: playerAppearances,
    room: room.roomAppearances,
    localPlayerId,
    localAppearance: controlledAppearance,
    offlineBotCount: soloBotCount,
    isRoom: Boolean(roomCode),
  });
  playerAppearancesRef.current = playerAppearancesMerged;

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

  const shareBarPlayers = useMemo(() => {
    const slots =
      roomCode && room.roomSlotIds.length > 0
        ? session.players.filter((s) => room.roomSlotIds.includes(s.user.id))
        : session.players;
    const nameBySlot = { ...room.roomDisplayNames, [localPlayerId]: displayName };
    return slots.map((slot) => {
      const bar = shareBarColorForView(
        slot.user.id,
        localPlayerId,
        localDisplayColorResolved,
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
    room.roomSlotIds,
    localDisplayColorResolved,
    playerAppearancesMerged,
    room.roomDisplayNames,
    displayName,
  ]);

  useLayoutEffect(() => {
    setShareBar((prev) => {
      const next = {
        players: shareBarPlayers,
        activePlayerId: localPlayerId,
      };
      if (shareBarPayloadEqual(prev, next.players, next.activePlayerId)) {
        return prev;
      }
      return next;
    });
  }, [shareBarPlayers, localPlayerId, setShareBar]);

  useEffect(() => () => setShareBar(null), [setShareBar]);

  const offlineBotsEnabled =
    !roomCode &&
    room.syncReady &&
    room.matchCountdown === null &&
    offlineAliveCount >= 2 &&
    gameOutcome !== "won" &&
    gameOutcome !== "draw";

  useOfflineBotLoop({
    enabled: offlineBotsEnabled,
    sessionMap: session.map,
    cellsRef,
    flightsRef,
    botCount: soloBotCount,
    difficulty: soloBotDifficulty,
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

  const settingsPanelContent = useMemo(
    () => (
      <GameSettingsPanel
        mapId={settingsMapId}
        onMapIdChange={onMapIdChange}
        mapSelectHint={mapSelectHint}
        mapCatalogDisabled={Boolean(roomCode && !room.isHost)}
        randomMapOnStart={
          roomCode ? room.roomRandomMapOnStart : randomMapOnStart
        }
        onRandomMapOnStartChange={
          roomCode || onRandomMapOnStartChange
            ? handleRandomMapOnStartChange
            : undefined
        }
        randomMapLabel={roomCode ? UI.randomMapInRoom : undefined}
        displayName={displayName}
        onDisplayNameChange={patchDisplayName}
        fighter={controlledAppearance.fighter}
        building={controlledAppearance.building}
        displayColor={controlledAppearance.displayColor}
        onFighterChange={(fighter) => room.patchMyAppearanceRoom({ fighter })}
        onBuildingChange={(building) => room.patchMyAppearanceRoom({ building })}
        onDisplayColorChange={(displayColor) =>
          patchMyAppearance({ displayColor })
        }
        accountEmail={isAuthenticated ? authUser?.email : null}
        onGoogleSignIn={showGoogleSignIn ? signInWithGoogle : undefined}
        googleSignInHint={
          showGoogleSignIn && !authConfigured ? UI.googleAuthNotConfigured : null
        }
      />
    ),
    [
      settingsMapId,
      onMapIdChange,
      mapSelectHint,
      roomCode,
      room.isHost,
      displayName,
      patchDisplayName,
      controlledAppearance.fighter,
      controlledAppearance.building,
      controlledAppearance.displayColor,
      room.patchMyAppearanceRoom,
      patchMyAppearance,
      room.roomRandomMapOnStart,
      randomMapOnStart,
      handleRandomMapOnStartChange,
      onRandomMapOnStartChange,
      showGoogleSignIn,
      isAuthenticated,
      authUser?.email,
      signInWithGoogle,
      authConfigured,
    ]
  );

  const settingsPanelSig = useMemo(
    () =>
      JSON.stringify({
        settingsMapId,
        mapSelectHint,
        roomCode,
        isHost: room.isHost,
        displayName,
        fighter: controlledAppearance.fighter,
        building: controlledAppearance.building,
        displayColor: controlledAppearance.displayColor,
        roomRandomMapOnStart: room.roomRandomMapOnStart,
        randomMapOnStart,
        showGoogleSignIn,
        isAuthenticated,
        email: authUser?.email ?? null,
        authConfigured,
      }),
    [
      settingsMapId,
      mapSelectHint,
      roomCode,
      room.isHost,
      displayName,
      controlledAppearance.fighter,
      controlledAppearance.building,
      controlledAppearance.displayColor,
      room.roomRandomMapOnStart,
      randomMapOnStart,
      showGoogleSignIn,
      isAuthenticated,
      authUser?.email,
      authConfigured,
    ]
  );
  const settingsPanelSigRef = useRef("");
  const settingsPanelContentRef = useRef(settingsPanelContent);
  settingsPanelContentRef.current = settingsPanelContent;
  useLayoutEffect(() => {
    if (settingsPanelSigRef.current === settingsPanelSig) return;
    settingsPanelSigRef.current = settingsPanelSig;
    setSettingsPanel(settingsPanelContentRef.current);
  }, [settingsPanelSig, setSettingsPanel]);

  useEffect(
    () => () => {
      settingsPanelSigRef.current = "";
      setSettingsPanel(null);
    },
    [setSettingsPanel]
  );

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
      if (gameOutcome || room.matchCountdown !== null) return;
      setFirstMoveHintDismissed(true);
      if (roomCode) {
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
      roomCode,
      room.wsConnected,
      session.map,
      room.sendAttack,
      room.reconnect,
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
          style={{ aspectRatio: mapAspectRatio(liveMap) }}
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
                gameOutcome !== null
            )}
            onCommitAttacks={handleCommitAttacks}
            onCancelPendingFrom={handleCancelPendingFrom}
            onCancelAllPending={handleCancelAllPending}
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
        {room.matchCountdown !== null ? (
          <div
            className={`${styles.mapToast} ${styles.mapToastCountdown}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {room.matchCountdown === "go" ? (
              <p className={styles.mapToastCountdownGo}>{UI.countdownGo}</p>
            ) : (
              <>
                <p className={styles.mapToastCountdownLabel}>
                  {UI.countdownLabel}
                </p>
                <p className={styles.mapToastCountdownNumber}>
                  {room.matchCountdown}
                </p>
              </>
            )}
          </div>
        ) : null}
        {gameOutcome && room.matchCountdown === null ? (
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
                ? UI.outcomeWon
                : gameOutcome === "lost"
                  ? UI.outcomeLost
                  : UI.outcomeDraw}
            </p>
            {roomCode ? (
              room.isHost ? (
                <button
                  type="button"
                  className={styles.mapToastBtn}
                  disabled={room.roomBusy}
                  onClick={() => void room.handleNewGame()}
                >
                  {UI.newGame}
                </button>
              ) : (
                <p className={styles.mapToastHint}>{UI.waitingHost}</p>
              )
            ) : onOfflineNewGame ? (
              <button
                type="button"
                className={styles.mapToastBtn}
                onClick={() => onOfflineNewGame()}
              >
                {UI.newGame}
              </button>
            ) : null}
          </div>
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
