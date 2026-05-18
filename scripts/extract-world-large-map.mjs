/**
 * Карта «Мир» — top-N крупнейших стран из src/world.svg.
 * Запуск: node scripts/extract-world-large-map.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAP_ID, mapIdConstExpr } from "./mapIds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "src/world.svg");
const outFile = path.join(root, "src/game/maps/world/generated/world-large.ts");

const TOP_COUNT = 40;
const WORLD_VIEW_BOX = { x: 0, y: 0, width: 2000, height: 857 };

/** Всегда на карте (Европа и крупные страны Африки, которых нет в глобальном top-30). */
const MUST_INCLUDE_CLASS = [
  "France",
  "Italy",
  "United Kingdom",
  "Turkey",
  "Angola",
  "Spain",
];
const MUST_INCLUDE_ID = ["DE", "ES", "PL", "UA", "NG", "EG", "KE", "TZ"];

/** Английские name из SVG → подписи в каталоге. */
const RU_NAMES = {
  "Russian Federation": "Россия",
  Russia: "Россия",
  Canada: "Канада",
  "United States": "США",
  China: "Китай",
  Brazil: "Бразилия",
  Australia: "Австралия",
  India: "Индия",
  Argentina: "Аргентина",
  Kazakhstan: "Казахстан",
  Algeria: "Алжир",
  "Democratic Republic of the Congo": "ДР Конго",
  "Saudi Arabia": "Саудовская Аравия",
  Mexico: "Мексика",
  Indonesia: "Индонезия",
  Sudan: "Судан",
  Libya: "Ливия",
  Iran: "Иран",
  Mongolia: "Монголия",
  Peru: "Перу",
  Chad: "Чад",
  Niger: "Нигер",
  Angola: "Ангола",
  Mali: "Мали",
  Morocco: "Марокко",
  Mozambique: "Мозамбик",
  "South Africa": "ЮАР",
  Colombia: "Колумбия",
  Ethiopia: "Эфиопия",
  Bolivia: "Боливия",
  Mauritania: "Мавритания",
  Egypt: "Египет",
  Tanzania: "Танзания",
  Nigeria: "Нигерия",
  Venezuela: "Венесуэла",
  Pakistan: "Пакистан",
  Chile: "Чили",
  Myanmar: "Мьянма",
  Afghanistan: "Афганистан",
  France: "Франция",
  Somalia: "Сомали",
  "Central African Republic": "ЦАР",
  Ukraine: "Украина",
  Madagascar: "Мадагаскар",
  Botswana: "Ботсвана",
  Kenya: "Кения",
  Spain: "Испания",
  Turkey: "Турция",
  Thailand: "Таиланд",
  Sweden: "Швеция",
  Japan: "Япония",
  Germany: "Германия",
  Poland: "Поландия",
  Italy: "Италия",
  "United Kingdom": "Великобритания",
  Norway: "Норвегия",
  Greenland: "Гренландия",
};

function parsePathElements(svg) {
  const paths = [];
  const re = /<path\s+([^>]+)\s*\/?>/gi;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const attrs = m[1];
    const id = /(?:^|\s)id="([^"]+)"/i.exec(attrs)?.[1];
    const name = /(?:^|\s)name="([^"]+)"/i.exec(attrs)?.[1];
    const cls = /(?:^|\s)class="([^"]+)"/i.exec(attrs)?.[1];
    const d = /(?:^|\s)d="([^"]+)"/i.exec(attrs)?.[1];
    if (!d) continue;
    paths.push({ id, name, class: cls, d });
  }
  return paths;
}

function pathBounds(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tokens?.length) return null;
  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const addPoint = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    cx = x;
    cy = y;
  };

  const read = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
    } else if (!cmd) {
      i++;
      continue;
    }

    const rel = cmd === cmd.toLowerCase();
    const up = cmd.toUpperCase();

    if (up === "Z") {
      addPoint(startX, startY);
      continue;
    }
    if (up === "H") {
      const x = read();
      addPoint(rel ? cx + x : x, cy);
      continue;
    }
    if (up === "V") {
      const y = read();
      addPoint(cx, rel ? cy + y : y);
      continue;
    }

    const pairs =
      up === "M" || up === "L" || up === "T"
        ? 1
        : up === "C"
          ? 3
          : up === "S" || up === "Q"
            ? 2
            : up === "A"
              ? 4
              : 1;

    let first = up === "M";
    for (let p = 0; p < pairs; p++) {
      if (i >= tokens.length || /^[a-zA-Z]$/.test(tokens[i])) break;
      const x = read();
      const y = read();
      const nx = rel ? cx + x : x;
      const ny = rel ? cy + y : y;
      if (p === pairs - 1 || up === "M" || up === "L") {
        addPoint(nx, ny);
        if (first && up === "M") {
          startX = nx;
          startY = ny;
          first = false;
        }
      }
    }
    if (up === "M") cmd = rel ? "l" : "L";
  }

  if (!Number.isFinite(minX)) return null;
  return {
    minX,
    minY,
    maxX,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
  };
}

/** Крупные страны в SVG чаще в `class`, мелкие — в `id`. */
function territoryKey(p) {
  if (p.class) return `class:${p.class}`;
  if (p.id && p.name) return `id:${p.id}`;
  if (p.name) return `name:${p.name}`;
  if (p.id) return `id:${p.id}`;
  return null;
}

function displayName(p) {
  return (
    RU_NAMES[p.class] ??
    RU_NAMES[p.name] ??
    p.name ??
    p.class ??
    p.id ??
    "?"
  );
}

