/** Фазы жизненного цикла комнаты (REST + WS + UI). */
export const ROOM_STATUS = {
  LOBBY: "lobby",
  MATCHMAKING: "matchmaking",
  PLAYING: "playing",
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

/** @deprecated Используйте `RoomStatus`. */
export type RoomLifecycleStatus = RoomStatus;

export function isRoomLobby(status: RoomStatus): boolean {
  return status === ROOM_STATUS.LOBBY;
}

export function isRoomMatchmaking(status: RoomStatus): boolean {
  return status === ROOM_STATUS.MATCHMAKING;
}

export function isRoomPlaying(status: RoomStatus): boolean {
  return status === ROOM_STATUS.PLAYING;
}

/** Лобби или подбор — настройки карты, «Поиск игры», «Готов». */
export function isRoomSetupPhase(status: RoomStatus): boolean {
  return isRoomLobby(status) || isRoomMatchmaking(status);
}
