/** Сложность оффлайн-ботов: 0 — очень просто, 100 — максимум. */
export const OFFLINE_BOT_DIFFICULTY = {
  min: 0,
  max: 100,
  default: 42,
} as const;

export function normalizeOfflineBotDifficulty(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : OFFLINE_BOT_DIFFICULTY.default;
  return Math.min(
    OFFLINE_BOT_DIFFICULTY.max,
    Math.max(OFFLINE_BOT_DIFFICULTY.min, Math.round(n))
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Небольшой разброс задержки «думает» перед ходом.
 * Чем выше `difficulty`, тем короче пауза.
 */
export function offlineBotThinkDelayMs(
  rng: () => number,
  difficulty: number
): number {
  const t = normalizeOfflineBotDifficulty(difficulty) / OFFLINE_BOT_DIFFICULTY.max;
  const minMs = Math.round(lerp(10_000, 500, t));
  const maxMs = Math.round(lerp(15_000, 2800, t));
  return minMs + rng() * Math.max(1, maxMs - minMs);
}