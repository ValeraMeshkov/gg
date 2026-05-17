/**
 * Извлекает регионы из src/world.svg → src/game/maps/world/generated/
 * Запуск: node scripts/extract-world-maps.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAP_ID, mapIdConstExpr } from "./mapIds.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "src/world.svg");
const outDir = path.join(root, "src/game/maps/world/generated");
const overridesDir = path.join(root, "src/game/maps/world/overrides");

/** id континента, название, территории (id / svgClass из world.svg). */
const CONTINENTS = [
  {
    continentId: MAP_ID.SOUTH_AMERICA,
    continentName: "Южная Америка",
    territories: [
      { id: "AR", name: "Аргентина", svgClass: "Argentina" },
      { id: "BO", name: "Боливия" },
      { id: "BR", name: "Бразилия" },
      { id: "CL", name: "Чили", svgClass: "Chile" },
      { id: "CO", name: "Колумбия" },
      { id: "EC", name: "Эквадор" },
      { id: "FK", name: "Фолкленды", svgClass: "Falkland Islands" },
      { id: "GF", name: "Гвиана" },
      { id: "GY", name: "Гайана" },
      { id: "PE", name: "Перу" },
      { id: "PY", name: "Парагвай" },
      { id: "SR", name: "Суринам" },
      { id: "UY", name: "Уругвай" },
      { id: "VE", name: "Венесуэла" },
    ],
  },
  {
    continentId: MAP_ID.NORTH_AMERICA,
    continentName: "Северная Америка",
    territories: [
      { id: "US", name: "США", svgClass: "United States" },
      { id: "CA", name: "Канада", svgClass: "Canada" },
      { id: "MX", name: "Мексика" },
      { id: "GL", name: "Гренландия" },
      { id: "CU", name: "Куба" },
      { id: "GT", name: "Гватемала" },
      { id: "BZ", name: "Белиз" },
      { id: "HN", name: "Гондурас" },
      { id: "SV", name: "Сальвадор" },
      { id: "NI", name: "Никарагуа" },
      { id: "CR", name: "Коста-Рика" },
      { id: "PA", name: "Панама" },
      { id: "JM", name: "Ямайка" },
      { id: "HT", name: "Гаити" },
      { id: "DO", name: "Доминикана" },
    ],
  },
  {
    continentId: MAP_ID.EUROPE,
    continentName: "Европа",
    territories: [
      { id: "IS", name: "Исландия" },
      { id: "NO", name: "Норвегия", svgClass: "Norway" },
      { id: "SE", name: "Швеция" },
      { id: "FI", name: "Финляндия" },
      { id: "EE", name: "Эстония" },
      { id: "LV", name: "Латвия" },
      { id: "LT", name: "Литва" },
      { id: "BY", name: "Беларусь" },
      { id: "DK", name: "Дания", svgClass: "Denmark" },
      { id: "GB", name: "Великобритания", svgClass: "United Kingdom" },
      { id: "IE", name: "Ирландия" },
      { id: "NL", name: "Нидерланды" },
      { id: "BE", name: "Бельгия" },
      { id: "LU", name: "Люксембург" },
      { id: "DE", name: "Германия" },
      { id: "PL", name: "Польша" },
      { id: "CZ", name: "Чехия" },
      { id: "SK", name: "Словакия" },
      { id: "AT", name: "Австрия" },
      { id: "CH", name: "Швейцария" },
      { id: "HU", name: "Венгрия" },
      { id: "UA", name: "Украина" },
      { id: "MD", name: "Молдова" },
      { id: "FR", name: "Франция", svgClass: "France" },
      { id: "RO", name: "Румыния" },
      { id: "SI", name: "Словения" },
      { id: "HR", name: "Хорватия" },
      { id: "BA", name: "Босния и Герцеговина" },
      { id: "RS", name: "Сербия" },
      { id: "ME", name: "Черногория" },
      { id: "XK", name: "Косово" },
      { id: "MK", name: "Северная Македония" },
      { id: "AL", name: "Албания" },
      { id: "BG", name: "Болгария" },
      { id: "GR", name: "Греция", svgClass: "Greece" },
      { id: "IT", name: "Италия", svgClass: "Italy" },
      { id: "ES", name: "Испания" },
      { id: "PT", name: "Португалия" },
      { id: "CY", name: "Кипр", svgClass: "Cyprus" },
      { id: "MT", name: "Мальта", svgClass: "Malta" },
      { id: "TR", name: "Турция", svgClass: "Turkey" },
    ],
  },
  {
    continentId: MAP_ID.AFRICA,
    continentName: "Африка",
    territories: [
      // Север
      { id: "MA", name: "Марокко" },
      { id: "DZ", name: "Алжир" },
      { id: "TN", name: "Тунис" },
      { id: "LY", name: "Ливия" },
      { id: "EG", name: "Египет" },
      { id: "EH", name: "Западная Сахара" },
      { id: "SD", name: "Судан" },
      { id: "SS", name: "Южный Судан" },
      // Запад
      { id: "MR", name: "Мавритания" },
      { id: "SN", name: "Сенегал" },
      { id: "GM", name: "Гамбия" },
      { id: "GW", name: "Гвинея-Бисау" },
      { id: "GN", name: "Гвинея" },
      { id: "SL", name: "Сьерра-Леоне" },
      { id: "LR", name: "Либерия" },
      { id: "CI", name: "Кот-д'Ивуар" },
      { id: "ML", name: "Мали" },
      { id: "BF", name: "Буркина-Фасо" },
      { id: "NE", name: "Нигер" },
      { id: "NG", name: "Нигерия" },
      { id: "GH", name: "Гана" },
      { id: "TG", name: "Того" },
      { id: "BJ", name: "Бенин" },
      { id: "CV", name: "Кабо-Верде", svgClass: "Cape Verde" },
      // Центр
      { id: "TD", name: "Чад" },
      { id: "CM", name: "Камерун" },
      { id: "CF", name: "ЦАР" },
      { id: "GQ", name: "Экваториальная Гвинея" },
      { id: "GA", name: "Габон" },
      { id: "CG", name: "Республика Конго" },
      { id: "CD", name: "ДР Конго" },
      { id: "AO", name: "Ангола", svgClass: "Angola" },
      { id: "ST", name: "Сан-Томе и Принсипи", svgClass: "São Tomé and Principe" },
      // Восток
      { id: "ER", name: "Эритрея" },
      { id: "DJ", name: "Джибути" },
      { id: "ET", name: "Эфиопия" },
      { id: "SO", name: "Сомали" },
      { id: "KE", name: "Кения" },
      { id: "UG", name: "Уганда" },
      { id: "RW", name: "Руанда" },
      { id: "BI", name: "Бурунди" },
      { id: "TZ", name: "Танзания" },
      { id: "MW", name: "Малави" },
      { id: "MZ", name: "Мозамбик" },
      { id: "MG", name: "Мадагаскар" },
      { id: "KM", name: "Коморы", svgClass: "Comoros" },
      { id: "SC", name: "Сейшелы", svgClass: "Seychelles" },
      { id: "MU", name: "Маврикий", svgClass: "Mauritius" },
      { id: "YT", name: "Майотта" },
      { id: "RE", name: "Реюньон" },
      // Юг
      { id: "ZA", name: "ЮАР" },
      { id: "LS", name: "Лесото" },
      { id: "SZ", name: "Эсватини" },
      { id: "BW", name: "Ботсвана" },
      { id: "NA", name: "Намибия" },
      { id: "ZM", name: "Замбия" },
      { id: "ZW", name: "Зимбабве" },
    ],
  },
  {
    continentId: MAP_ID.ASIA,
    continentName: "Азия",
    territories: [
      // Север и Центральная Азия
      { id: "RU", name: "Россия", svgClass: "Russian Federation" },
      { id: "MN", name: "Монголия" },
      { id: "KZ", name: "Казахстан" },
      { id: "UZ", name: "Узбекистан" },
      { id: "TM", name: "Туркменистан" },
      { id: "TJ", name: "Таджикистан" },
      { id: "KG", name: "Кыргызстан" },
      { id: "AF", name: "Афганистан" },
      // Южная Азия
      { id: "PK", name: "Пакистан" },
      { id: "IN", name: "Индия" },
      { id: "BD", name: "Бангладеш" },
      { id: "NP", name: "Непал" },
      { id: "BT", name: "Бутан" },
      { id: "LK", name: "Шри-Ланка" },
      { id: "MV", name: "Мальдивы" },
      // Ближний Восток
      { id: "IR", name: "Иран" },
      { id: "IQ", name: "Ирак" },
      { id: "TR", name: "Турция", svgClass: "Turkey" },
      { id: "GE", name: "Грузия" },
      { id: "AM", name: "Армения" },
      { id: "AZ", name: "Азербайджан", svgClass: "Azerbaijan" },
      { id: "SA", name: "Саудовская Аравия" },
      { id: "YE", name: "Йемен" },
      { id: "OM", name: "Оман", svgClass: "Oman" },
      { id: "AE", name: "ОАЭ" },
      { id: "QA", name: "Катар" },
      { id: "KW", name: "Кувейт" },
      { id: "BH", name: "Бахрейн" },
      { id: "IL", name: "Израиль" },
      { id: "PS", name: "Палестина" },
      { id: "JO", name: "Иордания" },
      { id: "LB", name: "Ливан" },
      { id: "SY", name: "Сирия" },
      // Восточная Азия
      { id: "CN", name: "Китай", svgClass: "China" },
      { id: "KP", name: "КНДР" },
      { id: "KR", name: "Южная Корея" },
      { id: "JP", name: "Япония", svgClass: "Japan" },
      { id: "TW", name: "Тайвань" },
      // Юго-Восточная Азия
      { id: "MM", name: "Мьянма" },
      { id: "TH", name: "Таиланд" },
      { id: "LA", name: "Лаос" },
      { id: "KH", name: "Камбоджа" },
      { id: "VN", name: "Вьетнам" },
      { id: "MY", name: "Малайзия", svgClass: "Malaysia" },
      { id: "BN", name: "Бруней" },
      { id: "ID", name: "Индонезия", svgClass: "Indonesia" },
      { id: "PH", name: "Филиппины", svgClass: "Philippines" },
    ],
  },
  {
    continentId: MAP_ID.OCEANIA,
    continentName: "Океания",
    // Деление материка (bbox ~1603–1829 × 570–752): WA слева ~⅓,
    // NT/SA в центре, QLD/NSW/VIC на востоке — как на админ. карте.
    territories: [
      {
        id: "AU-WA",
        name: "Западная Австралия",
        australiaPart: "mainland",
        clip: { x: 1603, y: 570, width: 73, height: 182 },
        dotX: 1640,
        dotY: 661,
      },
      {
        id: "AU-NT",
        name: "Северная территория",
        australiaPart: "mainland",
        clip: { x: 1676, y: 570, width: 80, height: 68 },
        dotX: 1716,
        dotY: 604,
      },
      {
        id: "AU-SA",
        name: "Южная Австралия",
        australiaPart: "mainland",
        clip: { x: 1676, y: 638, width: 80, height: 114 },
        dotX: 1716,
        dotY: 695,
      },
      {
        id: "AU-QLD",
        name: "Квинсленд",
        australiaPart: "mainland",
        clip: { x: 1756, y: 570, width: 73, height: 108 },
        dotX: 1793,
        dotY: 624,
      },
      {
        id: "AU-NSW",
        name: "Новый Южный Уэльс и Виктория",
        australiaPart: "mainland",
        clip: { x: 1756, y: 678, width: 73, height: 74 },
        dotX: 1792,
        dotY: 715,
      },
      { id: "AU-TAS", name: "Тасмания", australiaPart: "tasmania" },
      { id: "ID", name: "Индонезия", svgClass: "Indonesia" },
      { id: "PG", name: "Папуа — Новая Гвинея", svgClass: "Papua New Guinea" },
      { id: "NZ", name: "Новая Зеландия", svgClass: "New Zealand" },
    ],
  },
];

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

