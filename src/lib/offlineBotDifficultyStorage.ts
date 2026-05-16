import {
  normalizeOfflineBotDifficulty,
  OFFLINE_BOT_DIFFICULTY,
} from "../../shared/offlineBotDifficulty.js";

const STORAGE_KEY = "game-offline-bot-difficulty-v1";

export function readOfflineBotDifficulty(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return OFFLINE_BOT_DIFFICULTY.default;
    const n = Number.parseInt(raw, 10);
    return normalizeOfflineBotDifficulty(
      Number.isFinite(n) ? n : OFFLINE_BOT_DIFFICULTY.default
    );
  } catch {
    return OFFLINE_BOT_DIFFICULTY.default;
  }
}

export function writeOfflineBotDifficulty(value: number): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      String(normalizeOfflineBotDifficulty(value))
    );
  } catch {
    /* ignore */
  }
}
