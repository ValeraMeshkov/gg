import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

const app = createApp();

serve({ fetch: app.fetch, port }, () => {
  console.log(`game-server http://localhost:${port}`);
});
