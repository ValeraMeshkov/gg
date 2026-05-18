import { CELL } from "./constants.js";
import type { CombatCell } from "./combat.js";

/** Безопасное чтение юнитов клетки (число ≥ 0, без конкатенации строк). */
export function readCellUnits(cell: Pick<CombatCell, "units"> | undefined): number {
  const raw = cell?.units;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/** Потолок пассивного роста (+1 тик) и захвата с остатком силы. */
export function capForCellOwner(ownerId?: string): number {
  return ownerId ? CELL.ownedCap : CELL.neutralStart;
}

/** Ограничить юниты клетки по владельцу (нейтрал / захват / потери в бою). */
export function clampCellUnits(units: number, ownerId?: string): number {
  const cap = capForCellOwner(ownerId);
  return Math.min(cap, Math.max(0, Math.floor(units)));
}

/** Передача на свою / союзную клетку — выше `ownedCap` разрешена. */
export function addUnitsToFriendlyCell(current: number, delta: number): number {
  const d = Math.floor(Number(delta));
  if (!Number.isFinite(d)) return Math.max(0, Math.floor(current));
  return Math.max(0, Math.floor(current) + d);
}

/** Исправить битые значения после старых багов или некорректного JSON. */
export function sanitizeCombatCell<T extends CombatCell>(cell: T): T {
  const u = readCellUnits(cell);
  if (!cell.ownerId) {
    const capped = clampCellUnits(u, undefined);
    if (cell.units === capped) return cell;
    return { ...cell, units: capped };
  }
  const next = Math.max(0, Math.floor(u));
  if (cell.units === next) return cell;
  return { ...cell, units: next };
}
