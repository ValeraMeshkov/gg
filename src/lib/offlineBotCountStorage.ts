import {
  normalizeOfflineBotCount,
  OFFLINE_BOT_COUNT,
} from "@/shared/offlineBotCount";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import {
  readStorageInt,
  writeStorageInt,
} from "@/lib/storage/localStorageHelpers";

const STORAGE_KEY = STORAGE_KEYS.offlineBotCount;

export function readOfflineBotCount(): number {
  return readStorageInt(STORAGE_KEY, normalizeOfflineBotCount, OFFLINE_BOT_COUNT.default);
}

export function writeOfflineBotCount(value: number): void {
  writeStorageInt(STORAGE_KEY, value, normalizeOfflineBotCount);
}
