import { STORAGE_KEYS } from "@/constants/storageKeys";

const STORAGE_KEY = STORAGE_KEYS.randomMapOnStart;

export function readRandomMapOnStart(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeRandomMapOnStart(value: boolean): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
