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
import {
  canPlayerPatchAppearance,
  canPlayerPatchFighter,
} from "./roomAccess.js";
import { getRoom, type Room } from "./rooms.js";
import { slotIndexFromId } from "@/shared/playerSlots.js";
import {
  isRoomPlaying,
  isRoomSetupPhase,
} from "@/shared/roomStatus.js";
import {
  preferredDisplayColorForSlot,
  resolveRoomDisplayColor,
  sortSyncAppearancesBySlot,
} from "@/shared/roomPlayerColors.js";
import { coerceFighterSkinId } from "@/shared/defaultFighters.js";
import { coerceBuildingSkinId } from "@/shared/skinIds.js";
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
  /** null — очередь ожидания (только просмотр). */
  slotId: string | null;
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

/** Число открытых WS-подключений к комнате (игроки на странице игры). */
export function countRoomOnlineClients(roomCode: string): number {
  return roomClients.get(roomCode.toUpperCase())?.size ?? 0;
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
    (p): p is typeof p & { slotId: string } =>
      Boolean(p.slotId) && p.inMatch !== false
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
  syncClientSlotsForRoom(room);
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

function roomStatusMessage(room: Room): WsServerMessage {
  return {
    type: "room_status",
    status: room.status,
    mapId: room.mapId,
    randomMapOnStart: room.randomMapOnStart,
    hostUserId: room.hostUserId,
    players: room.players.map((p) => ({
      userId: p.userId,
      ...(p.slotId ? { slotId: p.slotId } : {}),
      inMatch: p.inMatch !== false,
      ready: p.ready === true,
      joinedDuringMatch: p.joinedDuringMatch === true,
    })),
    serverTime: Date.now(),
  };
}

/** После старта партии обновить slotId у уже подключённых WS (без перезагрузки страницы). */
function syncClientSlotsForRoom(room: Room): void {
  const set = roomClients.get(room.code.toUpperCase());
  if (!set) return;
  for (const ws of set) {
    const ctx = clientCtx.get(ws);
    if (!ctx) continue;
    const player = room.players.find((p) => p.userId === ctx.userId);
    const inMatch = player ? player.inMatch !== false : false;
    ctx.slotId =
      isRoomPlaying(room.status) && inMatch && player?.slotId
        ? player.slotId
        : null;
  }
}

export function broadcastRoomStatus(room: Room): void {
  syncClientSlotsForRoom(room);
  broadcastAll(room.code.toUpperCase(), roomStatusMessage(room));
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
      if (!room || !isRoomPlaying(room.status) || !game) {
        send(ws, { type: "error", message: "Игра не активна" });
        return;
      }

      if (!ctx.slotId) {
        if (msg.type === "appearance") {
          if (!canPlayerPatchAppearance(room, ctx.userId)) {
            send(ws, {
              type: "error",
              message: "Нельзя менять внешность сейчас",
            });
            return;
          }
          const color = normalizeDisplayColor(msg.displayColor);
          updateProfile(ctx.userId, {
            fighter: coerceFighterSkinId(msg.fighter),
            building: coerceBuildingSkinId(msg.building),
            ...(color ? { displayColor: color } : {}),
            ...(typeof msg.displayName === "string"
              ? { displayName: msg.displayName.trim().slice(0, 32) }
              : {}),
          });
          return;
        }
        send(ws, { type: "error", message: "Вы в очереди ожидания" });
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
        const fighter = coerceFighterSkinId(msg.fighter);
        const building = coerceBuildingSkinId(msg.building);
        if (!canPlayerPatchAppearance(room, ctx.userId)) {
          if (!canPlayerPatchFighter(room, ctx.userId)) {
            send(ws, {
              type: "error",
              message: "Нельзя менять внешность во время партии",
            });
            return;
          }
          updateProfile(ctx.userId, { fighter });
          const displayName = profileDisplayNameRaw(ctx.userId);
          const profile = getProfile(ctx.userId);
          broadcastAll(ctx.roomCode, {
            type: "appearance",
            slotId: ctx.slotId,
            fighter,
            building: profile?.building ?? DEFAULT_BUILDING,
            ...(profile?.displayColor
              ? { displayColor: profile.displayColor }
              : {}),
            displayName,
          });
          return;
        }
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
        updateProfile(ctx.userId, { fighter, building });
        const displayName = profileDisplayNameRaw(ctx.userId);
        broadcastAll(ctx.roomCode, {
          type: "appearance",
          slotId: ctx.slotId,
          fighter,
          building,
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
  const player = room.players.find((p) => p.userId === userId);
  if (!player) {
    send(ws, { type: "error", message: "Вы не в этой комнате" });
    ws.close();
    return;
  }

  const inMatch = player.inMatch !== false;
  const slotId =
    isRoomPlaying(room.status) && inMatch && player.slotId
      ? player.slotId
      : null;

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
    slotId,
  });

  if (isRoomSetupPhase(room.status)) {
    send(ws, roomStatusMessage(room));
    return;
  }

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
