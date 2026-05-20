import {
  TERRITORY_DOT_RING_PADDING,
  TERRITORY_SPOT_RING_RADIUS,
} from "./constants.js";
import {
  mapGameplayScaleForMapId,
  REFERENCE_MEET_SCALE,
} from "./mapGameplayScale.js";
import {
  projectilePositionAtProgress,
  type ProjectilePath,
} from "./projectileMotion.js";
import type { BuildingSkinId } from "./skinIds.js";

/** Эталон половины пина здания на карте (px → viewBox через meet). */
const FORTRESS_MAP_PIN_HALF_PX = 84 * 1.15 * 0.78 * 0.5;
import {
  applyLandHitUnitsOnly,
  pauseCellGrowth,
  type CombatCell,
} from "./landHit.js";

/** Защитная граница крепости (freedomCastle / freedomCastle4441). */
export const FORTRESS_SHIELD = {
  max: 20,
  /** Старт партии и сразу после захвата новой точки. */
  initial: 5,
  regenMs: 2_000,
  hitPauseMs: 2_000,
} as const;

export type FortressHitContext = {
  defenderBuilding?: BuildingSkinId;
  attackerBuilding?: BuildingSkinId;
};

export function isFortressBuilding(skin: BuildingSkinId | undefined): boolean {
  return skin === "freedomCastle" || skin === "freedomCastle4441";
}

export function readFortressShield(cell: Pick<CombatCell, "fortressShield">): number {
  const raw = cell.fortressShield;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.min(
    FORTRESS_SHIELD.max,
    Math.max(0, Math.floor(raw))
  );
}

/** Кольцо и перехват снарядов — только при щите > 0. */
export function hasActiveFortressShield(
  cell: Pick<CombatCell, "fortressShield">
): boolean {
  return readFortressShield(cell) > 0;
}

/** Толщина обводки: 1px + 1px за каждое очко щита (макс. 20 → 21px). */
export function fortressShieldBorderPx(shield: number): number {
  return 1 + readFortressShield({ fortressShield: shield });
}

export function cellWithFortressShield<T extends CombatCell>(
  cell: T,
  shield: number
): T {
  const next = Math.min(
    FORTRESS_SHIELD.max,
    Math.max(0, Math.floor(shield))
  );
  if (readFortressShield(cell) === next) return cell;
  return { ...cell, fortressShield: next };
}

export function stripFortressShieldFields<T extends CombatCell>(cell: T): T {
  if (
    cell.fortressShield === undefined &&
    cell.fortressShieldRegenPausedUntil === undefined
  ) {
    return cell;
  }
  const {
    fortressShield: _s,
    fortressShieldRegenPausedUntil: _p,
    ...rest
  } = cell;
  return rest as T;
}

export function initFortressCell<T extends CombatCell>(cell: T): T {
  return cellWithFortressShield(
    { ...stripFortressShieldFields(cell), fortressShieldRegenPausedUntil: undefined },
    FORTRESS_SHIELD.initial
  );
}

export function initFortressCellIfOwner<T extends CombatCell>(
  cell: T,
  building?: BuildingSkinId
): T {
  if (cell.ownerId && isFortressBuilding(building)) {
    return initFortressCell(cell);
  }
  return stripFortressShieldFields(cell);
}

function pauseFortressRegen<T extends CombatCell>(
  cell: T,
  nowMs: number
): T {
  return {
    ...cell,
    fortressShieldRegenPausedUntil: nowMs + FORTRESS_SHIELD.hitPauseMs,
  };
}

function afterCaptureFortressCell<T extends CombatCell>(
  cell: T,
  wasOwnerId: string | undefined,
  attackerBuilding?: BuildingSkinId
): T {
  const captured =
    cell.ownerId != null && cell.ownerId !== wasOwnerId;
  if (!captured) return cell;
  if (isFortressBuilding(attackerBuilding)) {
    return initFortressCell(stripFortressShieldFields(cell));
  }
  return stripFortressShieldFields(cell);
}

/**
 * Попадание снаряда с учётом щита крепости защитника.
 */
