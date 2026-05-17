/**
 * Пишет buildingSpinSheetUrls.gen.ts с ?url-импортами для Vite.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(
  root,
  "src/assets/buildings/spin-sheets/manifest.json"
);
const outPath = path.join(
  root,
  "src/components/map/buildingGlb/spin/buildingSpinSheetUrls.gen.ts"
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entries = Object.entries(manifest.sheets ?? {});

const lines = [
  "/** Сгенерировано npm run glb:bake-spin — не редактировать вручную. */",
  "",
];

const varByGlb = [];
for (const [glbFile, pngFile] of entries) {
  const base = glbFile.replace(/\.glb$/i, "").replace(/[^a-z0-9]+/gi, "_");
  const varName = `spin_${base}`;
  lines.push(
    `import ${varName} from "@/assets/buildings/spin-sheets/${pngFile}?url";`
  );
  varByGlb.push(`  "${glbFile}": ${varName},`);
}

lines.push("");
lines.push("export const SPIN_SHEET_URL_BY_GLB_FILE: Record<string, string> = {");
lines.push(...varByGlb);
lines.push("};");
lines.push("");

fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Записано: ${path.relative(root, outPath)} (${entries.length} листов)`);