/** Bbox и центр по командам path (M/L/l/H/V и т.д.), без «псевдо-пар» из relative. */
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
      const nx = rel ? cx + x : x;
      addPoint(nx, cy);
      continue;
    }
    if (up === "V") {
      const y = read();
      const ny = rel ? cy + y : y;
      addPoint(cx, ny);
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

function mergeBounds(list) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const b of list) {
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  const pad = 24;
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}

function getAustraliaPathSets(allPaths) {
  const matched = allPaths.filter((p) => p.class === "Australia");
  const mainland = [];
  const tasmania = [];
  for (const p of matched) {
    const b = pathBounds(p.d);
    if (!b) continue;
    if (b.maxX - b.minX > 100) mainland.push(p.d);
    else tasmania.push(p.d);
  }
  return { mainland, tasmania };
}

function collectAustraliaTerritory(allPaths, ref) {
  const { mainland, tasmania } = getAustraliaPathSets(allPaths);
  const paths = ref.australiaPart === "tasmania" ? tasmania : mainland;
  if (paths.length === 0) {
    console.warn(`  ⚠ нет path для ${ref.id} (${ref.name})`);
    return null;
  }
  const bounds = [];
  for (const d of paths) {
    const b = pathBounds(d);
    if (b) bounds.push(b);
  }
  const clip = ref.clip;
  const dotX =
    ref.dotX ??
    (clip
      ? Math.round((clip.x + clip.width / 2) * 10) / 10
      : bounds.reduce((s, b) => s + b.cx, 0) / bounds.length);
  const dotY =
    ref.dotY ??
    (clip
      ? Math.round((clip.y + clip.height / 2) * 10) / 10
      : bounds.reduce((s, b) => s + b.cy, 0) / bounds.length);
  const areaBounds = clip
    ? {
        minX: clip.x,
        minY: clip.y,
        maxX: clip.x + clip.width,
        maxY: clip.y + clip.height,
        cx: dotX,
        cy: dotY,
      }
    : bounds[0];
  return {
    id: ref.id,
    name: ref.name,
    paths,
    clip: clip ?? undefined,
    dotX,
    dotY,
    bounds: clip ? [areaBounds] : bounds,
  };
}

