import type { DisplayColorId } from "@/game/appearance";
import { DISPLAY_COLORS } from "@/shared/displayColors";
import { PLAYER_SLOT_IDS } from "@/shared/playerSlots";
import type { Palette, ProjectileColorPair } from "./types";

/**
 * [0] не используется для слотов. [1] — игрок 1 (красный), [2] — игрок 2 (оранжевый)…
 */
export const PALETTES: readonly Palette[] = [
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

export const PROJECTILE_COLORS: readonly ProjectileColorPair[] = [
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
];

export const PALETTE_INDEX_BY_PLAYER_ID: Record<string, number> = {};
export const SHARE_BAR_COLOR_BY_PLAYER_ID: Record<string, number> = {};
PLAYER_SLOT_IDS.forEach((id, i) => {
  PALETTE_INDEX_BY_PLAYER_ID[id] = i + 1;
  SHARE_BAR_COLOR_BY_PLAYER_ID[id] = Math.min(i + 2, 11);
});

export const DISPLAY_COLOR_PALETTES: Record<DisplayColorId, Palette> = {
  blue: PALETTES[0]!,
  red: PALETTES[1]!,
  orange: PALETTES[2]!,
  green: PALETTES[3]!,
  violet: PALETTES[4]!,
  gold: PALETTES[5]!,
  cyan: PALETTES[6]!,
  pink: PALETTES[7]!,
};

export const DISPLAY_PROJECTILE_COLORS: Record<
  DisplayColorId,
  ProjectileColorPair
> = {
  blue: PROJECTILE_COLORS[0]!,
  red: PROJECTILE_COLORS[1]!,
  orange: PROJECTILE_COLORS[2]!,
  green: PROJECTILE_COLORS[3]!,
  violet: PROJECTILE_COLORS[4]!,
  gold: PROJECTILE_COLORS[5]!,
  cyan: PROJECTILE_COLORS[6]!,
  pink: PROJECTILE_COLORS[7]!,
};

export const SLOT_PALETTE_TO_DISPLAY: Record<number, DisplayColorId> = {};
PLAYER_SLOT_IDS.forEach((_, i) => {
  SLOT_PALETTE_TO_DISPLAY[i + 1] = DISPLAY_COLORS[i % DISPLAY_COLORS.length]!;
});

export const SHARE_BAR_BY_PALETTE_INDEX: Record<number, number> = {};
for (let i = 1; i < PALETTES.length; i++) {
  SHARE_BAR_BY_PALETTE_INDEX[i] = Math.min(i + 1, 11);
}

/** Верхняя точка градиента заливки территории (0–1 между pale и full). */
export const TERRITORY_FILL_BLEND_PEAK = 0.5;

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(from[0], to[0], t));
  const g = Math.round(lerp(from[1], to[1], t));
  const b = Math.round(lerp(from[2], to[2], t));
  return `rgb(${r},${g},${b})`;
}
