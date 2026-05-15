import type { DisplayColorId } from "./appearance";
import { displayColorSwatch, type PlayerAppearancesMap } from "./appearance";
import { DISPLAY_COLORS } from "../../shared/displayColors";
import {
  isPlayerSlotId,
  PLAYER_SLOT_IDS,
  slotIndexFromId,
} from "../../shared/playerSlots";
import { CELL } from "./constants";

export type PlayerDotVariant = "neutral" | "p1" | "p2" | "p3";

export type OwnedTerritoryColors = {
  fill: string;
  stroke: string;
};

type Palette = {
  fillPale: [number, number, number];
  fillFull: [number, number, number];
  strokePale: [number, number, number];
  strokeFull: [number, number, number];
};

/**
 * [0] не используется для слотов. [1] — игрок 1 (красный), [2] — игрок 2 (оранжевый)…
 * Один и тот же слот = один цвет у хоста и гостя.
 */
const PALETTES: readonly Palette[] = [
  {
    fillPale: [232, 244, 255],
    fillFull: [45, 158, 255],
    strokePale: [200, 224, 248],
    strokeFull: [20, 110, 210],
  },
  {
    fillPale: [255, 232, 232],
    fillFull: [235, 82, 82],
    strokePale: [255, 200, 200],
    strokeFull: [180, 40, 40],
  },
  {
    fillPale: [255, 238, 228],
    fillFull: [255, 118, 72],
    strokePale: [255, 210, 188],
    strokeFull: [220, 75, 40],
  },
  {
    fillPale: [236, 245, 230],
    fillFull: [72, 178, 96],
    strokePale: [200, 228, 200],
    strokeFull: [28, 112, 52],
  },
  {
    fillPale: [240, 232, 255],
    fillFull: [140, 92, 220],
    strokePale: [220, 210, 245],
    strokeFull: [90, 50, 160],
  },
  {
    fillPale: [255, 248, 220],
    fillFull: [240, 180, 50],
    strokePale: [255, 230, 170],
    strokeFull: [180, 120, 20],
  },
  {
    fillPale: [224, 248, 248],
    fillFull: [62, 201, 198],
    strokePale: [180, 230, 228],
    strokeFull: [20, 120, 118],
  },
  {
    fillPale: [255, 232, 244],
    fillFull: [244, 114, 182],
    strokePale: [255, 200, 220],
    strokeFull: [180, 50, 100],
  },
  {
    fillPale: [232, 240, 255],
    fillFull: [88, 120, 220],
    strokePale: [200, 210, 245],
    strokeFull: [50, 70, 160],
  },
  {
    fillPale: [245, 236, 228],
    fillFull: [160, 110, 75],
    strokePale: [230, 210, 195],
    strokeFull: [100, 65, 40],
  },
  {
    fillPale: [228, 248, 232],
    fillFull: [56, 168, 120],
    strokePale: [195, 230, 205],
    strokeFull: [25, 100, 65],
  },
];

const PROJECTILE_COLORS = [
  { fill: "#1e5a9e", stroke: "#0f3558" },
  { fill: "#e05252", stroke: "#8f2020" },
  { fill: "#d95828", stroke: "#8f3014" },
  { fill: "#2d7a4a", stroke: "#143d24" },
  { fill: "#7b4fc4", stroke: "#4a2d80" },
  { fill: "#c99218", stroke: "#7a5a08" },
  { fill: "#2a9d9a", stroke: "#145a58" },
  { fill: "#e85a9e", stroke: "#8f2048" },
  { fill: "#5878dc", stroke: "#324890" },
  { fill: "#a06e4a", stroke: "#644028" },
  { fill: "#38a878", stroke: "#1a6040" },
] as const;

/** Индекс в PALETTES для территории (0 — запас, 1+ — слоты). */
const PALETTE_INDEX_BY_PLAYER_ID: Record<string, number> = {};
/** Индексы data-player в PlayerShareBar.module.scss (2=красный, 3=оранжевый…). */
const SHARE_BAR_COLOR_BY_PLAYER_ID: Record<string, number> = {};
PLAYER_SLOT_IDS.forEach((id, i) => {
  PALETTE_INDEX_BY_PLAYER_ID[id] = i + 1;
  SHARE_BAR_COLOR_BY_PLAYER_ID[id] = Math.min(i + 2, 11);
});

/** Личные цвета (только у себя на экране). Порядок = DISPLAY_COLORS в types. */
const DISPLAY_COLOR_PALETTES: Record<DisplayColorId, Palette> = {
  blue: PALETTES[0]!,
  red: PALETTES[1]!,
  orange: PALETTES[2]!,
  green: PALETTES[3]!,
  violet: PALETTES[4]!,
  gold: PALETTES[5]!,
  cyan: {
    fillPale: [224, 248, 248],
    fillFull: [62, 201, 198],
    strokePale: [180, 230, 228],
    strokeFull: [20, 120, 118],
  },
  pink: {
    fillPale: [255, 232, 244],
    fillFull: [244, 114, 182],
    strokePale: [255, 200, 220],
    strokeFull: [180, 50, 100],
  },
};

