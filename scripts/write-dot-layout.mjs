/**
 * Записывает dotX/dotY и hiddenSpots в src/game/maps/world/generated/{mapId}.ts
 * POST body / stdin JSON: { mapId, dots: { "AR": { dotX, dotY }, ... }, hiddenSpots: number[] }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const generatedDir = path.join(root, "src/game/maps/world/generated");

function updateTerritoryDots(src, territoryId, dotX, dotY) {
  const idPattern = `id: "${territoryId}"`;
  const start = src.indexOf(idPattern);
  if (start < 0) {
    throw new Error(`Территория ${territoryId} не найдена в файле`);
  }
  const slice = src.slice(start);
  const endRel = slice.search(/\n    \},/);
  const end = endRel < 0 ? src.length : start + endRel;
  const block = src.slice(start, end);
  let next = block.replace(/dotX:\s*[-\d.]+/, `dotX: ${dotX}`);
  next = next.replace(/dotY:\s*[-\d.]+/, `dotY: ${dotY}`);
  return src.slice(0, start) + next + src.slice(end);
}

function updateHiddenSpots(src, hiddenSpots) {
  const sorted = [...hiddenSpots].sort((a, b) => a - b);
  const value =
    sorted.length > 0 ? `[${sorted.join(", ")}]` : "[]";
  if (src.includes("hiddenSpots:")) {
    return src.replace(/hiddenSpots:\s*\[[^\]]*\]/, `hiddenSpots: ${value}`);
  }
  return src.replace(
    /viewBox:\s*\{[\s\S]*?\},/,
    (m) => `${m}\n  hiddenSpots: ${value},`,
  );
}

/**
 * @param {{ mapId: string, dots: Record<string, { dotX: number, dotY: number }>, hiddenSpots?: number[] }} payload
 */
export function applyDotLayoutPayload(payload) {
  const { mapId, dots, hiddenSpots = [] } = payload;
  if (!mapId || typeof mapId !== "string") {
    throw new Error("mapId обязателен");
  }
  const filePath = path.join(generatedDir, `${mapId}.ts`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Нет файла карты: ${filePath}`);
  }

  let src = fs.readFileSync(filePath, "utf8");
  for (const [territoryId, coords] of Object.entries(dots ?? {})) {
    src = updateTerritoryDots(
      src,
      territoryId,
      coords.dotX,
      coords.dotY,
    );
  }
  src = updateHiddenSpots(
    src,
    (hiddenSpots ?? []).map(Number).filter((n) => n > 0),
  );
  fs.writeFileSync(filePath, src, "utf8");
  return { filePath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const inputPath = process.argv[2];
  const raw = inputPath
    ? fs.readFileSync(path.resolve(inputPath), "utf8")
    : fs.readFileSync(0, "utf8");
  const payload = JSON.parse(raw);
  const result = applyDotLayoutPayload(payload);
  console.log("Записано:", result.filePath);
}
