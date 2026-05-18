import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { SyncAppearance, WsServerMessage } from "@/shared/wsProtocol.js";
import { parseWsMessage } from "@/shared/wsProtocol.js";
import { getProfile, updateProfile } from "./db.js";
import { ensureGameForRoom, getGameForRoom, type RoomGameState } from "./gameState.js";
import {
  cancelPendingFromSource,
  processAttack,
  setProjectileCollisionHandler,
} from "./roomAttack.js";
import { getRoom, type Room } from "./rooms.js";
import { slotIndexFromId } from "@/shared/playerSlots.js";
import {
  preferredDisplayColorForSlot,
  resolveRoomDisplayColor,
  sortSyncAppearancesBySlot,
} from "@/shared/roomPlayerColors.js";
import {
  DEFAULT_BUILDING,
  DEFAULT_FIGHTER,
  normalizeDisplayColor,
  type DisplayColorId,
} from "./skins.js";

/** roomCode → slotId → личный цвет в матче (для пуль/эффектов у соперника). */
const slotDisplayColorsByRoom = new Map<string, Map<string, DisplayColorId>>();

type ClientCtx = {
  roomCode: string;
  userId: string;
  slotId: string;
};

const roomClients = new Map<string, Set<WebSocket>>();
const clientCtx = new WeakMap<WebSocket, ClientCtx>();

const CHAT_MAX_LEN = 200;
const CHAT_HISTORY_MAX = 10;

type ChatHistoryEntry = {
  slotId: string;
  name: string;
  text: string;
  sentAt: number;
};

const roomChatHistory = new Map<string, ChatHistoryEntry[]>();

export function clearRoomChatHistory(roomCode: string): void {
  roomChatHistory.delete(roomCode.toUpperCase());
}

function appendRoomChatHistory(
  roomCode: string,
  entry: ChatHistoryEntry
): void {
  const key = roomCode.toUpperCase();
  let arr = roomChatHistory.get(key);
  if (!arr) {
    arr = [];
    roomChatHistory.set(key, arr);
  }
  arr.push(entry);
  if (arr.length > CHAT_HISTORY_MAX) {
    arr.splice(0, arr.length - CHAT_HISTORY_MAX);
  }
}

function roomChatHistorySnapshot(roomCode: string): ChatHistoryEntry[] {
  const arr = roomChatHistory.get(roomCode.toUpperCase());
  return arr ? [...arr] : [];
}

function profileDisplayNameRaw(userId: string): string {
  return getProfile(userId)?.displayName?.trim().slice(0, 32) ?? "";
}

function chatAuthorLabel(userId: string, slotId: string): string {
  const raw = profileDisplayNameRaw(userId);
  if (raw) return raw;
  return `Игрок ${slotIndexFromId(slotId) + 1}`;
}

function send(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function slotColorsForRoom(roomCode: string): Map<string, DisplayColorId> {
  const key = roomCode.toUpperCase();
  let m = slotDisplayColorsByRoom.get(key);
  if (!m) {
    m = new Map();
    slotDisplayColorsByRoom.set(key, m);
  }
  return m;
}

function appearancesForRoom(room: Room): SyncAppearance[] {
  const colors = slotColorsForRoom(room.code);
  const assigned = new Map<string, DisplayColorId>();
  const players = room.players.filter(
    (p): p is typeof p & { slotId: string } => Boolean(p.slotId)
  );

  return sortSyncAppearancesBySlot(players).map((p) => {
    const profile = getProfile(p.userId);
    const requested = preferredDisplayColorForSlot(
      p.slotId,
      colors.get(p.slotId) ?? null,
      profile?.displayColor ?? null
    );
    const displayColor = resolveRoomDisplayColor(
      p.slotId,
      requested,
      assigned
    );
    assigned.set(p.slotId, displayColor);
    colors.set(p.slotId, displayColor);

    return {
      slotId: p.slotId,
      fighter: profile?.fighter ?? DEFAULT_FIGHTER,
      building: profile?.building ?? DEFAULT_BUILDING,
      displayColor,
      displayName: profileDisplayNameRaw(p.userId),
    };
  });
}

export function broadcastGameReset(
  roomCode: string,
  game: RoomGameState,
  room: Room,
  options?: { countdown?: boolean }
): void {
  broadcastAll(roomCode.toUpperCase(), {
    type: "game_reset",
    mapId: game.mapId,
    cells: game.cells.map((c) => ({ ...c })),
    appearances: appearancesForRoom(room),
    serverTime: Date.now(),
    countdown: options?.countdown === true,
  });
}

export function broadcastCells(
  roomCode: string,
  cells: RoomGameState["cells"]
): void {
  broadcastAll(roomCode.toUpperCase(), {
    type: "cells",
    cells: cells.map((c) => ({ ...c })),
    serverTime: Date.now(),
  });
}

export function broadcastRoomSettings(
  roomCode: string,
  randomMapOnStart: boolean
): void {
  broadcastAll(roomCode.toUpperCase(), {
    type: "room_settings",
    randomMapOnStart,
  });
}

function broadcastAll(roomCode: string, msg: WsServerMessage): void {
  const set = roomClients.get(roomCode.toUpperCase());
  if (!set) return;
  const raw = JSON.stringify(msg);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(raw);
  }
}

let collisionHandlerRegistered = false;