export function applyLandHitWithFortressShield<T extends CombatCell>(
  cell: T,
  attackerId: string,
  power: number,
  ctx: FortressHitContext,
  nowMs: number = Date.now()
): T {
  const hitPower = Math.floor(Number(power));
  if (!Number.isFinite(hitPower) || hitPower <= 0) return cell;

  const wasOwnerId = cell.ownerId;
  const defenderBuilding = ctx.defenderBuilding;
  const attackerBuilding = ctx.attackerBuilding;

  if (
    !wasOwnerId ||
    wasOwnerId === attackerId ||
    !isFortressBuilding(defenderBuilding)
  ) {
    const hit = applyLandHitUnitsOnly(
      cell,
      attackerId,
      hitPower,
      nowMs,
      attackerBuilding
    );
    return afterCaptureFortressCell(hit, wasOwnerId, attackerBuilding);
  }

  let current: T = cell;
  let remaining = hitPower;
  const shieldBefore = readFortressShield(current);

  if (shieldBefore > 0) {
    const absorbed = Math.min(shieldBefore, remaining);
    remaining -= absorbed;
    current = cellWithFortressShield(current, shieldBefore - absorbed);
  }

  current = pauseFortressRegen(pauseCellGrowth(current, nowMs), nowMs);

  if (remaining <= 0) {
    return current;
  }

  const hit = applyLandHitUnitsOnly(
    current,
    attackerId,
    remaining,
    nowMs,
    attackerBuilding
  );
  return afterCaptureFortressCell(hit, wasOwnerId, attackerBuilding);
}

/** +1 щита каждые 2 с (оффлайн / сервер). */
export function bumpFortressShields<T extends CombatCell>(
  cells: readonly T[],
  buildingForOwner: (ownerId: string) => BuildingSkinId | undefined,
  nowMs: number = Date.now()
): T[] | null {
  let changed = false;
  const next = cells.map((cell) => {
    const ownerId = cell.ownerId;
    if (!ownerId) return { ...cell };
    const building = buildingForOwner(ownerId);
    if (!isFortressBuilding(building)) {
      if (
        cell.fortressShield !== undefined ||
        cell.fortressShieldRegenPausedUntil !== undefined
      ) {
        changed = true;
        return stripFortressShieldFields(cell);
      }
      return cell;
    }

    const pausedUntil = cell.fortressShieldRegenPausedUntil ?? 0;
    if (nowMs < pausedUntil) return { ...cell };

    let shield = readFortressShield(cell);
    if (shield <= 0 && cell.fortressShield === undefined) {
      shield = FORTRESS_SHIELD.initial;
    }
    if (shield >= FORTRESS_SHIELD.max) {
      if (shield !== readFortressShield(cell)) {
        changed = true;
        return cellWithFortressShield(cell, shield);
      }
      return cell;
    }

    changed = true;
    return cellWithFortressShield(cell, shield + 1);
  });
  return changed ? next : null;
}

/** Радиус щита в viewBox (кольцо + корпус GLB-здания на точке). */
export function fortressShieldHitRadiusViewBox(
  spotRingRadius: number,
  shieldPoints: number,
  meetScale?: number
): number {
  const shield = readFortressShield({ fortressShield: shieldPoints });
  const ringExtra = spotRingRadius * (0.14 + shield * 0.028);
  const pinHalfVb =
    meetScale != null && meetScale > 0
      ? FORTRESS_MAP_PIN_HALF_PX / meetScale
      : spotRingRadius * 2.1;
  return Math.max(spotRingRadius + ringExtra, pinHalfVb + ringExtra * 0.85);
}

export type FortressFlightInterceptInput = {
  sx: number;
  sy: number;
  cellCenterX: number;
  cellCenterY: number;
  attackerId: string;
  targetOwnerId: string | undefined;
  defenderBuilding: BuildingSkinId | undefined;
  fortressShield: number | undefined;
  spotRingRadius: number;
  meetScale?: number;
};

export function shouldFortressProjectileIntercept(
  input: FortressFlightInterceptInput
): boolean {
  return (
    Boolean(input.targetOwnerId) &&
    input.targetOwnerId !== input.attackerId &&
    isFortressBuilding(input.defenderBuilding) &&
    hasActiveFortressShield({ fortressShield: input.fortressShield })
  );
}

