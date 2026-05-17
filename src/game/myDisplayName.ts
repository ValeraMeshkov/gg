import { STORAGE_KEYS } from "@/constants/storageKeys";

const KEY = STORAGE_KEYS.displayName;

export function loadMyDisplayName(): string {
  try {
    const v = localStorage.getItem(KEY);
    return typeof v === "string" ? v.slice(0, 32) : "";
  } catch {
    return "";
  }
}

export function saveMyDisplayName(name: string): void {
  try {
    localStorage.setItem(KEY, name.slice(0, 32));
  } catch {
    /* ignore */
  }
}
