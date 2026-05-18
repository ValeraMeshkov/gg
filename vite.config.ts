import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const viteDir = path.dirname(fileURLToPath(import.meta.url));
const writeDotLayoutScript = path.join(viteDir, "scripts/write-dot-layout.mjs");
const writeSpinSheetUrlsScript = path.join(
  viteDir,
  "scripts/write-building-spin-sheet-urls.mjs"
);
const spinSheetsDir = path.join(viteDir, "src/assets/buildings/spin-sheets");

/** NodeNext в shared/*.ts использует импорты с `.js`; в dev Vite резолвим их в `.ts`. */
function sharedNodeNextResolve(): Plugin {
  return {
    name: "shared-nodenext-resolve",
    enforce: "pre",
    resolveId(source, importer) {
      if (
        !importer?.includes(`${path.sep}shared${path.sep}`) ||
        !source.startsWith(".") ||
        !source.endsWith(".js")
      ) {
        return null;
      }
      const tsPath = path.join(
        path.dirname(importer),
        `${source.slice(0, -3)}.ts`
      );
      return fs.existsSync(tsPath) ? tsPath : null;
    },
  };
}

function spawnWriteScript(scriptPath: string, body: string): string {
  const child = spawnSync(process.execPath, [scriptPath], {
    input: body,
    encoding: "utf8",
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout || "write script failed");
  }
  return child.stdout.trim().replace(/^Записано:\s*/, "");
}

function buildingSpinSheetsApiPlugin(): Plugin {
  return {
    name: "building-spin-sheets-api",
    configureServer(server) {
      server.middlewares.use("/api/building-spin-sheets/save", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
              manifest?: Record<string, unknown>;
              sheets?: Array<{ glbFile: string; pngBase64: string }>;
              merge?: boolean;
            };
            if (!body.sheets?.length || !body.manifest) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "missing sheets or manifest" }));
              return;
            }

            fs.mkdirSync(spinSheetsDir, { recursive: true });
            const manifestPath = path.join(spinSheetsDir, "manifest.json");
            let manifest = body.manifest;
            if (body.merge && fs.existsSync(manifestPath)) {
              const existing = JSON.parse(
                fs.readFileSync(manifestPath, "utf8")
              ) as Record<string, unknown>;
              const existingSheets =
                (existing.sheets as Record<string, string> | undefined) ?? {};
              const nextSheets =
                (body.manifest.sheets as Record<string, string> | undefined) ??
                {};
              manifest = {
                ...existing,
                ...body.manifest,
                sheets: { ...existingSheets, ...nextSheets },
              };
            }
            fs.writeFileSync(
              manifestPath,
              `${JSON.stringify(manifest, null, 2)}\n`,
              "utf8"
            );

            const sheetFiles =
              (manifest.sheets as Record<string, string> | undefined) ?? {};
            const written: string[] = [];
            for (const sheet of body.sheets) {
              const base =
                sheetFiles[sheet.glbFile] ??
                sheet.glbFile.replace(/\.glb$/i, ".png");
              const outPath = path.join(spinSheetsDir, base);
              fs.writeFileSync(outPath, Buffer.from(sheet.pngBase64, "base64"));
              written.push(base);
            }

            spawnSync(process.execPath, [writeSpinSheetUrlsScript], {
              cwd: viteDir,
              stdio: "pipe",
            });

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, written }));
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
            const filePath = spawnWriteScript(writeDotLayoutScript, body);
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

const appBase = process.env.VITE_BASE_PATH || "/";

// https://vite.dev/config/
export default defineConfig({
  /** GitHub Pages из репо `gg`: VITE_BASE_PATH=/gg/ */
  base: appBase,
  resolve: {
    alias: {
      "@/shared": path.resolve(viteDir, "shared"),
      "@": path.resolve(viteDir, "src"),
    },
  },
  plugins: [
    sharedNodeNextResolve(),
    react(),
    dotLayoutApiPlugin(),
    buildingSpinSheetsApiPlugin(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "favicon.svg",
        "icons.svg",
        "api-config.json",
        "pwa-192.png",
        "pwa-512.png",
      ],
      manifest: {
        name: "Territory",
        short_name: "Territory",
        description: "Стратегия на карте — территории, боты, 3D-здания",
        theme_color: "#e2e8f4",
        background_color: "#e2e8f4",
        display: "standalone",
        orientation: "any",
        scope: appBase,
        start_url: appBase,
        icons: [
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff2,glb,webp,json,wasm}",
        ],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/ws/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "territory-api",
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 48,
                maxAgeSeconds: 60 * 10,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://127.0.0.1:3001",
        ws: true,
      },
    },
  },
});
