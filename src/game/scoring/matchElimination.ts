/** Очки ниже этого порога — игрок выбыл (−1 и меньше). При 0 ещё можно отыграться. */
export const PLAYER_ELIMINATED_BELOW_SCORE = 0;

export function isPlayerAliveInMatch(score: number): boolean {
  return score >= PLAYER_ELIMINATED_BELOW_SCORE;
}

/** Штраф выбывания: 1 → итоговые очки 0 отображаются как −1. */
export function matchScoreWithEliminationPenalty(
  rawScore: number,
  eliminationPenalty: number
): number {
  return rawScore - Math.max(0, eliminationPenalty);
}