function slugId(key, fallbackName) {
  const raw =
    key.startsWith("class:")
      ? key.slice(6)
      : key.startsWith("id:")
        ? key.slice(3)
        : key.startsWith("name:")
          ? key.slice(5)
          : fallbackName;
  return raw
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 24) || "territory";
}

function loadExistingDots() {
  if (!fs.existsSync(outFile)) return {};
  const src = fs.readFileSync(outFile, "utf8");
  const byId = {};
  const blockRe =
    /id:\s*"([^"]+)"[\s\S]*?(?:originalDotX:\s*([-\d.]+),[\s\S]*?originalDotY:\s*([-\d.]+),[\s\S]*?)?dotX:\s*([-\d.]+),\s*\n\s*dotY:\s*([-\d.]+)/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    byId[m[1]] = { dotX: Number(m[4]), dotY: Number(m[5]) };
  }
  return byId;
}

const svg = fs.readFileSync(svgPath, "utf8");
const allPaths = parsePathElements(svg);
const groups = new Map();

for (const p of allPaths) {
  const key = territoryKey(p);
  if (!key) continue;
  const b = pathBounds(p.d);
  if (!b) continue;

  let g = groups.get(key);
  if (!g) {
    g = {
      key,
      id: slugId(key, p.name ?? p.class ?? p.id),
      labelSource: p,
      paths: [],
      areaSum: 0,
      weightX: 0,
      weightY: 0,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    };
    groups.set(key, g);
  }
  g.paths.push(p.d);
  const pathArea = (b.maxX - b.minX) * (b.maxY - b.minY);
  g.areaSum += pathArea;
  g.weightX += b.cx * pathArea;
  g.weightY += b.cy * pathArea;
  g.minX = Math.min(g.minX, b.minX);
  g.minY = Math.min(g.minY, b.minY);
  g.maxX = Math.max(g.maxX, b.maxX);
  g.maxY = Math.max(g.maxY, b.maxY);
}

for (const g of groups.values()) {
  g.area = g.areaSum;
  g.cx = g.weightX / g.areaSum;
  g.cy = g.weightY / g.areaSum;
}

function isMustInclude(g) {
  const src = g.labelSource;
  if (src.class && MUST_INCLUDE_CLASS.includes(src.class)) return true;
  if (src.id && MUST_INCLUDE_ID.includes(src.id)) return true;
  return false;
}

const mustHave = [...groups.values()].filter(isMustInclude);
const mustKeys = new Set(mustHave.map((g) => g.key));

const byArea = [...groups.values()]
  .filter((g) => g.area > 800 && !mustKeys.has(g.key))
  .sort((a, b) => b.area - a.area);

const top = [
  ...mustHave,
  ...byArea.slice(0, Math.max(0, TOP_COUNT - mustHave.length)),
];

const usedIds = new Set();
for (const g of top) {
  let id = g.id;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${g.id}-${n++}`;
  }
  usedIds.add(id);
  g.id = id;
  g.name = displayName(g.labelSource);
}

const existingDots = loadExistingDots();
const territories = top.map((g) => {
  const prev = existingDots[g.id];
  const dotX = prev?.dotX ?? Math.round(g.cx * 10) / 10;
  const dotY = prev?.dotY ?? Math.round(g.cy * 10) / 10;
  return {
    id: g.id,
    name: g.name,
    paths: g.paths,
    originalDotX: Math.round(g.cx * 10) / 10,
    originalDotY: Math.round(g.cy * 10) / 10,
    dotX,
    dotY,
  };
});

const lines = [];
lines.push(
  `/** Карта: крупнейшие регионы + обязательная Европа/Африка из world.svg. */`,
);
lines.push(`/** Автогенерация: node scripts/extract-world-large-map.mjs */`);
lines.push(
  `import type { TerritoryMapData } from '@/game/maps/world/buildTerritoryMap'`,
);
lines.push(`import { MAP_ID } from '@/game/maps/mapIds'`);
lines.push("");
lines.push(`export const worldLargeData: TerritoryMapData = {`);
lines.push(`  continentId: ${mapIdConstExpr(MAP_ID.WORLD_LARGE)},`);
lines.push(`  name: "Мир",`);
lines.push(`  viewBox: ${JSON.stringify(WORLD_VIEW_BOX)},`);
lines.push(`  hiddenSpots: [],`);
lines.push(`  territories: [`);
for (const t of territories) {
  lines.push(`    {`);
  lines.push(`      id: ${JSON.stringify(t.id)},`);
  lines.push(`      name: ${JSON.stringify(t.name)},`);
  lines.push(`      paths: ${JSON.stringify(t.paths)},`);
  lines.push(`      originalDotX: ${t.originalDotX},`);
  lines.push(`      originalDotY: ${t.originalDotY},`);
  lines.push(`      dotX: ${t.dotX},`);
  lines.push(`      dotY: ${t.dotY},`);
  lines.push(`    },`);
}
lines.push(`  ],`);
lines.push(`};`);
lines.push("");

fs.writeFileSync(outFile, lines.join("\n"));

console.log(`OK: Мир — ${territories.length} территорий → world-large.ts`);
for (let i = 0; i < territories.length; i++) {
  const t = territories[i];
  const g = top[i];
  console.log(
    `  ${String(i + 1).padStart(2)}. ${t.name} (${t.id}) area≈${Math.round(g.area)}`,
  );
}
