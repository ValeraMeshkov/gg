/** Исход партии для локального UI (модалка победы/поражения). */
export const MATCH_OUTCOME = {
  WON: "won",
  LOST: "lost",
} as const;

export type MatchOutcome = (typeof MATCH_OUTCOME)[keyof typeof MATCH_OUTCOME];

/** @deprecated Используйте `MatchOutcome`. */
export type RoomGameOutcome = MatchOutcome;

export function isMatchWon(outcome: MatchOutcome): boolean {
  return outcome === MATCH_OUTCOME.WON;
}
