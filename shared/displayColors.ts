import { slotIndexFromId } from "./playerSlots.js";

/** Синхронизировать с src/game/appearance/types.ts DISPLAY_COLORS */
export const DISPLAY_COLORS = [
  "blue",
  "green",
  "red",
  "orange",
  "violet",
  "gold",
  "cyan",
  "pink",
] as const;

export type DisplayColorId = (typeof DISPLAY_COLORS)[number];

const SET = new Set<string>(DISPLAY_COLORS);

export function normalizeDisplayColor(v: unknown): DisplayColorId | null {
  return typeof v === "string" && SET.has(v) ? (v as DisplayColorId) : null;
}

/** Цвет пуль/эффектов по слоту, пока игрок не прислал свой displayColor. */
export function defaultDisplayColorForSlot(slotId: string): DisplayColorId {
  const idx = slotIndexFromId(slotId);
  return DISPLAY_COLORS[idx % DISPLAY_COLORS.length]!;
}
