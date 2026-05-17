import {
  normalizeOfflineBotCount,
  OFFLINE_BOT_COUNT,
} from "@/shared/offlineBotCount";

import { STORAGE_KEYS } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_KEYS.offlineBotCount;

export function readOfflineBotCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return OFFLINE_BOT_COUNT.default;
    const n = Number.parseInt(raw, 10);
    return normalizeOfflineBotCount(
      Number.isFinite(n) ? n : OFFLINE_BOT_COUNT.default
    );
  } catch {
    return OFFLINE_BOT_COUNT.default;
  }
}

export function writeOfflineBotCount(value: number): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      String(normalizeOfflineBotCount(value))
    );
  } catch {
    /* ignore */
  }
}
