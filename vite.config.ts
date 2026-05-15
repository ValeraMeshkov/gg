import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const viteDir = path.dirname(fileURLToPath(import.meta.url));
const writeDotLayoutScript = path.join(viteDir, "scripts/write-dot-layout.mjs");

function dotLayoutApiPlugin(): Plugin {
  return {
    name: "dot-layout-api",
    configureServer(server) {
      server.middlewares.use("/api/dot-layout/apply", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const child = spawnSync(
              process.execPath,
              [writeDotLayoutScript],
              { input: body, encoding: "utf8" },
            );
            if (child.status !== 0) {
              throw new Error(child.stderr || child.stdout || "write-dot-layout failed");
            }
            const filePath = child.stdout.trim().replace(/^Записано:\s*/, "");
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, filePath }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        });
        req.on("error", () => {
          res.statusCode = 500;
          res.end();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dotLayoutApiPlugin()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },
});