export function spotRingRadiusForMap(
  mapId: string,
  dotRadius?: number,
  meetScale?: number
): number {
  if (dotRadius != null && meetScale != null && meetScale > 0) {
    return (
      dotRadius + (TERRITORY_DOT_RING_PADDING * REFERENCE_MEET_SCALE) / meetScale
    );
  }
  return TERRITORY_SPOT_RING_RADIUS * mapGameplayScaleForMapId(mapId);
}

export type FortressProjectileIntercept = {
  tx: number;
  ty: number;
  pathLength: number;
  /** Цель — щит крепости, не центр здания. */
  intercepted: boolean;
};

function pathLengthAlongArc(path: ProjectilePath, landK: number): number {
  const steps = Math.max(4, Math.ceil(landK * 48));
  let length = 0;
  let prev = projectilePositionAtProgress(path, 0);
  for (let i = 1; i <= steps; i++) {
    const k = (i / 48) * landK;
    const p = projectilePositionAtProgress(path, k);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return Math.max(length, 1e-6);
}

/**
 * Точка приземления на дуге полёта: первое касание сферы щита вокруг центра точки.
 */
export function fortressProjectileLandOnArc(
  input: FortressFlightInterceptInput & {
    arcPerpX: number;
    arcPerpY: number;
    chordLength: number;
  }
): FortressProjectileIntercept {
  const distToCenter = input.chordLength;
  if (!shouldFortressProjectileIntercept(input)) {
    return {
      tx: input.cellCenterX,
      ty: input.cellCenterY,
      pathLength: distToCenter,
      intercepted: false,
    };
  }

  const shieldR = fortressShieldHitRadiusViewBox(
    input.spotRingRadius,
    input.fortressShield ?? 0,
    input.meetScale
  );

  const path: ProjectilePath = {
    spawnTime: 0,
    flightDuration: 1,
    sx: input.sx,
    sy: input.sy,
    tx: input.cellCenterX,
    ty: input.cellCenterY,
    arcPerpX: input.arcPerpX,
    arcPerpY: input.arcPerpY,
  };

  const steps = 48;
  let landK = 1;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const pos = projectilePositionAtProgress(path, k);
    const d = Math.hypot(
      pos.x - input.cellCenterX,
      pos.y - input.cellCenterY
    );
    if (d <= shieldR) {
      landK = k;
      break;
    }
  }

  const landPos = projectilePositionAtProgress(path, landK);
  return {
    tx: landPos.x,
    ty: landPos.y,
    pathLength: pathLengthAlongArc(path, landK),
    intercepted: landK < 1 - 1e-5,
  };
}

/** Упрощённый перехват по хорде (серверный fallback). */
export function fortressProjectileIntercept(
  sx: number,
  sy: number,
  cellCenterX: number,
  cellCenterY: number,
  attackerId: string,
  targetOwnerId: string | undefined,
  defenderBuilding: BuildingSkinId | undefined,
  fortressShield: number | undefined,
  spotRingRadius: number,
  meetScale?: number
): FortressProjectileIntercept {
  const dx = cellCenterX - sx;
  const dy = cellCenterY - sy;
  const distToCenter = Math.hypot(dx, dy) || 1;

  const input: FortressFlightInterceptInput = {
    sx,
    sy,
    cellCenterX,
    cellCenterY,
    attackerId,
    targetOwnerId,
    defenderBuilding,
    fortressShield,
    spotRingRadius,
    meetScale,
  };

  if (!shouldFortressProjectileIntercept(input)) {
    return {
      tx: cellCenterX,
      ty: cellCenterY,
      pathLength: distToCenter,
      intercepted: false,
    };
  }

  const shieldR = fortressShieldHitRadiusViewBox(
    spotRingRadius,
    fortressShield ?? 0,
    meetScale
  );
  if (distToCenter <= shieldR) {
    return {
      tx: cellCenterX,
      ty: cellCenterY,
      pathLength: distToCenter,
      intercepted: true,
    };
  }

  const travel = distToCenter - shieldR;
  const k = travel / distToCenter;
  return {
    tx: sx + dx * k,
    ty: sy + dy * k,
    pathLength: Math.max(travel, 1e-6),
    intercepted: true,
  };
}
