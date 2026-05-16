import { DISPLAY_COLORS, type DisplayColorId } from "./displayColors.js";

/** Уникальные displayColor для ботов (без цвета локального игрока). */
export function assignOfflineBotDisplayColors(
  localColor: DisplayColorId,
  botCount: number
): DisplayColorId[] {
  const n = Math.max(0, Math.min(5, Math.round(botCount)));
  const reserved = new Set<DisplayColorId>([localColor]);
  const picked: DisplayColorId[] = [];
  for (const c of DISPLAY_COLORS) {
    if (picked.length >= n) break;
    if (!reserved.has(c)) {
      picked.push(c);
      reserved.add(c);
    }
  }
  return picked;
}
