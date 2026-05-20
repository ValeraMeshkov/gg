import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  endRoundToMatchmaking,
  fetchRoom,
  joinRoom,
  openMatchmaking,
  patchRoomSettings,
  setRoomReady,
  startRoom,
  type Room,
  type RoomStatus,
} from "@/api/roomApi";
import { fetchRemoteProfile } from "@/api/profileApi";
import {
  appearancesFromSync,
  type MyAppearancePatch,
  type PlayerAppearance,
  type PlayerAppearancesMap,
} from "@/game/appearance";
import { cloneCells } from "@/game/cells/cloneCells";
import type { MapCell } from "@/game/maps/types";
import { UI } from "@/constants/uiStrings";
import { MIN_ROOM_PLAYERS } from "@/shared/playerSlots";
import {
  countMatchmakingReady,
  lobbyPoolPlayers,
  matchParticipantSlotIds,
  playerInMatch,
  queueRoomPlayers,
} from "@/shared/roomRoster";
import type { RoomDockPlayerRow } from "@/components/room/RoomDockPlayerList";
import type { SyncAppearance } from "@/shared/wsProtocol";
import {
  useRoomGameSync,
  type AttackLaunchEvent,
} from "./useRoomGameSync";
import { useGameShell } from "@/context/GameShellContext";

export type MatchCountdownPhase = 3 | 2 | 1 | "goodluck";

export type ChatLine = {
  key: string;
  slotId: string;
  name: string;
  text: string;
  sentAt: number;
};

type UseRoomSessionOpts = {
  roomCode: string | null;
  userId: string;
  mapIdProp?: string;
  onMapIdChange: (mapId: string) => void;
  localPlayerId: string;
  setLocalPlayerId: (id: string) => void;
  cellsRef: import("react").MutableRefObject<MapCell[]>;
  applyCellsFromServer: (next: MapCell[]) => void;
  resetLocalCombat: () => void;
  runRemoteAttack: (launch: AttackLaunchEvent) => void;
  cancelPendingAtCell: (fromIndex: number) => void;
  stripPendingTail: (fromIndex: number, toIndex: number) => void;
  handleProjectileCollision: (
    destroyed: readonly { attackId: string; simIndex: number }[],
    explosions?: readonly {
      x: number;
      y: number;
      weapon?: string;
    }[]
  ) => void;
  controlledAppearance: PlayerAppearance;
  displayName: string;
  patchMyAppearance: (patch: MyAppearancePatch) => void;
  onFirstMoveHintReset?: () => void;
  /** false — не опрашивать REST, пока вкладка в фоне. */
  pageVisible?: boolean;
  /** Можно ли слать appearance по WS (из GameCanvas). */
  appearanceEditAllowedRef?: import("react").MutableRefObject<boolean>;
};

