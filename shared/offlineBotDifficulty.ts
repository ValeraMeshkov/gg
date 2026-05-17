/** Сложность оффлайн-ботов: 0 — очень просто, 100 — максимум. */
export const OFFLINE_BOT_DIFFICULTY = {
  min: 0,
  max: 100,
  default: 42,
} as const;

/** С какой сложности у каждого бота по две стартовые точки. */
export const OFFLINE_BOT_EXTRA_START_AT = 80;

/** Пауза после старта матча, прежде чем боты начнут играть (мс). */
export const OFFLINE_BOT_START_DELAY_MS = 5_000;

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
 * 0..1 — эффективная сила бота (AI, паузы).
 * Даже на 0 игра чуть сложнее прежнего «лёгкого» режима.
 */
export function offlineBotSkillNormalized(difficulty: number): number {
  const linear =
    normalizeOfflineBotDifficulty(difficulty) / OFFLINE_BOT_DIFFICULTY.max;
  return Math.min(1, 0.14 + linear * 0.86);
}

/**
 * Стартовых территорий у локального игрока: 1 → 2 (ровно 100%).
 */
export function offlineHumanStartTerritories(difficulty: number): number {
  const d = normalizeOfflineBotDifficulty(difficulty);
  if (d >= OFFLINE_BOT_DIFFICULTY.max) return 2;
  return 1;
}

/**
 * Стартовых территорий на одного бота: 1 → 2 (≥80%) → 3 (ровно 100%).
 */
export function offlineBotStartTerritoriesPerBot(difficulty: number): number {
  const d = normalizeOfflineBotDifficulty(difficulty);
  if (d >= OFFLINE_BOT_DIFFICULTY.max) return 3;
  if (d >= OFFLINE_BOT_EXTRA_START_AT) return 2;
  return 1;
}

/**
 * Пауза «думает» перед каждым ходом бота.
 * 0%: ~13–20 с; 100%: доли секунды.
 */
export function offlineBotThinkDelayMs(
  rng: () => number,
  difficulty: number
): number {
  const t =
    normalizeOfflineBotDifficulty(difficulty) / OFFLINE_BOT_DIFFICULTY.max;
  const minMs = Math.round(lerp(13_000, 450, t));
  const maxMs = Math.round(lerp(20_000, 1_800, t));
  return minMs + rng() * Math.max(1, maxMs - minMs);
}