function collectTerritory(allPaths, ref) {
  if (ref.australiaPart) {
    return collectAustraliaTerritory(allPaths, ref);
  }
  const matched = allPaths.filter((p) => {
    if (ref.id && p.id === ref.id) return true;
    if (ref.svgClass && p.class === ref.svgClass) return true;
    if (ref.matchName && p.name === ref.matchName) return true;
    return false;
  });
  if (matched.length === 0) {
    console.warn(`  ⚠ нет path для ${ref.id} (${ref.name})`);
    return null;
  }
  const bounds = [];
  const pathDs = [];
  for (const p of matched) {
    pathDs.push(p.d);
    const b = pathBounds(p.d);
    if (b) bounds.push(b);
  }
  if (bounds.length === 0) return null;
  const cx = bounds.reduce((s, b) => s + b.cx, 0) / bounds.length;
  const cy = bounds.reduce((s, b) => s + b.cy, 0) / bounds.length;
  return {
    id: ref.id,
    name: ref.name,
    paths: pathDs,
    dotX: Math.round(cx * 10) / 10,
    dotY: Math.round(cy * 10) / 10,
    bounds,
  };
}

/** @deprecated Старые dx/dy из overrides/ — один раз при extract. */
function loadLegacyDotShifts(mapId) {
  const filePath = path.join(overridesDir, `${mapId}.ts`);
  if (!fs.existsSync(filePath)) return {};
  const src = fs.readFileSync(filePath, "utf8");
  const shifts = {};
  const re = /(\d+):\s*\{\s*dx:\s*([-\d.]+),\s*dy:\s*([-\d.]+)\s*\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    shifts[Number(m[1])] = { dx: Number(m[2]), dy: Number(m[3]) };
  }
  return shifts;
}