const DISPLAY_PROJECTILE_COLORS: Record<DisplayColorId, { fill: string; stroke: string }> = {
  blue: PROJECTILE_COLORS[0]!,
  red: PROJECTILE_COLORS[1]!,
  orange: PROJECTILE_COLORS[2]!,
  green: PROJECTILE_COLORS[3]!,
  violet: PROJECTILE_COLORS[4]!,
  gold: PROJECTILE_COLORS[5]!,
  cyan: { fill: "#2a9d9a", stroke: "#145a58" },
  pink: { fill: "#e85a9e", stroke: "#8f2048" },
};

export type ShareBarColorView = {
  colorIndex: number;
  /** Свой личный цвет — inline, не data-player */
  background?: string;
};

/**
 * Верхняя точка градиента заливки территории (0–1 между pale и full).
 * 0.5 — пик яркости вдвое ниже прежнего «полного» цвета, чтобы фон не забивал картинку.
 * Бойцы и маркеры юнитов рисуются с blendPeak = 1 (см. ownedTerritoryColorsForView).
 */
const TERRITORY_FILL_BLEND_PEAK = 0.5;

function colorsFromPalette(
  palette: Palette,
  units: number,
  blendPeak: number = TERRITORY_FILL_BLEND_PEAK
): OwnedTerritoryColors {
  const t = Math.min(1, Math.max(0, units) / CELL.ownedCap);
  const blend = t * blendPeak;
  return {
    fill: lerpRgb(palette.fillPale, palette.fillFull, blend),
    stroke: lerpRgb(palette.strokePale, palette.strokeFull, blend),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(from[0], to[0], t));
  const g = Math.round(lerp(from[1], to[1], t));
  const b = Math.round(lerp(from[2], to[2], t));
  return `rgb(${r},${g},${b})`;
}

function paletteIndexForOwner(ownerId: string): number | null {
  if (!isPlayerSlotId(ownerId)) return null;
  return PALETTE_INDEX_BY_PLAYER_ID[ownerId] ?? slotIndexFromId(ownerId) + 1;
}

/** Слот на карте ↔ личный цвет из селектора (совпадение → путаемся с соперником). */
const SLOT_PALETTE_TO_DISPLAY: Record<number, DisplayColorId> = {};
PLAYER_SLOT_IDS.forEach((_, i) => {
  SLOT_PALETTE_TO_DISPLAY[i + 1] = DISPLAY_COLORS[i % DISPLAY_COLORS.length]!;
});

/** Если слот соперника совпал с вашим личным цветом — другой слот только у вас на экране. */
function alternatePaletteIndex(slotIdx: number, localDisplayColor: DisplayColorId): number {
  for (let step = 1; step < PALETTES.length; step++) {
    const alt = ((slotIdx - 1 + step) % (PALETTES.length - 1)) + 1;
    if (!slotConflictsWithDisplayColor(alt, localDisplayColor)) return alt;
  }
  return slotIdx;
}

const SHARE_BAR_BY_PALETTE_INDEX: Record<number, number> = {};
for (let i = 1; i < PALETTES.length; i++) {
  SHARE_BAR_BY_PALETTE_INDEX[i] = Math.min(i + 1, 11);
}

function slotConflictsWithDisplayColor(
  slotPaletteIndex: number,
  localDisplayColor: DisplayColorId
): boolean {
  return SLOT_PALETTE_TO_DISPLAY[slotPaletteIndex] === localDisplayColor;
}

/** Индекс PALETTES для отрисовки владельца с учётом личного цвета и коллизий. */
function effectivePaletteIndexForOwner(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): number | null {
  const slotIdx = paletteIndexForOwner(ownerId);
  if (slotIdx === null) return null;
  if (
    ownerId !== localPlayerId &&
    localDisplayColor &&
    slotConflictsWithDisplayColor(slotIdx, localDisplayColor)
  ) {
    return alternatePaletteIndex(slotIdx, localDisplayColor);
  }
  return slotIdx;
}

function paletteForOwner(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): Palette | null {
  const idx = effectivePaletteIndexForOwner(
    ownerId,
    localPlayerId,
    localDisplayColor
  );
  if (idx === null) return null;
  return PALETTES[idx] ?? PALETTES[1]!;
}

/** Полоска долей: слот соперника; для себя — личный цвет, если задан. */
export function shareBarColorForView(
  playerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): ShareBarColorView {
  if (playerId === localPlayerId && localDisplayColor) {
    return { colorIndex: 1, background: displayColorSwatch(localDisplayColor) };
  }
  const paletteIdx = effectivePaletteIndexForOwner(
    playerId,
    localPlayerId,
    localDisplayColor
  );
  const slotIdx = paletteIndexForOwner(playerId);
  if (
    paletteIdx != null &&
    slotIdx != null &&
    paletteIdx !== slotIdx &&
    SHARE_BAR_BY_PALETTE_INDEX[paletteIdx] != null
  ) {
    return { colorIndex: SHARE_BAR_BY_PALETTE_INDEX[paletteIdx]! };
  }
  return { colorIndex: shareBarColorIndex(playerId) };
}

