import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SyncAppearance,
  SyncCell,
  WsServerMessage,
} from "@/shared/wsProtocol";
import type { RoomStatus } from "@/api/roomApi";
import type { FighterSkinId, BuildingSkinId } from "@/game/appearance";
import { updateServerClockOffset } from "@/game/serverClock";
import { useUserId } from "./useUserId";
import { roomWsUrl } from "@/lib/wsUrl";

export type AttackLaunchEvent = {
  attackId: string;
  attackerId: string;
  fighter: string;
  fromIndex: number;
  toIndex: number;
  amount: number;
  issuedAt: number;
  serverTime: number;
  /** performance.now() в момент получения WS-сообщения. */
  perfAtReceive: number;
};

type UseRoomGameSyncOptions = {
  roomCode: string | null;
  /** Подключать WS только после join/hydrate (избегает гонки с REST). */
  wsEnabled?: boolean;
  onSnapshot: (
    mapId: string,
    cells: SyncCell[],
    appearances: SyncAppearance[],
    randomMapOnStart?: boolean
  ) => void;
  onRoomSettings?: (randomMapOnStart: boolean) => void;
  onRoomStatus?: (msg: {
    status: RoomStatus;
    mapId: string;
    randomMapOnStart: boolean;
    hostUserId: string;
    players: {
      userId: string;
      slotId?: string;
      inMatch?: boolean;
      ready?: boolean;
      joinedDuringMatch?: boolean;
    }[];
  }) => void;
  onCells: (cells: SyncCell[]) => void;
  onAttackLaunch: (launch: AttackLaunchEvent) => void;
  onPendingCancelled: (fromIndex: number) => void;
  onPendingTailStrip: (fromIndex: number, keepToIndex: number) => void;
  onGameReset: (
    mapId: string,
    cells: SyncCell[],
    appearances: SyncAppearance[],
    countdown: boolean
  ) => void;
  onAppearances: (players: SyncAppearance[]) => void;
  onAppearance: (
    slotId: string,
    fighter: string,
    building: string,
    displayColor?: string,
    displayName?: string
  ) => void;
  onProjectileCollision: (
    destroyed: readonly { attackId: string; simIndex: number }[],
    explosions?: readonly {
      x: number;
      y: number;
      weapon?: string;
    }[]
  ) => void;
  onChatMessage?: (msg: {
    slotId: string;
    name: string;
    text: string;
    sentAt: number;
  }) => void;
  onChatHistory?: (
    messages: {
      slotId: string;
      name: string;
      text: string;
      sentAt: number;
    }[]
  ) => void;
};

