/** Клетки: стартовые юниты, потолок пассивного +1 (передача снарядами выше капа). */
export const CELL = {
  neutralStart: 20,
  playerStart: 50,
  /** Пассивный рост (+1 тик) останавливается на этом значении. */
  ownedCap: 100,
  growthMs: 650,
  /** После попадания по нейтрали/врагу пассивный +1 не идёт столько мс. */
  growthPauseMs: 1000,
} as const;

/** Снаряд / выстрел (синхронно на клиенте и сервере). */
export const SHOT = {
  speedPerMs: 0.00034,
  projectileR: 0.034,
  /** Максимум снарядов за один залп; остаток — следующими залпами в очереди. */
  maxProjectilesPerSalvo: 100,
  waveSize: 5,
  bulletBatchGapMs: 200,
  neighborCenterDistBallDiameters: 1.1,
  wedgeAlongBallDiametersPerRank: 0.45,
  explosionDurationMs: 420,
  /** Красная рамка 1px вокруг каждой волны залпа (отладка). */
  debugWaveBorders: false,
  /** Синяя рамка 1px вокруг каждого снаряда (отладка). */
  debugProjectileBorders: false,
} as const;

/**
 * Координаты карт в viewBox ~в 150× крупнее единицы сетки — тот же множитель, что в `mapScale.ts`.
 */
export const TERRITORY_SHOT_SPEED_FACTOR = 150;

export const MAP_SHOT_SPEED_PER_MS =
  SHOT.speedPerMs * TERRITORY_SHOT_SPEED_FACTOR;

/** Радиус кружка точки на карте мира (viewBox). */
export const TERRITORY_DOT_RADIUS = 14 / 1.5;

/** Кольцо территории: радиус точки + отступ (viewBox). */
export const TERRITORY_DOT_RING_PADDING = 8;
export const TERRITORY_SPOT_RING_RADIUS =
  TERRITORY_DOT_RADIUS + TERRITORY_DOT_RING_PADDING;

/**
 * Базовый делитель: диаметр точки ÷ это число (меньше — крупнее).
 * Итоговый размер = базовый ÷ `TERRITORY_PROJECTILE_SIZE_MULTIPLIER`.
 */
const TERRITORY_PROJECTILE_DIAMETER_RATIO_BASE = 1.5;

/** Во сколько раз крупнее пули/бойцы в полёте (1 = размер до увеличения). */
export const TERRITORY_PROJECTILE_SIZE_MULTIPLIER = 3;

/**
 * Размер пули в viewBox. Меняйте multiplier или BASE — клиент, сервер и залп синхронны.
 */
export const TERRITORY_PROJECTILE_DIAMETER_RATIO =
  TERRITORY_PROJECTILE_DIAMETER_RATIO_BASE /
  TERRITORY_PROJECTILE_SIZE_MULTIPLIER;

/** Радиус пули в viewBox для радиуса точки `dotRadius`. */
export function projectileRadiusFromDot(dotRadius: number): number {
  return dotRadius / TERRITORY_PROJECTILE_DIAMETER_RATIO;
}

/** Эталонный радиус пули (точка = `TERRITORY_DOT_RADIUS` на карте Азии). */
export const TERRITORY_PROJECTILE_R =
  projectileRadiusFromDot(TERRITORY_DOT_RADIUS);

/** @deprecated Используйте TERRITORY_PROJECTILE_R — 0.034 слишком мало для viewBox. */
export const MAP_PROJECTILE_R = TERRITORY_PROJECTILE_R;
