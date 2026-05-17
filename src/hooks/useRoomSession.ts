import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { fetchRoom, patchRoomSettings, restartRoom } from "@/api/roomApi";
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
import type { SyncAppearance } from "@/shared/wsProtocol";
import {
  useRoomGameSync,
  type AttackLaunchEvent,
} from "./useRoomGameSync";
import { useGameShell } from "@/context/GameShellContext";

export type MatchCountdownPhase = 3 | 2 | 1 | "go";

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
    explosions?: readonly { x: number; y: number }[]
  ) => void;
  controlledAppearance: PlayerAppearance;
  displayName: string;
  patchMyAppearance: (patch: MyAppearancePatch) => void;
  onFirstMoveHintReset?: () => void;
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
}: UseRoomSessionOpts) {
  const { setRoomChromeActions } = useGameShell();
  const onMapIdChangeRef = useRef(onMapIdChange);
  onMapIdChangeRef.current = onMapIdChange;
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

  useEffect(() => {
    setChatLines([]);
    chatLineKeyRef.current = 0;
    if (!roomCode) setSyncReady(true);
  }, [roomCode]);

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
    void fetchRoom(roomCode).then((room) => {
      if (cancelled || !room) return;
      setRoomMapId(room.mapId);
      onMapIdChangeRef.current(room.mapId);
      setRoomRandomMapOnStart(room.randomMapOnStart ?? true);
      setIsHost(room.hostUserId === userId);
      setRoomSlotIds(
        room.players
          .map((p) => p.slotId)
          .filter((id): id is string => Boolean(id))
      );
      const me = room.players.find((p) => p.userId === userId);
      if (me?.slotId) {
        setLocalPlayerId(me.slotId);
      }
      if (room.game?.cells) {
        const next = room.game.cells.map((c) => ({ ...c }));
        cellsRef.current = next;
        applyCellsFromServer(cloneCells(next));
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
            ...appearancesFromSync(valid, prev),
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
  }, [
    roomCode,
    userId,
    cellsRef,
    applyCellsFromServer,
    setLocalPlayerId,
  ]);

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
        applyCellsFromServer(cloneCells(next));
        setRoomSlotIds(slotIds);
      }
    };
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roomCode, roomSlotIds.length, cellsRef, applyCellsFromServer]);

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
      applyGameReset(mapId, snapCells, appearances, countdown, true);
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
  });

  useEffect(() => {
    if (!roomCode || !wsConnected) return;
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
  ]);

  const patchMyAppearanceRoom = useCallback(
    (patch: MyAppearancePatch) => {
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

  const handleRandomMapOnStartChange = useCallback(
    async (value: boolean, onOfflineChange?: (value: boolean) => void) => {
      if (roomCode) {
        if (!isHost) return;
        const prev = roomRandomMapOnStart;
        setRoomRandomMapOnStart(value);
        try {
          await patchRoomSettings(roomCode, userId, value);
        } catch {
          setRoomRandomMapOnStart(prev);
        }
        return;
      }
      onOfflineChange?.(value);
    },
    [roomCode, isHost, userId, roomRandomMapOnStart]
  );

  const handleNewGame = useCallback(async () => {
    if (!roomCode || !isHost) return;
    setRoomBusy(true);
    setRoomActionError(null);
    try {
      await restartRoom(
        roomCode,
        userId,
        roomRandomMapOnStart ? undefined : mapIdProp
      );
    } catch (e) {
      setRoomActionError(
        e instanceof Error ? e.message : UI.roomNewGameFailed
      );
    } finally {
      setRoomBusy(false);
    }
  }, [roomCode, isHost, mapIdProp, roomRandomMapOnStart, userId]);

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
      return () => setRoomChromeActions(null);
    }
    setRoomChromeActions({
      primaryLabel: UI.newGame,
      primaryDisabled: roomBusy,
      onPrimary: () => {
        void handleNewGame();
      },
    });
    return () => setRoomChromeActions(null);
  }, [roomCode, isHost, roomBusy, handleNewGame, setRoomChromeActions]);

  return {
    roomMapId,
    roomRandomMapOnStart,
    syncReady,
    isHost,
    roomBusy,
    roomActionError,
    setRoomActionError,
    roomSlotIds,
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
    handleNewGame,
  };
}
