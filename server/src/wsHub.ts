import type { Server as HttpServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { SyncAppearance, WsServerMessage } from "../../shared/wsProtocol.js";
import { parseWsMessage } from "../../shared/wsProtocol.js";
import { getProfile } from "./db.js";
import { ensureGameForRoom, getGameForRoom, type RoomGameState } from "./gameState.js";
import {
  cancelPendingFromSource,
  processAttack,
  setProjectileCollisionHandler,
} from "./roomAttack.js";
import { getRoom, type Room } from "./rooms.js";
import { DEFAULT_BUILDING, DEFAULT_FIGHTER } from "./skins.js";

type ClientCtx = {
  roomCode: string;
  userId: string;
  slotId: string;
};

const roomClients = new Map<string, Set<WebSocket>>();
const clientCtx = new WeakMap<WebSocket, ClientCtx>();

function send(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function appearancesForRoom(room: Room): SyncAppearance[] {
  return room.players
    .filter((p): p is typeof p & { slotId: string } => Boolean(p.slotId))
    .map((p) => {
      const profile = getProfile(p.userId);
      return {
        slotId: p.slotId,
        fighter: profile?.fighter ?? DEFAULT_FIGHTER,
        building: profile?.building ?? DEFAULT_BUILDING,
      };
    });
}

export function broadcastGameReset(
  roomCode: string,
  game: RoomGameState,
  room: Room
): void {
  broadcastAll(roomCode.toUpperCase(), {
    type: "game_reset",
    mapId: game.mapId,
    cells: game.cells.map((c) => ({ ...c })),
    appearances: appearancesForRoom(room),
    serverTime: Date.now(),
    countdown: true,
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
    setProjectileCollisionHandler((roomCode, destroyed) => {
      broadcastAll(roomCode, { type: "projectile_collision", destroyed });
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
        processAttack(
          ctx.roomCode,
          game,
          ctx.slotId,
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
          }
        );
        return;
      }

      if (msg.type === "cancel_pending") {
        cancelPendingFromSource(ctx.roomCode, msg.fromIndex);
        return;
      }

      if (msg.type === "appearance") {
        broadcastAll(ctx.roomCode, {
          type: "appearance",
          slotId: ctx.slotId,
          fighter: msg.fighter,
          building: msg.building,
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
  });
  broadcastAll(code, { type: "appearances", players: appearances });
}
