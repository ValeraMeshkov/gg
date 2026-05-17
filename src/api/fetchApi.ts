import { apiUrl } from "./config";

/** Запрос к API с cookie-сессией (Google OAuth). */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    credentials: "include",
  });
}
