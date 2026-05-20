import { CELL } from "./constants.js";
import type { BuildingSkinId } from "./skinIds.js";

/** Бонус силы сразу после захвата клетки. */
export type CaptureBonusConfig = {
  neutral: number;
  enemy: number;
};

/** Периодический призыв на нейтраль (скелет). */
export type SkeletonSpawnConfig = {
  /** Второй боец сразу после старта партии. */
  startSecondMinion: boolean;
  intervalMs: number;
  spawnUnits: number;
};

/** Пассивные и боевые правила владельца с этим зданием. */
export type BuildingMechanicsConfig = {
  /**
   * Пауза после +1 HP (мс). Если меньше `CELL.growthMs` — свой тик роста
   * (`passiveGrowthIntervalMs`), иначе замеднение на общем тике.
   */
  passiveGrowthMs?: number;
  /** Свой интервал пассивного +1 (зомби: 500 мс → 2 HP/с). */
  passiveGrowthIntervalMs?: number;
  /** Стартовые юниты при выдаче своей клетки (иначе `CELL.playerStart`). */
  playerStart?: number;
  /** Потолок пассивного роста на своих клетках. */
  ownedCap?: number;
  captureBonus?: CaptureBonusConfig;
  skeletonSpawn?: SkeletonSpawnConfig;
  /** Доп. свои клетки в начале партии (зомби: +1). */
  extraStartTerritories?: number;
};

const MECHANICS: Partial<Record<BuildingSkinId, BuildingMechanicsConfig>> = {
  pixellabsSkeletonArcher4240: {
    skeletonSpawn: {
      startSecondMinion: true,
      intervalMs: 10_000,
      spawnUnits: 1,
    },
  },
  pixellabsZombie: {
    extraStartTerritories: 1,
    /** +1 HP каждые 500 мс → 2 HP/с (отдельный тик, см. `ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS`). */
    passiveGrowthIntervalMs: 500,
    /** Низкий потолок — стеклянная пушка, но быстро отхиливается. */
    ownedCap: 50,
    /** Сила на клетке после убийства/захвата нейтрали или врага. */
    captureBonus: { neutral: 25, enemy: 25 },
  },
  blendertimerHeart23: {
    playerStart: 60,
    ownedCap: 120,
    /** См. `heartLife.ts` — сеть линий и выравнивание HP. */
  },
};

/** Скин перечислен в `MECHANICS` — у здания есть особые игровые правила. */
export function hasNonDefaultBuildingMechanics(
  skin: BuildingSkinId | undefined
): boolean {
  return skin != null && MECHANICS[skin] !== undefined;
}

export function buildingMechanics(
  skin: BuildingSkinId | undefined
): BuildingMechanicsConfig {
  if (!skin) return {};
  return MECHANICS[skin] ?? {};
}

export function passiveGrowthMsForBuilding(
  skin: BuildingSkinId | undefined
): number {
  return buildingMechanics(skin).passiveGrowthMs ?? CELL.growthMs;
}

export function passiveGrowthIntervalMsForBuilding(
  skin: BuildingSkinId | undefined
): number | undefined {
  return buildingMechanics(skin).passiveGrowthIntervalMs;
}

/** Интервал отдельного тика роста зомби (2 HP/с при +1 за тик). */
export const ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS =
  MECHANICS.pixellabsZombie!.passiveGrowthIntervalMs!;

export function usesDedicatedPassiveGrowthTick(
  skin: BuildingSkinId | undefined
): boolean {
  return passiveGrowthIntervalMsForBuilding(skin) != null;
}

export function playerStartForBuilding(
  skin: BuildingSkinId | undefined
): number {
  return buildingMechanics(skin).playerStart ?? CELL.playerStart;
}

export function ownedCapForBuilding(skin: BuildingSkinId | undefined): number {
  return buildingMechanics(skin).ownedCap ?? CELL.ownedCap;
}

export function skeletonSpawnConfig(
  skin: BuildingSkinId | undefined
): SkeletonSpawnConfig | undefined {
  return buildingMechanics(skin).skeletonSpawn;
}

export function extraStartTerritoriesForBuilding(
  skin: BuildingSkinId | undefined
): number {
  const n = buildingMechanics(skin).extraStartTerritories ?? 0;
  return Math.max(0, Math.floor(n));
}

/** @deprecated используйте `skeletonSpawnConfig` */
export function hasSkeletonSpawn(skin: BuildingSkinId | undefined): boolean {
  return skeletonSpawnConfig(skin) != null;
}

/**
 * Сила на клетке после захвата. Без перка — остаток снаряда (как раньше).
 */
export function unitsOnCapture(
  attackerBuilding: BuildingSkinId | undefined,
  previousOwnerId: string | undefined,
  attackerId: string,
  overflowUnits: number
): number {
  const bonus = buildingMechanics(attackerBuilding).captureBonus;
  const cap = ownedCapForBuilding(attackerBuilding);
  if (bonus) {
    if (!previousOwnerId) {
      return Math.min(bonus.neutral, cap);
    }
    if (previousOwnerId !== attackerId) {
      return Math.min(bonus.enemy, cap);
    }
  }
  return Math.min(Math.max(0, Math.floor(overflowUnits)), cap);
}

/** Интервал тика призыва скелетов (для game loop). */
export const SKELETON_SPAWN_INTERVAL_MS =
  MECHANICS.pixellabsSkeletonArcher4240!.skeletonSpawn!.intervalMs;
