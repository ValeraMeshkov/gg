import {
  normalizeOfflineBotDifficulty,
  OFFLINE_BOT_DIFFICULTY,
} from "@/shared/offlineBotDifficulty";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  readStorageInt,
  writeStorageInt,
} from "@/lib/storage/localStorageHelpers";

const STORAGE_KEY = STORAGE_KEYS.offlineBotDifficulty;

export function readOfflineBotDifficulty(): number {
  return readStorageInt(
    STORAGE_KEY,
    normalizeOfflineBotDifficulty,
    OFFLINE_BOT_DIFFICULTY.default
  );
}

export function writeOfflineBotDifficulty(value: number): void {
  writeStorageInt(STORAGE_KEY, value, normalizeOfflineBotDifficulty);
}
