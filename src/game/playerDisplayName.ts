import { PLAYER_SLOT_IDS } from "../../shared/playerSlots";

export function defaultDisplayNameForSlot(slotId: string): string {
  const i = PLAYER_SLOT_IDS.indexOf(slotId);
  if (i < 0) return "Игрок";
  return `Игрок ${i + 1}`;
}

/** stored — сырое имя из профиля; пусто → слот по умолчанию. */
export function effectiveDisplayName(
  slotId: string,
  stored: string | undefined
): string {
  const t = stored?.trim();
  if (t) return t;
  return defaultDisplayNameForSlot(slotId);
}