function loadLegacyHiddenSpots(mapId) {
  const filePath = path.join(overridesDir, `${mapId}.ts`);
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, "utf8");
  const m = src.match(
    /HIDDEN_SPOTS[^[]*\[([^\]]*)\]/,
  );
  if (!m || !m[1].trim()) return [];
  return m[1]
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => n > 0);
}

function loadExistingMapData(mapId) {
  const filePath = path.join(outDir, `${mapId}.ts`);
  if (!fs.existsSync(filePath)) return null;
  const src = fs.readFileSync(filePath, "utf8");
  const hiddenMatch = src.match(/hiddenSpots:\s*\[([^\]]*)\]/);
  const hiddenSpots = hiddenMatch?.[1]
    ? hiddenMatch[1]
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => n > 0)
    : [];

  const byId = {};
  const blockRe =
    /id:\s*"([^"]+)"[\s\S]*?(?:originalDotX:\s*([-\d.]+),[\s\S]*?originalDotY:\s*([-\d.]+),[\s\S]*?)?dotX:\s*([-\d.]+),\s*\n\s*dotY:\s*([-\d.]+)/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    byId[m[1]] = {
      originalDotX: m[2] != null ? Number(m[2]) : Number(m[4]),
      originalDotY: m[3] != null ? Number(m[3]) : Number(m[5]),
      dotX: Number(m[4]),
      dotY: Number(m[5]),
    };
  }
  return { byId, hiddenSpots };
}

