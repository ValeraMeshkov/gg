import { isRoomPlaying, ROOM_STATUS, type RoomStatus } from "./roomStatus.js";

export type { RoomLifecycleStatus, RoomStatus } from "./roomStatus.js";

/** Игрок в комнате (REST / общая модель). */
export type RoomPlayerPublic = {
  userId: string;
  joinedAt: string;
  slotId?: string;
  /** В текущей партии на карте; false — очередь ожидания. */
  inMatch?: boolean;
  ready?: boolean;
  /** Подключился во время активной партии (очередь). */
  joinedDuringMatch?: boolean;
};

export function playerInMatch(player: { inMatch?: boolean }): boolean {
  return player.inMatch !== false;
}

export function matchParticipantSlotIds(
  players: readonly RoomPlayerPublic[]
): string[] {
  return players
    .filter((p) => playerInMatch(p) && p.slotId)
    .map((p) => p.slotId!);
}

export function countActiveMatchParticipants(
  players: readonly RoomPlayerPublic[]
): number {
  return matchParticipantSlotIds(players).length;
}

/** На карте реально идёт бой — двое в партии и статус playing. */
export function isRealActiveMatch(
  status: RoomStatus,
  players: readonly RoomPlayerPublic[]
): boolean {
  return isRoomPlaying(status) && countActiveMatchParticipants(players) >= 2;
}

/**
 * Статус для дока/кнопок: «playing» без двух участников — как подбор
 * (на Render часто залипает после ухода второго игрока).
 */
export function roomLifecycleForDock(
  status: RoomStatus,
  players: readonly RoomPlayerPublic[]
): RoomStatus {
  if (isRoomPlaying(status) && countActiveMatchParticipants(players) < 2) {
    return ROOM_STATUS.MATCHMAKING;
  }
  return status;
}

export function waitingRoomPlayers(
  players: readonly RoomPlayerPublic[]
): RoomPlayerPublic[] {
  return players.filter((p) => !playerInMatch(p));
}

export function queueRoomPlayers(
  players: readonly RoomPlayerPublic[]
): RoomPlayerPublic[] {
  return players.filter(
    (p) => !playerInMatch(p) && p.joinedDuringMatch === true
  );
}

/** Игроки «в зале» (не очередь с mid-match join) для списка в лобби. */
export function lobbyPoolPlayers(
  players: readonly RoomPlayerPublic[],
  roomStatus: RoomStatus
): RoomPlayerPublic[] {
  if (isRoomPlaying(roomStatus)) {
    return players.filter((p) => playerInMatch(p));
  }
  return players.filter((p) => !p.joinedDuringMatch);
}

/**
 * Можно менять имя / цвет / бойца / здание:
 * — в очереди (не в партии);
 * — после выбывания (очки < 0 на полосе);
 * — вне активной партии (lobby).
 */

export function canEditAppearanceInRoom(opts: {
  inMatch: boolean;
  roomStatus: RoomStatus;
  /** Итоговые очки слота с учётом штрафа выбывания. */
  matchDisplayScore: number;
}): boolean {
  if (!opts.inMatch) return true;
  if (!isRoomPlaying(opts.roomStatus)) return true;
  return opts.matchDisplayScore < 0;
}

/** Карту и «случайную карту» меняет только хост вне активной партии. */
export function canHostEditRoomMap(opts: {
  isHost: boolean;
  roomStatus: RoomStatus;
}): boolean {
  return opts.isHost && !isRoomPlaying(opts.roomStatus);
}

export function countReadyPlayers(
  players: readonly { ready?: boolean }[]
): number {
  return players.filter((p) => p.ready === true).length;
}

/** Готовые в «зале» подбора; хост считается готовым (кнопки «Готов» у него нет). */
export function countMatchmakingReady(
  players: readonly RoomPlayerPublic[],
  roomStatus: RoomStatus,
  hostUserId?: string
): number {
  const pool = lobbyPoolPlayers(players, roomStatus);
  return pool.filter(
    (p) => p.ready === true || (hostUserId != null && p.userId === hostUserId)
  ).length;
}
