/** Клетки: стартовые юниты, потолок только для пассивного +1, период роста. */
export const CELL = {
  neutralStart: 20,
  playerStart: 100,
  /** Пассивный рост в своём круге останавливается на этом значении; снаряды могут накидывать выше. */
  ownedCap: 100,
  growthMs: 650,
} as const;

/** Отрисовка карты в координатах viewBox (клетка = 1). */
export const VIEW = {
  labelFont: 0.09,
} as const;

/**
 * Снаряд / выстрел: `speedPerMs` — длительность полёта по прямой **центр кружка → центр кружка** (`mapDotCenter`).
 * Пачки по `waveSize` стартуют одновременно; внутри пачки — шеренга ⊥ линии к цели (шаг `neighborCenterDistBallDiameters`×диаметр) и клин вдоль выстрела (`wedgeAlongBallDiametersPerRank`). Следующая пачка — `bulletBatchGapMs`. С источника −N за пачку, на цель +1 за пулю.
 */
export const SHOT = {
  speedPerMs: 0.00034,
  projectileR: 0.034,
  /** Сколько пуль вылетает одним моментом. */
  waveSize: 5,
  /** Пауза между стартом соседних пачек (мс). */
  bulletBatchGapMs: 200,
  /** Центр–центр соседей в шеренге пачки = число × диаметр (`2·projectileR`). */
  neighborCenterDistBallDiameters: 1.1,
  /**
   * Клин по вылету: сдвиг старта вдоль линии «источник → цель» на один ранг клина,
   * в диаметрах шара. Центр ряда ближе к цели, края — ближе к источнику.
   */
  wedgeAlongBallDiametersPerRank: 0.45,
  /** Взрыв при столкновении двух пуль: длительность (мс). */
  explosionDurationMs: 420,
} as const;
