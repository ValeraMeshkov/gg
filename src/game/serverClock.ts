/** Смещение serverTime − Date.now() (обновляется из WS snapshot/cells). */
let serverClockOffsetMs = 0;

export function updateServerClockOffset(serverTime: number): void {
  serverClockOffsetMs = serverTime - Date.now();
}

/** Текущее время по часам сервера (Unix ms). */
export function serverNowMs(): number {
  return Date.now() + serverClockOffsetMs;
}
