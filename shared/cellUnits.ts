import { CELL } from "./constants.js";
import type { CombatCell } from "./combat.js";

/** Безопасное чтение юнитов клетки (число ≥ 0, без конкатенации строк). */
export function readCellUnits(cell: Pick<CombatCell, "units"> | undefined): number {
  const raw = cell?.units;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export function capForCellOwner(ownerId?: string): number {
  return ownerId ? CELL.ownedCap : CELL.neutralStart;
}

/** Ограничить юниты клетки по владельцу (нейтрал / своя). */
export function clampCellUnits(units: number, ownerId?: string): number {
  const cap = capForCellOwner(ownerId);
  return Math.min(cap, Math.max(0, Math.floor(units)));
}

/** Исправить битые значения после старых багов или некорректного JSON. */
export function sanitizeCombatCell<T extends CombatCell>(cell: T): T {
  const u = clampCellUnits(readCellUnits(cell), cell.ownerId);
  if (cell.units === u) return cell;
  return { ...cell, units: u };
}
