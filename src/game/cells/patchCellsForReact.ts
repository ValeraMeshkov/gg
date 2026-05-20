import type { MapCell } from "@/game/maps/types";
import { sanitizeCombatCell } from "@/shared/cellUnits";

/** Поля клетки, влияющие на отрисовку карты и GLB-оверлея. */
export function cellsRenderEqual(a: MapCell, b: MapCell): boolean {
  return (
    a.ownerId === b.ownerId &&
    a.units === b.units &&
    a.growthPausedUntil === b.growthPausedUntil &&
    a.fortressShield === b.fortressShield &&
    a.fortressShieldRegenPausedUntil === b.fortressShieldRegenPausedUntil &&
    a.active === b.active
  );
}

/**
 * Обновляет React-state клеток с переиспользованием ссылок на неизменённые клетки —
 * memo на точках карты и GLB не перерисовываются без нужды.
 */
export function patchCellsForReact(
  prev: readonly MapCell[],
  next: readonly MapCell[]
): MapCell[] {
  if (prev.length !== next.length) {
    return next.map((c) => sanitizeCombatCell({ ...c }));
  }
  let changed = false;
  const out: MapCell[] = new Array(next.length);
  for (let i = 0; i < next.length; i += 1) {
    const sanitized = sanitizeCombatCell({ ...next[i]! });
    const old = prev[i]!;
    if (cellsRenderEqual(old, sanitized)) {
      out[i] = old;
    } else {
      out[i] = sanitized;
      changed = true;
    }
  }
  return changed ? out : (prev as MapCell[]);
}
