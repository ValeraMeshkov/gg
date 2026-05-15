import { CELL } from "./constants";
import { MOCK_USER, MOCK_USER_2, MOCK_USER_3 } from "./mock/user";

export type OwnedTerritoryColors = {
  fill: string;
  stroke: string;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number
): string {
  const r = Math.round(lerp(from[0], to[0], t));
  const g = Math.round(lerp(from[1], to[1], t));
  const b = Math.round(lerp(from[2], to[2], t));
  return `rgb(${r},${g},${b})`;
}

/**
 * Захваченная клетка: яркость по юнитам (0 … `CELL.ownedCap`, дальше — максимум),
 * тем ярче заливка и обводка; при 0 — самые светлые оттенки, от 100+ — максимум.
 */
export function ownedTerritoryColors(
  ownerId: string,
  units: number
): OwnedTerritoryColors | null {
  if (
    ownerId !== MOCK_USER.id &&
    ownerId !== MOCK_USER_2.id &&
    ownerId !== MOCK_USER_3.id
  ) {
    return null;
  }

  const u = Math.max(0, units);
  const t = Math.min(1, u / CELL.ownedCap);

  if (ownerId === MOCK_USER.id) {
    const fillPale: [number, number, number] = [232, 244, 255];
    const fillFull: [number, number, number] = [45, 158, 255];
    const strokePale: [number, number, number] = [200, 224, 248];
    const strokeFull: [number, number, number] = [20, 110, 210];
    return {
      fill: lerpRgb(fillPale, fillFull, t),
      stroke: lerpRgb(strokePale, strokeFull, t),
    };
  }

  if (ownerId === MOCK_USER_2.id) {
    const fillPale: [number, number, number] = [255, 238, 228];
    const fillFull: [number, number, number] = [255, 118, 72];
    const strokePale: [number, number, number] = [255, 210, 188];
    const strokeFull: [number, number, number] = [220, 75, 40];
    return {
      fill: lerpRgb(fillPale, fillFull, t),
      stroke: lerpRgb(strokePale, strokeFull, t),
    };
  }

  const fillPale: [number, number, number] = [236, 245, 230];
  const fillFull: [number, number, number] = [72, 178, 96];
  const strokePale: [number, number, number] = [200, 228, 200];
  const strokeFull: [number, number, number] = [28, 112, 52];
  return {
    fill: lerpRgb(fillPale, fillFull, t),
    stroke: lerpRgb(strokePale, strokeFull, t),
  };
}

/** Заливка кружка: всегда насыщенный «полный» цвет игрока (не бледный градиент территории). */
export function ownedDotFill(ownerId: string): string | null {
  const maxed = ownedTerritoryColors(ownerId, CELL.ownedCap);
  return maxed?.fill ?? null;
}

const RGB_RE = /^rgb\((\d+),(\d+),(\d+)\)$/;
const AIM_BLEND_WHITE: [number, number, number] = [255, 255, 255];

function parseRgb(color: string): [number, number, number] | null {
  const m = RGB_RE.exec(color);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Приглушённый оттенок игрока (доля цвета к белому). */
function softPlayerTint(color: string, amount: number): string {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  return lerpRgb(AIM_BLEND_WHITE, rgb, amount);
}

/** Стрелки прицеливания: лёгкий оттенок активного игрока. */
export function aimColorsForPlayer(playerId: string): {
  stroke: string;
  head: string;
} {
  const owned = ownedTerritoryColors(playerId, CELL.ownedCap);
  if (!owned) {
    return {
      stroke: "rgba(72, 168, 96, 0.38)",
      head: "rgba(48, 140, 72, 0.48)",
    };
  }
  return {
    stroke: softPlayerTint(owned.fill, 0.32),
    head: softPlayerTint(owned.stroke, 0.24),
  };
}
