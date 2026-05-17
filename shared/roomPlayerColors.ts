import {
  defaultDisplayColorForSlot,
  DISPLAY_COLORS,
  type DisplayColorId,
} from "./displayColors.js";
import { slotIndexFromId } from "./playerSlots.js";

/** Уникальный displayColor в комнате: при занятости — следующий свободный. */
export function resolveRoomDisplayColor(
  slotId: string,
  requested: DisplayColorId,
  assigned: ReadonlyMap<string, DisplayColorId>
): DisplayColorId {
  const usedByOthers = new Set(
    [...assigned.entries()]
      .filter(([id]) => id !== slotId)
      .map(([, color]) => color)
  );
  if (!usedByOthers.has(requested)) return requested;
  for (const c of DISPLAY_COLORS) {
    if (!usedByOthers.has(c)) return c;
  }
  return requested;
}

export function sortSyncAppearancesBySlot<
  T extends { slotId: string },
>(players: readonly T[]): T[] {
  return [...players].sort(
    (a, b) => slotIndexFromId(a.slotId) - slotIndexFromId(b.slotId)
  );
}

export function preferredDisplayColorForSlot(
  slotId: string,
  fromMessage?: DisplayColorId | null,
  fromProfile?: DisplayColorId | null
): DisplayColorId {
  return (
    fromMessage ?? fromProfile ?? defaultDisplayColorForSlot(slotId)
  );
}

/** Разводит displayColor по слотам в уже собранной карте внешности. */
export function applyResolvedRoomColors<
  T extends { displayColor: DisplayColorId },
>(appearances: Record<string, T>, slotIds?: readonly string[]): Record<string, T> {
  const ids =
    slotIds && slotIds.length > 0
      ? sortSyncAppearancesBySlot(slotIds.map((slotId) => ({ slotId }))).map(
          (p) => p.slotId
        )
      : sortSyncAppearancesBySlot(
          Object.keys(appearances).map((slotId) => ({ slotId }))
        ).map((p) => p.slotId);

  const assigned = new Map<string, DisplayColorId>();
  const out: Record<string, T> = { ...appearances };

  for (const slotId of ids) {
    const app = appearances[slotId];
    if (!app) continue;
    const displayColor = resolveRoomDisplayColor(
      slotId,
      app.displayColor,
      assigned
    );
    assigned.set(slotId, displayColor);
    if (displayColor !== app.displayColor) {
      out[slotId] = { ...app, displayColor };
    }
  }

  return out;
}
