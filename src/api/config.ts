/**
 * Базовый URL API.
 * - dev: пусто → запросы на `/api` (прокси Vite на localhost:3001)
 * - GitHub Pages: задать VITE_API_BASE_URL при сборке (хостинг бэкенда отдельно)
 */
export function apiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "";
  }
  return "";
}

export function isApiEnabled(): boolean {
  return import.meta.env.DEV || Boolean(import.meta.env.VITE_API_BASE_URL);
}

export function apiUrl(path: string): string {
  const base = apiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
