import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SyncAppearance,
  SyncCell,
  WsServerMessage,
} from "../../shared/wsProtocol";
import type { FighterSkinId, BuildingSkinId } from "../game/appearance";
import { getOrCreateUserId } from "../lib/userId";
import { roomWsUrl } from "../lib/wsUrl";

export type AttackLaunchEvent = {
  attackId: string;
  attackerId: string;
  fromIndex: number;
  toIndex: number;
  amount: number;
  issuedAt: number;
};

type UseRoomGameSyncOptions = {
  roomCode: string | null;
  onSnapshot: (
    mapId: string,
    cells: SyncCell[],
    appearances: SyncAppearance[]
  ) => void;
  onCells: (cells: SyncCell[]) => void;
  onAttackLaunch: (launch: AttackLaunchEvent) => void;
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
    displayColor?: string
  ) => void;
  onProjectileCollision: (
    destroyed: readonly { attackId: string; simIndex: number }[],
    explosions?: readonly { x: number; y: number }[]
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
  onSnapshot,
  onCells,
  onAttackLaunch,
  onGameReset,
  onAppearances,
  onAppearance,
  onProjectileCollision,
  onChatMessage,
  onChatHistory,
}: UseRoomGameSyncOptions) {
  const [connected, setConnected] = useState(false);
  const [wsKey, setWsKey] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef({
    onSnapshot,
    onCells,
    onAttackLaunch,
    onGameReset,
    onAppearances,
    onAppearance,
    onProjectileCollision,
    onChatMessage,
    onChatHistory,
  });
  handlersRef.current = {
    onSnapshot,
    onCells,
    onAttackLaunch,
    onGameReset,
    onAppearances,
    onAppearance,
    onProjectileCollision,
    onChatMessage,
    onChatHistory,
  };

  useEffect(() => {
    if (!roomCode) {
      setConnected(false);
      return;
    }

    const ws = new WebSocket(roomWsUrl(roomCode));
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({ type: "join", userId: getOrCreateUserId() })
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
        handlersRef.current.onSnapshot(
          msg.mapId,
          msg.cells,
          msg.appearances ?? []
        );
      } else if (msg.type === "appearances") {
        handlersRef.current.onAppearances(msg.players);
      } else if (msg.type === "appearance") {
        handlersRef.current.onAppearance(
          msg.slotId,
          msg.fighter,
          msg.building,
          msg.displayColor
        );
      } else if (msg.type === "cells") {
        handlersRef.current.onCells(msg.cells);
      } else if (msg.type === "attack_launch") {
        handlersRef.current.onAttackLaunch({
          attackId: msg.attackId,
          attackerId: msg.attackerId,
          fromIndex: msg.fromIndex,
          toIndex: msg.toIndex,
          amount: msg.amount,
          issuedAt: msg.issuedAt,
        });
      } else if (msg.type === "game_reset") {
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
  }, [roomCode, wsKey]);

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
      displayColor?: string
    ) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          type: "appearance",
          fighter,
          building,
          ...(displayColor ? { displayColor } : {}),
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
