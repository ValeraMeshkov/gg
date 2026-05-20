/** Безопасные обёртки localStorage — единый try/catch и парсинг. */

export function readStorageString(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function removeStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function readStorageInt(
  key: string,
  normalize: (n: number) => number,
  fallback: number
): number {
  const raw = readStorageString(key);
  if (raw == null) return fallback;
  const n = Number.parseInt(raw, 10);
  return normalize(Number.isFinite(n) ? n : fallback);
}

export function writeStorageInt(
  key: string,
  value: number,
  normalize: (n: number) => number
): void {
  writeStorageString(key, String(normalize(value)));
}

export function readStorageFlag(key: string): boolean {
  return readStorageString(key) === "1";
}

export function writeStorageFlag(key: string, value: boolean): void {
  if (value) writeStorageString(key, "1");
  else removeStorageKey(key);
}
