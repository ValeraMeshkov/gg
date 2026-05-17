import { apiBaseUrl } from "@/api/config";

/** WebSocket URL для комнаты (dev: через прокси Vite). */
export function roomWsUrl(roomCode: string): string {
  const code = encodeURIComponent(roomCode.toUpperCase());
  const path = `/ws/room/${code}`;

  const base = apiBaseUrl();
  if (base) {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = path;
    u.search = "";
    return u.toString();
  }

  if (import.meta.env.DEV) {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}${path}`;
  }

  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}
