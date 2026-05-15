import type { Server } from "node:http";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { startGameLoop } from "./gameLoop.js";
import { attachRoomWebSocket } from "./wsHub.js";

const port = Number(process.env.PORT ?? 3001);
const hostname = process.env.HOST ?? "0.0.0.0";
const app = createApp();

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`game-server http://${info.address}:${info.port} (ws /ws/room/:code)`);
});

if (server) {
  attachRoomWebSocket(server as Server);
}
startGameLoop();
