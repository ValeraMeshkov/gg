/**
 * Запекает PNG-спрайты вращения для карты (см. buildingSpinSheetConstants.ts):
 * 256 кадров, 160px/кадр, суперсэмпл 2×, ~11 с на оборот.
 *
 *   npm run glb:bake-spin              — все здания из каталога
 *   npm run glb:bake-spin-one -- tower.glb  — один GLB
 *
 * Vite на 5199 (или VITE_BAKE_PORT=5174 если dev уже запущен).
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.VITE_BAKE_PORT || 5199);
const origin = `http://localhost:${port}`;
const onlyEq = process.argv.find((a) => a.startsWith("--only="));
const onlyIdx = process.argv.indexOf("--only");
const onlyGlb =
  onlyEq?.slice("--only=".length) ??
  (onlyIdx >= 0 ? process.argv[onlyIdx + 1] : undefined);
const bakeUrl = onlyGlb
  ? `${origin}/?bakeSpin=1&only=${encodeURIComponent(onlyGlb)}`
  : `${origin}/?bakeSpin=1`;

function waitForServer(url, timeoutMs = 90_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          resolve(undefined);
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Vite не ответил за ${timeoutMs}ms: ${url}`));
        return;
      }
      setTimeout(tick, 400);
    };
    tick();
  });
}

function isServerUp() {
  return fetch(origin)
    .then((r) => r.ok)
    .catch(() => false);
}

async function main() {
  const viteBin = path.join(root, "node_modules/vite/bin/vite.js");
  let child = null;

  try {
    const alreadyUp = await isServerUp();
    if (!alreadyUp) {
      child = spawn(
        process.execPath,
        [viteBin, "--port", String(port), "--strictPort"],
        {
          cwd: root,
          stdio: "inherit",
        }
      );
      await waitForServer(origin);
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error("[page]", msg.text());
      }
    });
    await page.goto(bakeUrl, { waitUntil: "networkidle", timeout: 180_000 });

    const onlyGlbFile = onlyGlb || null;
    const result = await page.evaluate(async (onlyFile) => {
      if (!window.__bakeBuildingSpinSheets) {
        throw new Error("__bakeBuildingSpinSheets не найден");
      }
      return window.__bakeBuildingSpinSheets(onlyFile ?? undefined);
    }, onlyGlbFile);

    await browser.close();

    if (!result.ok) {
      throw new Error("Запекание завершилось с ошибкой");
    }

    const manifestPath = path.join(
      root,
      "src/assets/buildings/spin-sheets/manifest.json"
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const count = Object.keys(manifest.sheets ?? {}).length;
    spawnSync(
      process.execPath,
      [path.join(root, "scripts/write-building-spin-sheet-urls.mjs")],
      { cwd: root, stdio: "inherit" }
    );
    console.log(`Готово: ${count} спрайт-листов → src/assets/buildings/spin-sheets/`);
  } finally {
    if (child) {
      child.kill("SIGTERM");
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
