/** Число ботов-соперников в одиночной игре (без учёта локального игрока). */
export const OFFLINE_BOT_COUNT = {
  min: 1,
  max: 5,
  default: 2,
} as const;

export function normalizeOfflineBotCount(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : OFFLINE_BOT_COUNT.default;
  return Math.min(
    OFFLINE_BOT_COUNT.max,
    Math.max(OFFLINE_BOT_COUNT.min, Math.round(n))
  );
}