export function useRoomSession({
  roomCode,
  userId,
  mapIdProp,
  onMapIdChange,
  setLocalPlayerId,
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
  onFirstMoveHintReset,
  pageVisible = true,
  appearanceEditAllowedRef,
}: UseRoomSessionOpts) {
  const { setRoomChromeActions, requestExpandSoloBattleDock } = useGameShell();
  const onMapIdChangeRef = useRef(onMapIdChange);
  onMapIdChangeRef.current = onMapIdChange;
  const mapIdPropRef = useRef(mapIdProp);
  mapIdPropRef.current = mapIdProp;
  const controlledAppearanceRef = useRef(controlledAppearance);
  controlledAppearanceRef.current = controlledAppearance;
  const displayNameRef = useRef(displayName);
  displayNameRef.current = displayName;
  const roomChromeClearedRef = useRef(!roomCode);

  const [roomMapId, setRoomMapId] = useState<string | null>(null);
  const [roomRandomMapOnStart, setRoomRandomMapOnStart] = useState(true);
  const [syncReady, setSyncReady] = useState(!roomCode);
  const [isHost, setIsHost] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomSlotIds, setRoomSlotIds] = useState<string[]>([]);
  const [myInMatch, setMyInMatch] = useState(true);
  const [myReady, setMyReady] = useState(false);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>("lobby");
  const [roomMaxPlayers, setRoomMaxPlayers] = useState(10);
  const [roomPlayerLabels, setRoomPlayerLabels] = useState<
    Record<string, string>
  >({});
  const [roomPlayersRaw, setRoomPlayersRaw] = useState<Room["players"]>([]);
  const [roomDisplayNames, setRoomDisplayNames] = useState<
    Record<string, string>
  >({});
  const [roomAppearances, setRoomAppearances] = useState<PlayerAppearancesMap>(
    {}
  );
  const chatLineKeyRef = useRef(0);
  const [chatLines, setChatLines] = useState<ChatLine[]>([]);
  const [matchCountdown, setMatchCountdown] =
    useState<MatchCountdownPhase | null>(null);
  const countdownTimersRef = useRef<number[]>([]);
  /** Не перезапускать отсчёт по WS, если хост уже запустил его локально. */
  const countdownSkipUntilRef = useRef(0);
  const roomStatusRef = useRef<RoomStatus>("lobby");
  roomStatusRef.current = roomStatus;

  useEffect(() => {
    setChatLines([]);
    chatLineKeyRef.current = 0;
    if (!roomCode) {
      setSyncReady(true);
      setMyInMatch(true);
    }
  }, [roomCode]);

  const [roomHostUserId, setRoomHostUserId] = useState("");

  const syncLocalPlayerFromRoom = useCallback(
    (r: { hostUserId: string; status: RoomStatus; players: { userId: string; inMatch?: boolean; ready?: boolean }[] }) => {
      setRoomStatus(r.status);
      setRoomHostUserId(r.hostUserId);
      setIsHost(r.hostUserId === userId);
      const me = r.players.find((p) => p.userId === userId);
      setMyInMatch(me ? playerInMatch(me) : false);
      setMyReady(me?.ready === true);
    },
    [userId]
  );

  const syncRoomSlotIds = useCallback(
    (
      players: {
        userId: string;
        slotId?: string;
        inMatch?: boolean;
      }[]
    ) => {
      setRoomSlotIds(
        matchParticipantSlotIds(
          players.map((p) => ({
            userId: p.userId,
            joinedAt: "",
            slotId: p.slotId,
            inMatch: p.inMatch !== false,
          }))
        )
      );
    },
    []
  );

  const hydrateRoomFromServer = useCallback(
    async (r: Room) => {
      setRoomMapId(r.mapId);
      onMapIdChangeRef.current(r.mapId);
      setRoomRandomMapOnStart(r.randomMapOnStart ?? true);
      setRoomMaxPlayers(r.maxPlayers);
      syncLocalPlayerFromRoom(r);
      setRoomPlayersRaw(r.players);
      const names: Record<string, string> = {};
      await Promise.all(
        r.players.map(async (p, i) => {
          const profile = await fetchRemoteProfile(p.userId);
          names[p.userId] =
            profile?.displayName?.trim() || UI.playerSlot(i + 1);
        })
      );
      setRoomPlayerLabels(names);
      syncRoomSlotIds(r.players);
      setSyncReady(true);
    },
    [syncLocalPlayerFromRoom, syncRoomSlotIds]
  );

  const clearMatchCountdown = useCallback(() => {
    for (const tid of countdownTimersRef.current) {
      window.clearTimeout(tid);
    }
    countdownTimersRef.current = [];
    setMatchCountdown(null);
  }, []);

  const startMatchCountdown = useCallback(() => {
    clearMatchCountdown();
    countdownSkipUntilRef.current = Date.now() + 4500;
    const schedule = (delayMs: number, phase: MatchCountdownPhase | null) => {
      const tid = window.setTimeout(() => setMatchCountdown(phase), delayMs);
      countdownTimersRef.current.push(tid);
    };
    setMatchCountdown(3);
    schedule(800, 2);
    schedule(1600, 1);
    schedule(2400, "goodluck");
    schedule(3900, null);
  }, [clearMatchCountdown]);

  const applyRemoteAppearances = useCallback((players: SyncAppearance[]) => {
    if (players.length === 0) return;
    setRoomAppearances((prev) => ({
      ...prev,
      ...appearancesFromSync(players, prev),
    }));
    const names: Record<string, string> = {};
    for (const p of players) {
      if (p.displayName != null) {
        names[p.slotId] = p.displayName;
      }
    }
    if (Object.keys(names).length > 0) {
      setRoomDisplayNames((prev) => ({ ...prev, ...names }));
    }
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
      if (clearFirstMoveHint) onFirstMoveHintReset?.();
      if (startCountdown) startMatchCountdown();
    },
    [
      applyCellsFromServer,
      applyRemoteAppearances,
      resetLocalCombat,
      startMatchCountdown,
      onFirstMoveHintReset,
    ]
  );

  useEffect(() => {
    if (!roomCode) return;
    let cancelled = false;
    void (async () => {
      try {
        let room = await fetchRoom(roomCode);
        if (cancelled || !room) return;
        if (!room.players.some((p) => p.userId === userId)) {
          room = await joinRoom(roomCode, userId);
        }
        if (cancelled) return;
        await hydrateRoomFromServer(room);
        const me = room.players.find((p) => p.userId === userId);
        if (me?.slotId && playerInMatch(me)) {
          setLocalPlayerId(me.slotId);
        }
        if (room.game?.cells) {
          const next = room.game.cells.map((c) => ({ ...c }));
          cellsRef.current = next;
          applyCellsFromServer(cloneCells(next));
        }
        if (room.status === "lobby" || room.status === "matchmaking") {
          requestExpandSoloBattleDock();
        }
      } catch {
        /* poll retry */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    roomCode,
    userId,
    cellsRef,
    applyCellsFromServer,
    setLocalPlayerId,
    hydrateRoomFromServer,
    requestExpandSoloBattleDock,
  ]);

  useEffect(() => {
    if (!roomCode || !pageVisible) return;
    let cancelled = false;
    const poll = async () => {
      const room = await fetchRoom(roomCode);
      if (cancelled || !room) return;
      await hydrateRoomFromServer(room);
      const me = room.players.find((p) => p.userId === userId);
      if (me?.slotId && playerInMatch(me)) {
        setLocalPlayerId(me.slotId);
      }
      if (room.game?.cells) {
        const next = room.game.cells.map((c) => ({ ...c }));
        cellsRef.current = next;
        applyCellsFromServer(cloneCells(next));
      }
    };
    const id = window.setInterval(() => void poll(), 2500);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    roomCode,
    userId,
    pageVisible,
    hydrateRoomFromServer,
    applyCellsFromServer,
    cellsRef,
    setLocalPlayerId,
  ]);

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

  const {
    connected: wsConnected,
    sendAttack,
    sendCancelPending,
    sendAppearance,
    sendChat,
    reconnect,
  } = useRoomGameSync({
    roomCode,
    onSnapshot: (snapMapId, snapCells, appearances, randomMapOnStart) => {
      if (randomMapOnStart !== undefined) {
        setRoomRandomMapOnStart(randomMapOnStart);
      }
      applyGameReset(snapMapId, snapCells, appearances, false, false);
    },
    onRoomSettings: setRoomRandomMapOnStart,
    onCells: applyCellsFromServer,
    onAttackLaunch: runRemoteAttack,
    onPendingCancelled: cancelPendingAtCell,
    onPendingTailStrip: stripPendingTail,
    onGameReset: (mapId, snapCells, appearances, countdown) => {
      if (countdown) {
        setRoomStatus("playing");
        roomStatusRef.current = "playing";
      }
      const skipCountdown =
        countdown && Date.now() < countdownSkipUntilRef.current;
      applyGameReset(
        mapId,
        snapCells,
        appearances,
        countdown && !skipCountdown,
        true
      );
    },
    onAppearances: applyRemoteAppearances,
    onAppearance: (slotId, fighter, building, displayColor, remoteDisplayName) => {
      applyRemoteAppearances([
        {
          slotId,
          fighter,
          building,
          displayColor,
          displayName: remoteDisplayName,
        },
      ]);
    },
    onProjectileCollision: handleProjectileCollision,
    onChatMessage,
    onChatHistory,
    onRoomStatus: (msg) => {
      setRoomStatus(msg.status);
      setRoomMapId(msg.mapId);
      onMapIdChangeRef.current(msg.mapId);
      setRoomRandomMapOnStart(msg.randomMapOnStart);
      const me = msg.players.find((p) => p.userId === userId);
      setMyInMatch(me ? playerInMatch(me) : false);
      setMyReady(me?.ready === true);
      setRoomPlayersRaw(
        msg.players.map((p) => ({
          userId: p.userId,
          joinedAt: "",
          slotId: p.slotId,
          inMatch: p.inMatch,
          ready: p.ready,
          joinedDuringMatch: p.joinedDuringMatch,
        }))
      );
      syncRoomSlotIds(msg.players);
      if (msg.status === "lobby" || msg.status === "matchmaking") {
        requestExpandSoloBattleDock();
      }
    },
  });

  useEffect(() => {
    if (!roomCode || !wsConnected) return;
    if (appearanceEditAllowedRef && !appearanceEditAllowedRef.current) {
      return;
    }
    sendAppearance(
      controlledAppearance.fighter,
      controlledAppearance.building,
      controlledAppearance.displayColor,
      displayNameRef.current
    );
  }, [
    roomCode,
    wsConnected,
    sendAppearance,
    controlledAppearance.fighter,
    controlledAppearance.building,
    controlledAppearance.displayColor,
    displayName,
    appearanceEditAllowedRef,
  ]);

  const patchMyAppearanceRoom = useCallback(
    (patch: MyAppearancePatch, canEdit: boolean) => {
      if (!canEdit) return;
      const next = { ...controlledAppearanceRef.current, ...patch };
      patchMyAppearance(patch);
      if (roomCode && wsConnected) {
        sendAppearance(
          next.fighter,
          next.building,
          next.displayColor,
          displayNameRef.current
        );
      }
    },
    [patchMyAppearance, roomCode, wsConnected, sendAppearance]
  );

  const patchRoomSettingsAsHost = useCallback(
    async (patch: { mapId?: string; randomMapOnStart?: boolean }) => {
      if (!roomCode || !isHost || roomStatusRef.current === "playing") {
        return null;
      }
      setRoomBusy(true);
      setRoomActionError(null);
      try {
        const r = await patchRoomSettings(roomCode, userId, patch);
        setRoomMapId(r.mapId);
        setRoomRandomMapOnStart(r.randomMapOnStart ?? true);
        onMapIdChangeRef.current(r.mapId);
        return r;
      } catch (e) {
        setRoomActionError(
          e instanceof Error ? e.message : UI.roomPatchFailed
        );
        throw e;
      } finally {
        setRoomBusy(false);
      }
    },
    [roomCode, isHost, userId]
  );

  const handleRoomMapIdChange = useCallback(
    async (nextMapId: string) => {
      if (!roomCode || !isHost) return;
      if (roomStatusRef.current === "playing") {
        setRoomActionError(UI.mapChangeOnlyBetweenRounds);
        return;
      }
      onMapIdChangeRef.current(nextMapId);
      try {
        await patchRoomSettingsAsHost({
          mapId: nextMapId,
          randomMapOnStart: false,
        });
      } catch {
        /* roomActionError */
      }
    },
    [roomCode, isHost, patchRoomSettingsAsHost]
  );

  const handleRandomMapOnStartChange = useCallback(
    async (value: boolean, onOfflineChange?: (value: boolean) => void) => {
      if (roomCode) {
        if (!isHost) return;
        if (roomStatusRef.current === "playing") {
          setRoomActionError(UI.mapChangeOnlyBetweenRounds);
          return;
        }
        try {
          await patchRoomSettingsAsHost({
            randomMapOnStart: value,
            mapId: value
              ? undefined
              : mapIdPropRef.current ?? roomMapId ?? undefined,
          });
        } catch {
          /* roomActionError */
        }
        return;
      }
      onOfflineChange?.(value);
    },
    [roomCode, isHost, roomMapId, patchRoomSettingsAsHost]
  );

  const toggleReadyForNext = useCallback(async () => {
    if (!roomCode) return;
    setRoomActionError(null);
    setRoomBusy(true);
    try {
      const r = await setRoomReady(roomCode, userId, !myReady);
      syncLocalPlayerFromRoom(r);
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomReadyDuringPlayFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, userId, myReady, syncLocalPlayerFromRoom]);

  const handleOpenSearch = useCallback(async () => {
    if (!roomCode || !isHost) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      const r = await openMatchmaking(roomCode, userId);
      await hydrateRoomFromServer(r);
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomSearchFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, isHost, userId, hydrateRoomFromServer]);

  const handleStartMatch = useCallback(async () => {
    if (!roomCode || !isHost) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      const r = await startRoom(roomCode, userId);
      await hydrateRoomFromServer(r);
      if (r.status === "playing" && r.game?.cells?.length) {
        const me = r.players.find((p) => p.userId === userId);
        if (me?.slotId && playerInMatch(me)) {
          setLocalPlayerId(me.slotId);
        }
        applyGameReset(
          r.mapId,
          r.game.cells.map((c) => ({ ...c })),
          [],
          true,
          true
        );
      }
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomStartFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [
    roomCode,
    isHost,
    userId,
    hydrateRoomFromServer,
    setLocalPlayerId,
    applyGameReset,
  ]);

  const handleLobbyReady = useCallback(async () => {
    if (!roomCode || roomStatusRef.current !== "matchmaking") return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      const r = await setRoomReady(roomCode, userId, !myReady);
      await hydrateRoomFromServer(r);
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomReadyFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, userId, myReady, hydrateRoomFromServer]);

  const openNextRound = useCallback(async () => {
    if (!roomCode || !isHost) return;
    if (roomStatusRef.current !== "playing") {
      requestExpandSoloBattleDock();
      return;
    }
    clearMatchCountdown();
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      const r = await endRoundToMatchmaking(roomCode, userId, {
        randomMapOnStart: roomRandomMapOnStart,
        mapId: roomRandomMapOnStart
          ? undefined
          : mapIdPropRef.current ?? roomMapId ?? undefined,
      });
      await hydrateRoomFromServer(r);
      requestExpandSoloBattleDock();
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomEndRoundFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [
    roomCode,
    isHost,
    roomRandomMapOnStart,
    roomMapId,
    clearMatchCountdown,
    userId,
    hydrateRoomFromServer,
    requestExpandSoloBattleDock,
  ]);

  const roomDockPlayers = useMemo((): RoomDockPlayerRow[] => {
    const publicPlayers = roomPlayersRaw.map((p) => ({
      userId: p.userId,
      joinedAt: p.joinedAt,
      inMatch: p.inMatch !== false,
      joinedDuringMatch: p.joinedDuringMatch,
      ready: p.ready,
    }));
    const list =
      roomStatus === "matchmaking"
        ? [
            ...lobbyPoolPlayers(publicPlayers, roomStatus),
            ...queueRoomPlayers(publicPlayers),
          ]
        : publicPlayers;
    const seen = new Set<string>();
    const unique = list.filter((p) => {
      if (seen.has(p.userId)) return false;
      seen.add(p.userId);
      return true;
    });
    return unique.map((p, i) => ({
      userId: p.userId,
      label: roomPlayerLabels[p.userId] || UI.playerSlot(i + 1),
      isHost: p.userId === roomHostUserId,
      isYou: p.userId === userId,
      ready:
        p.ready === true ||
        (roomStatus === "matchmaking" && p.userId === roomHostUserId),
      inQueue: p.joinedDuringMatch === true,
    }));
  }, [roomPlayersRaw, roomPlayerLabels, roomStatus, roomHostUserId, userId]);

  const roomReadyCount =
    roomStatus === "matchmaking"
      ? countMatchmakingReady(
          roomPlayersRaw.map((p) => ({
            userId: p.userId,
            joinedAt: p.joinedAt,
            inMatch: p.inMatch,
            joinedDuringMatch: p.joinedDuringMatch,
            ready: p.ready,
          })),
          roomStatus,
          roomHostUserId || undefined
        )
      : 0;

  const roomMatchParticipantCount = useMemo(
    () =>
      roomPlayersRaw.filter((p) => playerInMatch(p) && p.slotId).length,
    [roomPlayersRaw]
  );
  const canStartMatch =
    isHost &&
    roomStatus === "matchmaking" &&
    roomReadyCount >= MIN_ROOM_PLAYERS;

  const handleOpenSearchRef = useRef(handleOpenSearch);
  handleOpenSearchRef.current = handleOpenSearch;
  const handleStartMatchRef = useRef(handleStartMatch);
  handleStartMatchRef.current = handleStartMatch;
  const openNextRoundRef = useRef(openNextRound);
  openNextRoundRef.current = openNextRound;

  useLayoutEffect(() => {
    if (!roomCode) {
      if (!roomChromeClearedRef.current) {
        roomChromeClearedRef.current = true;
        setRoomChromeActions(null);
      }
      return;
    }
    roomChromeClearedRef.current = false;
    if (!isHost) {
      setRoomChromeActions(null);
      return;
    }

    const primaryLabel =
      roomStatus === "lobby"
        ? UI.roomSearchGame
        : roomStatus === "matchmaking"
          ? UI.roomPlay
          : UI.roomNextRound;
    const primaryDisabled =
      roomStatus === "matchmaking"
        ? roomBusy || !canStartMatch
        : roomBusy;
    const onPrimary =
      roomStatus === "lobby"
        ? () => void handleOpenSearchRef.current()
        : roomStatus === "matchmaking"
          ? () => void handleStartMatchRef.current()
          : () => void openNextRoundRef.current();

    setRoomChromeActions((prev) => {
      if (
        prev &&
        prev.primaryLabel === primaryLabel &&
        prev.primaryDisabled === primaryDisabled
      ) {
        return prev;
      }
      return { primaryLabel, primaryDisabled, onPrimary };
    });
  }, [roomCode, isHost, roomBusy, roomStatus, canStartMatch, setRoomChromeActions]);

  useEffect(() => {
    return () => setRoomChromeActions(null);
  }, [roomCode, setRoomChromeActions]);

  return {
    roomMapId,
    roomRandomMapOnStart,
    syncReady,
    isHost,
    roomBusy,
    roomActionError,
    setRoomActionError,
    roomSlotIds,
    myInMatch,
    myReady,
    roomStatus,
    toggleReadyForNext,
    roomDisplayNames,
    roomAppearances,
    chatLines,
    matchCountdown,
    clearMatchCountdown,
    startMatchCountdown,
    wsConnected,
    sendAttack,
    sendCancelPending,
    sendChat,
    reconnect,
    patchMyAppearanceRoom,
    handleRandomMapOnStartChange,
    handleRoomMapIdChange,
    openNextRound,
    handleOpenSearch,
    handleStartMatch,
    handleLobbyReady,
    roomDockPlayers,
    roomMaxPlayers,
    roomReadyCount,
    canStartMatch,
    roomMatchParticipantCount,
    inRoomSetup: roomStatus === "lobby" || roomStatus === "matchmaking",
  };
}
