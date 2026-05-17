import { PLAYER_SLOT_IDS } from "@/shared/playerSlots";
import { UI } from "@/constants/uiStrings";

export function defaultDisplayNameForSlot(slotId: string): string {
  const i = PLAYER_SLOT_IDS.indexOf(slotId);
  if (i < 0) return UI.playerDefault;
  return UI.playerSlot(i + 1);
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
