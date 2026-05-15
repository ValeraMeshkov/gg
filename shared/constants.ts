/** Клетки: стартовые юниты, потолок пассивного роста. */
export const CELL = {
  neutralStart: 20,
  playerStart: 100,
  ownedCap: 100,
  growthMs: 650,
} as const;

/** Снаряд / выстрел (синхронно на клиенте и сервере). */
export const SHOT = {
  speedPerMs: 0.00034,
  projectileR: 0.034,
  waveSize: 5,
  bulletBatchGapMs: 200,
  neighborCenterDistBallDiameters: 1.1,
  wedgeAlongBallDiametersPerRank: 0.45,
  explosionDurationMs: 420,
} as const;

/**
 * Координаты карт в viewBox ~в 150× крупнее единицы сетки — тот же множитель, что в `mapScale.ts`.
 */
export const TERRITORY_SHOT_SPEED_FACTOR = 150;

export const MAP_SHOT_SPEED_PER_MS =
  SHOT.speedPerMs * TERRITORY_SHOT_SPEED_FACTOR;

/** Радиус кружка точки на карте мира (viewBox), как в `mapLayout.ts`. */
export const TERRITORY_DOT_RADIUS = 14 / 1.5;

/** Радиус пули в viewBox: диаметр кружка ÷ 3. */
export const TERRITORY_PROJECTILE_R =
  (TERRITORY_DOT_RADIUS * 2) / 3 / 2;

/** @deprecated Используйте TERRITORY_PROJECTILE_R — 0.034 слишком мало для viewBox. */
export const MAP_PROJECTILE_R = TERRITORY_PROJECTILE_R;
