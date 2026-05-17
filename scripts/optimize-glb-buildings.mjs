/**
 * Сжимает GLB зданий в src/assets/buildings/.
 * Исходники (до сжатия) — положить в src/assets/buildings-source/ (не в git).
 *
 *   npm run glb:optimize
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "src/assets");
/** Оптимизированные модели для игры */
const modelsDir = path.join(assetsDir, "buildings");
/** Сырые GLB с маркетплейса — только для первого прогона optimize */
const sourceDir = path.join(assetsDir, "buildings-source");

/** Имена файлов в buildings/ (см. buildingGlbCatalog.ts) */
const BUILDING_GLBS = [
  "tower.glb",
  "tower-alt.glb",
  "watchtower.glb",
  "signpost.glb",
  "castle.glb",
  "castle-alt.glb",
  "house.glb",
  "crystal-tree.glb",
  "poison-bottle.glb",
  "skull.glb",
  "skull-potion.glb",
  "slime.glb",
  "shark.glb",
  "banner.glb",
  "bomb.glb",
  "potion-bottle-alt.glb",
  "undead.glb",
  "zombie.glb",
  "pixellabs-grim-reaper-3d-3011.glb",
  "planet-boy.glb",
  "planet-defective.glb",
  "planet-energy.glb",
  "planet-icon.glb",
  "planet-shield.glb",
  "planet-star.glb",
];

const TEXTURE_SIZE = 512;
const tempSuffix = ".optimizing.tmp.glb";

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function backupToSource(filePath, name) {
  if (!fs.existsSync(sourceDir)) {
    fs.mkdirSync(sourceDir, { recursive: true });
  }
  const dest = path.join(sourceDir, name);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(filePath, dest);
    console.log(`  backup → buildings-source/${name}`);
  }
}

function optimizeFile(name) {
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const output = path.join(modelsDir, name);
  const sourcePath = path.join(sourceDir, name);
  const input = fs.existsSync(sourcePath)
    ? sourcePath
    : fs.existsSync(output)
      ? output
      : null;

  if (!input) {
    console.warn(`skip (missing): buildings/${name} or buildings-source/${name}`);
    return;
  }

  const before = fs.statSync(input).size;
  if (input === output) {
    backupToSource(output, name);
  }

  const tempOut = path.join(modelsDir, `${name}${tempSuffix}`);
  const args = [
    "@gltf-transform/cli",
    "optimize",
    input,
    tempOut,
    "--texture-compress",
    "webp",
    "--texture-size",
    String(TEXTURE_SIZE),
    "--compress",
    "meshopt",
  ];

  const run = spawnSync("npx", args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (run.status !== 0) {
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    throw new Error(`gltf-transform failed for ${name}`);
  }

  fs.renameSync(tempOut, output);
  const after = fs.statSync(output).size;
  const ratio = before > 0 ? ((1 - after / before) * 100).toFixed(1) : "0";
  console.log(`✔ ${name}: ${formatMb(before)} → ${formatMb(after)} (−${ratio}%)\n`);
}

console.log("Optimizing building GLBs in src/assets/buildings/…\n");
for (const name of BUILDING_GLBS) {
  optimizeFile(name);
}
console.log("Done.");