export function attachRoomWebSocket(server: HttpServer): void {
  if (!collisionHandlerRegistered) {
    collisionHandlerRegistered = true;
    setProjectileCollisionHandler((roomCode, destroyed, explosions) => {
      broadcastAll(roomCode, {
        type: "projectile_collision",
        destroyed,
        explosions,
      });
    });
  }

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const match = url.pathname.match(/^\/ws\/room\/([A-Za-z0-9]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const code = url.pathname.split("/").pop()!.toUpperCase();

    ws.on("message", (data) => {
      const raw = typeof data === "string" ? data : data.toString("utf8");
      const msg = parseWsMessage(raw);
      if (!msg) return;

      if (msg.type === "join") {
        handleJoin(ws, code, msg.userId);
        return;
      }

      const ctx = clientCtx.get(ws);
      if (!ctx) {
        send(ws, { type: "error", message: "Сначала отправьте join" });
        return;
      }

      const room = getRoom(ctx.roomCode);
      const game = room ? ensureGameForRoom(room) : getGameForRoom(ctx.roomCode);
      if (!room || room.status !== "playing" || !game) {
        send(ws, { type: "error", message: "Игра не активна" });
        return;
      }

      if (msg.type === "attack") {
        const profile = getProfile(ctx.userId);
        const fighter = profile?.fighter ?? DEFAULT_FIGHTER;
        processAttack(
          ctx.roomCode,
          game,
          ctx.slotId,
          fighter,
          msg.fromIndices,
          msg.toIndex,
          (launch) => {
            broadcastAll(ctx.roomCode, {
              type: "attack_launch",
              ...launch,
            });
          },
          (cells) => {
            broadcastAll(ctx.roomCode, {
              type: "cells",
              cells,
              serverTime: Date.now(),
            });
          },
          (fromIndex, keepToIndex) => {
            broadcastAll(ctx.roomCode, {
              type: "pending_tail_strip",
              fromIndex,
              keepToIndex,
            });
          }
        );
        return;
      }

      if (msg.type === "cancel_pending") {
        cancelPendingFromSource(ctx.roomCode, msg.fromIndex);
        broadcastAll(ctx.roomCode, {
          type: "pending_cancelled",
          fromIndex: msg.fromIndex,
        });
        return;
      }

      if (msg.type === "appearance") {
        const colors = slotColorsForRoom(ctx.roomCode);
        const requested = normalizeDisplayColor(msg.displayColor);
        let displayColor: DisplayColorId | undefined;
        if (requested) {
          displayColor = resolveRoomDisplayColor(
            ctx.slotId,
            requested,
            colors
          );
          colors.set(ctx.slotId, displayColor);
        }
        if (typeof msg.displayName === "string") {
          updateProfile(ctx.userId, {
            displayName: msg.displayName.trim().slice(0, 32),
          });
        }
        const displayName = profileDisplayNameRaw(ctx.userId);
        broadcastAll(ctx.roomCode, {
          type: "appearance",
          slotId: ctx.slotId,
          fighter: msg.fighter,
          building: msg.building,
          ...(displayColor ? { displayColor } : {}),
          displayName,
        });
        return;
      }

      if (msg.type === "chat") {
        const text =
          typeof msg.text === "string"
            ? msg.text.trim().slice(0, CHAT_MAX_LEN)
            : "";
        if (!text) return;
        const sentAt = Date.now();
        const chatPayload = {
          slotId: ctx.slotId,
          name: chatAuthorLabel(ctx.userId, ctx.slotId),
          text,
          sentAt,
        };
        appendRoomChatHistory(ctx.roomCode, chatPayload);
        broadcastAll(ctx.roomCode, {
          type: "chat",
          ...chatPayload,
        });
        return;
      }
    });

    ws.on("close", () => {
      const ctx = clientCtx.get(ws);
      if (!ctx) return;
      const set = roomClients.get(ctx.roomCode);
      set?.delete(ws);
    });
  });
}

function handleJoin(ws: WebSocket, roomCode: string, userId: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    send(ws, { type: "error", message: "Комната не найдена" });
    ws.close();
    return;
  }
  if (room.status !== "playing") {
    send(ws, { type: "error", message: "Игра ещё не началась" });
    ws.close();
    return;
  }

  const player = room.players.find((p) => p.userId === userId);
  if (!player?.slotId) {
    send(ws, { type: "error", message: "Вы не в этой комнате" });
    ws.close();
    return;
  }

  const code = room.code.toUpperCase();
  let set = roomClients.get(code);
  if (!set) {
    set = new Set();
    roomClients.set(code, set);
  }
  set.add(ws);
  clientCtx.set(ws, {
    roomCode: code,
    userId,
    slotId: player.slotId,
  });

  const game = ensureGameForRoom(room);
  if (!game) {
    send(ws, { type: "error", message: "Нет состояния игры" });
    return;
  }

  const appearances = appearancesForRoom(room);
  send(ws, {
    type: "snapshot",
    mapId: game.mapId,
    cells: game.cells.map((c) => ({ ...c })),
    appearances,
    serverTime: Date.now(),
    randomMapOnStart: room.randomMapOnStart,
  });
  const hist = roomChatHistorySnapshot(code);
  if (hist.length > 0) {
    send(ws, { type: "chat_history", messages: hist });
  }
  broadcastAll(code, { type: "appearances", players: appearances });
}
