import { isValidMapId } from "@/shared/mapPlayable";
import { DEFAULT_MAP_ID } from "@/game/maps";

import { STORAGE_KEYS } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_KEYS.selectedMap;

export function readSelectedMapId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isValidMapId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_MAP_ID;
}

export function writeSelectedMapId(mapId: string): void {
  if (!isValidMapId(mapId)) return;
  try {
    localStorage.setItem(STORAGE_KEY, mapId);
  } catch {
    /* ignore */
  }
}
