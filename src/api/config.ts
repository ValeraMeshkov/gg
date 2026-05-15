/**
 * Базовый URL API.
 * - dev: пусто → `/api` через прокси Vite
 * - production: VITE_API_BASE_URL при сборке или public/api-config.json
 */
let runtimeApiBase = "";

export async function initApiConfig(): Promise<void> {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) return;

  try {
    const base = import.meta.env.BASE_URL || "/";
    const url = new URL("api-config.json", window.location.origin + base).href;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as { apiBaseUrl?: string };
    const raw = data.apiBaseUrl?.trim();
    if (raw) runtimeApiBase = raw.replace(/\/$/, "");
  } catch {
    /* offline / missing file */
  }
}

export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (runtimeApiBase) return runtimeApiBase;
  if (import.meta.env.DEV) return "";
  return "";
}

export function isApiEnabled(): boolean {
  return (
    import.meta.env.DEV ||
    Boolean(import.meta.env.VITE_API_BASE_URL) ||
    Boolean(runtimeApiBase)
  );
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