export function useRoomGameSync({
  roomCode,
  wsEnabled = true,
  onSnapshot,
  onCells,
  onAttackLaunch,
  onPendingCancelled,
  onPendingTailStrip,
  onGameReset,
  onAppearances,
  onAppearance,
  onProjectileCollision,
  onChatMessage,
  onChatHistory,
  onRoomSettings,
  onRoomStatus,
}: UseRoomGameSyncOptions) {
  const userId = useUserId();
  const [connected, setConnected] = useState(false);
  const [wsKey, setWsKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef({
    onSnapshot,
    onCells,
    onAttackLaunch,
    onPendingCancelled,
    onPendingTailStrip,
    onGameReset,
    onAppearances,
    onAppearance,
    onProjectileCollision,
    onChatMessage,
    onChatHistory,
    onRoomSettings,
    onRoomStatus,
  });
  handlersRef.current = {
    onSnapshot,
    onCells,
    onAttackLaunch,
    onPendingCancelled,
    onPendingTailStrip,
    onGameReset,
    onAppearances,
    onAppearance,
    onProjectileCollision,
    onChatMessage,
    onChatHistory,
    onRoomSettings,
    onRoomStatus,
  };

  useEffect(() => {
    if (!roomCode || !wsEnabled) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket(roomWsUrl(roomCode));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({ type: "join", userId })
      );
    };

    ws.onmessage = (ev) => {
      let msg: WsServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as WsServerMessage;
      } catch {
        return;
      }
      if (msg.type === "snapshot") {
        updateServerClockOffset(msg.serverTime);
        handlersRef.current.onSnapshot(
          msg.mapId,
          msg.cells,
          msg.appearances ?? [],
          msg.randomMapOnStart
        );
      } else if (msg.type === "room_settings") {
        handlersRef.current.onRoomSettings?.(msg.randomMapOnStart);
      } else if (msg.type === "room_status") {
        handlersRef.current.onRoomStatus?.({
          status: msg.status,
          mapId: msg.mapId,
          randomMapOnStart: msg.randomMapOnStart,
          hostUserId: msg.hostUserId,
          players: msg.players,
        });
      } else if (msg.type === "appearances") {
        handlersRef.current.onAppearances(msg.players);
      } else if (msg.type === "appearance") {
        handlersRef.current.onAppearance(
          msg.slotId,
          msg.fighter,
          msg.building,
          msg.displayColor,
          msg.displayName
        );
      } else if (msg.type === "cells") {
        updateServerClockOffset(msg.serverTime);
        handlersRef.current.onCells(msg.cells);
      } else if (msg.type === "attack_launch") {
        updateServerClockOffset(msg.serverTime);
        handlersRef.current.onAttackLaunch({
          attackId: msg.attackId,
          attackerId: msg.attackerId,
          fighter: msg.fighter,
          fromIndex: msg.fromIndex,
          toIndex: msg.toIndex,
          amount: msg.amount,
          issuedAt: msg.issuedAt,
          serverTime: msg.serverTime,
          perfAtReceive: performance.now(),
        });
      } else if (msg.type === "pending_cancelled") {
        handlersRef.current.onPendingCancelled(msg.fromIndex);
      } else if (msg.type === "pending_tail_strip") {
        handlersRef.current.onPendingTailStrip(
          msg.fromIndex,
          msg.keepToIndex
        );
      } else if (msg.type === "game_reset") {
        updateServerClockOffset(msg.serverTime);
        handlersRef.current.onGameReset(
          msg.mapId,
          msg.cells,
          msg.appearances ?? [],
          msg.countdown === true
        );
      } else if (msg.type === "projectile_collision") {
        handlersRef.current.onProjectileCollision(
          msg.destroyed,
          msg.explosions
        );
      } else if (msg.type === "chat") {
        handlersRef.current.onChatMessage?.({
          slotId: msg.slotId,
          name: msg.name,
          text: msg.text,
          sentAt: msg.sentAt,
        });
      } else if (msg.type === "chat_history") {
        handlersRef.current.onChatHistory?.(msg.messages);
      }
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    return () => {
      ws.close();
      wsRef.current = null;
      setConnected(false);
    };
  }, [roomCode, wsKey, userId, wsEnabled]);

  /** Переподключение, если join на REST прошёл, а WS упал (частая гонка при открытии комнаты). */
  useEffect(() => {
    if (!roomCode || !wsEnabled || connected) return;
    const id = window.setInterval(() => setWsKey((k) => k + 1), 2500);
    return () => window.clearInterval(id);
  }, [roomCode, wsEnabled, connected]);

  const reconnect = useCallback(() => {
    setWsKey((k) => k + 1);
  }, []);

  const sendAttack = useCallback(
    (fromIndices: number[], toIndex: number) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({ type: "attack", fromIndices, toIndex })
      );
    },
    []
  );

  const sendCancelPending = useCallback((fromIndex: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "cancel_pending", fromIndex }));
  }, []);

  const sendAppearance = useCallback(
    (
      fighter: FighterSkinId,
      building: BuildingSkinId,
      displayColor?: string,
      displayName?: string
    ) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const name = displayName?.trim().slice(0, 32);
      ws.send(
        JSON.stringify({
          type: "appearance",
          fighter,
          building,
          ...(displayColor ? { displayColor } : {}),
          ...(name ? { displayName: name } : {}),
        })
      );
    },
    []
  );

  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const t = text.trim().slice(0, 200);
    if (!t) return;
    ws.send(JSON.stringify({ type: "chat", text: t }));
  }, []);

  return {
    connected,
    sendAttack,
    sendCancelPending,
    sendAppearance,
    sendChat,
    reconnect,
  };
}
