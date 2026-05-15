/** Максимум игроков в одной комнате. */
export const MAX_ROOM_PLAYERS = 10;

export const MIN_ROOM_PLAYERS = 2;

/** Слоты на карте: mock-user, mock-user-2, … mock-user-10 */
export const PLAYER_SLOT_IDS: readonly string[] = Array.from(
  { length: MAX_ROOM_PLAYERS },
  (_, i) => (i === 0 ? "mock-user" : `mock-user-${i + 1}`)
);

export function isPlayerSlotId(id: string): boolean {
  return PLAYER_SLOT_IDS.includes(id);
}

export function slotIndexFromId(slotId: string): number {
  const i = PLAYER_SLOT_IDS.indexOf(slotId);
  return i >= 0 ? i : 0;
}

export function playerSlotId(slotIndex: number): string {
  return (
    PLAYER_SLOT_IDS[slotIndex] ??
    PLAYER_SLOT_IDS[PLAYER_SLOT_IDS.length - 1]!
  );
}

/** Без лимита с клиента — до MAX_ROOM_PLAYERS (все слоты открыты). */
export function normalizeMaxPlayers(value: unknown): number {
  if (value === undefined || value === null) return MAX_ROOM_PLAYERS;
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.floor(value)
      : MAX_ROOM_PLAYERS;
  return Math.min(MAX_ROOM_PLAYERS, Math.max(MIN_ROOM_PLAYERS, n));
}