export function shareBarColorIndex(
  playerId: string,
  _localPlayerId?: string
): number {
  return SHARE_BAR_COLOR_BY_PLAYER_ID[playerId] ?? 2;
}

export function ownedTerritoryColorsForView(
  ownerId: string,
  localPlayerId: string,
  units: number,
  localDisplayColor?: DisplayColorId,
  /** 1 — «полный» цвет палитры (бойцы, снаряды); по умолчанию — приглушённая территория. */
  blendPeak: number = TERRITORY_FILL_BLEND_PEAK
): OwnedTerritoryColors | null {
  if (ownerId === localPlayerId && localDisplayColor) {
    return colorsFromPalette(DISPLAY_COLOR_PALETTES[localDisplayColor], units, blendPeak);
  }
  const palette = paletteForOwner(ownerId, localPlayerId, localDisplayColor);
  if (!palette) return null;
  return colorsFromPalette(palette, units, blendPeak);
}

export function ownedTerritoryColors(
  ownerId: string,
  localPlayerId: string,
  units: number
): OwnedTerritoryColors | null {
  return ownedTerritoryColorsForView(ownerId, localPlayerId, units);
}

export function ownedDotFill(
  ownerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): string | null {
  const maxed = ownedTerritoryColorsForView(
    ownerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor,
    1
  );
  return maxed?.fill ?? null;
}

export function dotVariantForOwner(
  ownerId: string | undefined,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): PlayerDotVariant {
  if (!ownerId) return "neutral";
  const idx = effectivePaletteIndexForOwner(
    ownerId,
    localPlayerId,
    localDisplayColor
  );
  if (idx === 1) return "p2";
  if (idx === 2) return "p3";
  return "p1";
}

export function isKnownPlayerSlot(ownerId: string | undefined): boolean {
  return ownerId != null && isPlayerSlotId(ownerId);
}

export function projectileColorsForView(
  attackerId: string,
  localPlayerId: string,
  localDisplayColor?: DisplayColorId,
  attackerDisplayColor?: DisplayColorId
): { fill: string; stroke: string } {
  const dc =
    attackerId === localPlayerId
      ? (localDisplayColor ?? attackerDisplayColor)
      : attackerDisplayColor;
  if (dc) {
    return DISPLAY_PROJECTILE_COLORS[dc];
  }
  const idx =
    effectivePaletteIndexForOwner(
      attackerId,
      localPlayerId,
      localDisplayColor
    ) ?? 1;
  return PROJECTILE_COLORS[idx] ?? PROJECTILE_COLORS[1]!;
}

/**
 * Цвет пули/эффекта на этом экране:
 * — свои: личный displayColor;
 * — соперник: как его территория у вас (слот + подмена при коллизии), не его локальный violet.
 */
export function projectileColorsForPlayer(
  attackerId: string,
  localPlayerId: string,
  appearances: PlayerAppearancesMap,
  localDisplayColor?: DisplayColorId
): { fill: string; stroke: string } {
  if (attackerId === localPlayerId) {
    const dc =
      localDisplayColor ?? appearances[attackerId]?.displayColor;
    if (dc) return DISPLAY_PROJECTILE_COLORS[dc];
  }
  const asOnThisScreen = ownedTerritoryColorsForView(
    attackerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor,
    1
  );
  if (asOnThisScreen) {
    return { fill: asOnThisScreen.fill, stroke: asOnThisScreen.stroke };
  }
  const idx =
    effectivePaletteIndexForOwner(
      attackerId,
      localPlayerId,
      localDisplayColor
    ) ?? 1;
  return PROJECTILE_COLORS[idx] ?? PROJECTILE_COLORS[1]!;
}

export function projectileColors(
  attackerId: string,
  localPlayerId: string
): { fill: string; stroke: string } {
  return projectileColorsForView(attackerId, localPlayerId);
}

const RGB_RE = /^rgb\((\d+),(\d+),(\d+)\)$/;
const AIM_BLEND_WHITE: [number, number, number] = [255, 255, 255];

function parseRgb(color: string): [number, number, number] | null {
  const m = RGB_RE.exec(color);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function softPlayerTint(color: string, amount: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  return lerpRgb(AIM_BLEND_WHITE, rgb, amount);
}

export function aimColorsForLocalPlayer(
  localPlayerId: string,
  localDisplayColor?: DisplayColorId
): {
  stroke: string;
  head: string;
} {
  const owned = ownedTerritoryColorsForView(
    localPlayerId,
    localPlayerId,
    CELL.ownedCap,
    localDisplayColor
  );
  if (!owned) {
    return {
      stroke: "rgba(42, 158, 255, 0.38)",
      head: "rgba(20, 110, 210, 0.48)",
    };
  }
  return {
    stroke: softPlayerTint(owned.fill, 0.32),
    head: softPlayerTint(owned.stroke, 0.24),
  };
}