function buildContinentMap(continentId, continentName, refs, allPaths) {
  const existing = loadExistingMapData(continentId);
  const legacyShifts = loadLegacyDotShifts(continentId);
  const legacyHidden = loadLegacyHiddenSpots(continentId);

  const territories = [];
  const allBounds = [];
  let spotIndex = 0;
  for (const ref of refs) {
    const t = collectTerritory(allPaths, ref);
    if (!t) continue;
    spotIndex += 1;
    const originalDotX = t.dotX;
    const originalDotY = t.dotY;
    const prev = existing?.byId[t.id];
    const shift = legacyShifts[spotIndex];

    let dotX = originalDotX;
    let dotY = originalDotY;
    if (prev) {
      dotX = prev.dotX;
      dotY = prev.dotY;
    } else if (shift) {
      dotX = Math.round((originalDotX + shift.dx) * 10) / 10;
      dotY = Math.round((originalDotY + shift.dy) * 10) / 10;
    }

    territories.push({
      id: t.id,
      name: t.name,
      paths: t.paths,
      ...(t.clip ? { clip: t.clip } : {}),
      originalDotX,
      originalDotY,
      dotX,
      dotY,
    });
    allBounds.push(...t.bounds);
  }
  const viewBox = mergeBounds(allBounds);
  const rawHidden =
    existing?.hiddenSpots?.length > 0 ? existing.hiddenSpots : legacyHidden;
  const hiddenSpots = rawHidden.filter(
    (s) => s >= 1 && s <= territories.length,
  );
  return { continentId, continentName, viewBox, territories, hiddenSpots };
}

function emitTs(map) {
  const varName =
    map.continentId.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Data";
  const lines = [];
  lines.push(`/** Карта: пути из world.svg (extract), точки правятся вручную или в редакторе. */`);
  lines.push(`import type { TerritoryMapData } from '@/game/maps/world/buildTerritoryMap'`);
  lines.push(`import { MAP_ID } from '@/game/maps/mapIds'`);
  lines.push(``);
  lines.push(`export const ${varName}: TerritoryMapData = {`);
  lines.push(`  continentId: ${mapIdConstExpr(map.continentId)},`);
  lines.push(`  name: ${JSON.stringify(map.continentName)},`);
  lines.push(`  viewBox: ${JSON.stringify(map.viewBox)},`);
  if (map.hiddenSpots?.length > 0) {
    lines.push(`  hiddenSpots: [${map.hiddenSpots.join(", ")}],`);
  } else {
    lines.push(`  hiddenSpots: [],`);
  }
  lines.push(`  territories: [`);
  for (const t of map.territories) {
    lines.push(`    {`);
    lines.push(`      id: ${JSON.stringify(t.id)},`);
    lines.push(`      name: ${JSON.stringify(t.name)},`);
    lines.push(`      paths: ${JSON.stringify(t.paths)},`);
    if (t.clip) {
      lines.push(`      clip: ${JSON.stringify(t.clip)},`);
    }
    lines.push(`      originalDotX: ${t.originalDotX},`);
    lines.push(`      originalDotY: ${t.originalDotY},`);
    lines.push(`      dotX: ${t.dotX},`);
    lines.push(`      dotY: ${t.dotY},`);
    lines.push(`    },`);
  }
  lines.push(`  ],`);
  lines.push(`}`);
  return { file: `${map.continentId}.ts`, content: lines.join("\n") + "\n", varName };
}

const svg = fs.readFileSync(svgPath, "utf8");
const allPaths = parsePathElements(svg);
fs.mkdirSync(outDir, { recursive: true });

const indexExports = [];
for (const def of CONTINENTS) {
  const map = buildContinentMap(
    def.continentId,
    def.continentName,
    def.territories,
    allPaths
  );
  if (map.territories.length < 3) {
    console.warn(
      `⚠ ${def.continentId}: только ${map.territories.length} территорий — пропуск`
    );
    continue;
  }
  const emitted = emitTs(map);
  fs.writeFileSync(path.join(outDir, emitted.file), emitted.content);
  indexExports.push({
    varName: emitted.varName,
    file: map.continentId,
    count: map.territories.length,
    name: map.continentName,
  });
}

const indexLines = [
  "/** Автогенерация: node scripts/extract-world-maps.mjs */",
  ...indexExports.map((e) => `export { ${e.varName} } from './${e.file}'`),
  "",
];
fs.writeFileSync(path.join(outDir, "index.ts"), indexLines.join("\n"));

for (const e of indexExports) {
  console.log(`OK: ${e.name} — ${e.count} территорий → ${e.file}.ts`);
}
