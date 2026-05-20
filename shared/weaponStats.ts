import type { FighterSkinId } from "./skinIds.js";

export const WEAPON_IDS = [
  "bullet",
  "bomb",
  "poison",
  "potion",
  "dagger",
] as const;

export type WeaponId = (typeof WEAPON_IDS)[number];

/** То же, что `WeaponId` — ключ анимации / визуала патрона на клиенте. */
export type AttackAnimationId = WeaponId;

/** Параметры залпа и боя снаряда (клиент + сервер). */
export type WeaponStats = {
  id: WeaponId;
  /** Сколько снарядов в одной волне. */
  waveSize: number;
  /** Задержка между вылетом снарядов внутри волны (мс). */
  spawnStaggerMs: number;
  /** Пауза между волнами (мс). */
  waveGapMs: number;
  speedMultiplier: number;
  /** Сила: «жизни» в воздухе и урон по клетке. */
  power: number;
  /** Масштаб отображения спрайта на карте и в настройках. */
  visualScale: number;
  /**
   * Поперечный шаг в волне (× диаметр снаряда). Меньше — ближе в ряд.
   * Эталон: `SHOT.neighborCenterDistBallDiameters` (1.1).
   */
  lateralSpacingBallDiameters: number;
  /** Клин у точки вылета (× диаметр снаряда). Эталон: 0.45. */
  wedgeAlongBallDiameters: number;
  /** Скорость вращения spin-спрайта. 1 = эталон, 2 = в 2 раза быстрее. */
  spinSpeed: number;
};
const DEFAULT_WEAPON = {
  lateralSpacingBallDiameters: 1, // в ширину ряда частота элементов
  wedgeAlongBallDiameters: 1, // клин чем меньше значение тем меньше клин
  spinSpeed: 1, // вращение spin-спрайта
} as const;

/** Пуля / треугольник — одиночный выстрел. */
const BULLET: WeaponStats = {
  id: "bullet",
  waveSize: 1,
  spawnStaggerMs: 0,
  waveGapMs: 200,
  speedMultiplier: 1.5,
  power: 1,
  visualScale: 1,
  ...DEFAULT_WEAPON,
};

/**
 * Дагер — залп из нескольких кинжалов.
 * Шаг в ряду: `lateralSpacingBallDiameters`, `wedgeAlongBallDiameters`, `spawnStaggerMs`.
 */
const DAGGER: WeaponStats = {
  id: "dagger",
  waveSize: 5,
  spawnStaggerMs: 100,
  waveGapMs: 500,
  speedMultiplier: 1.5,
  power: 1,
  visualScale: 0.75,
  ...DEFAULT_WEAPON,
  lateralSpacingBallDiameters: 0.3,
  spinSpeed: 5,
};

const BOMB: WeaponStats = {
  id: "bomb",
  waveSize: 2,
  spawnStaggerMs: 400,
  waveGapMs: 800,
  speedMultiplier: 1,
  power: 3,
  visualScale: 1,
  ...DEFAULT_WEAPON,
  lateralSpacingBallDiameters: 0.6,
};

/** Яд — сила 2, быстрее бомбы. */
const POISON: WeaponStats = {
  id: "poison",
  waveSize: 3,
  spawnStaggerMs: 300,
  waveGapMs: 600,
  speedMultiplier: 1.15,
  power: 2,
  visualScale: 0.4,
  ...DEFAULT_WEAPON,
  lateralSpacingBallDiameters: 0.45,
};

/** Зелье — сила 2, средняя скорость. */
const POTION: WeaponStats = {
  id: "potion",
  waveSize: 4,
  spawnStaggerMs: 200,
  waveGapMs: 800,
  speedMultiplier: 1.2,
  power: 2,
  visualScale: 0.5,
  ...DEFAULT_WEAPON,
  lateralSpacingBallDiameters: 0.35,
};

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  bullet: BULLET,
  bomb: BOMB,
  poison: POISON,
  potion: POTION,
  dagger: DAGGER,
};

const WEAPON_BY_FIGHTER: Partial<Record<FighterSkinId, WeaponId>> = {
  bomb: "bomb",
  poison: "poison",
  potion: "potion",
  dagger: "dagger",
};

/** Визуал снаряда в полёте — по оружию выстрела, не по текущему скину в настройках. */
const FIGHTER_BY_WEAPON: Record<WeaponId, FighterSkinId> = {
  bullet: "triangle",
  bomb: "bomb",
  poison: "poison",
  potion: "potion",
  dagger: "dagger",
};

export function fighterSkinForWeapon(weapon: WeaponId): FighterSkinId {
  return FIGHTER_BY_WEAPON[weapon];
}

export function weaponIdForFighter(fighter: string): WeaponId {
  return WEAPON_BY_FIGHTER[fighter as FighterSkinId] ?? "bullet";
}

export function weaponStatsForFighter(fighter: string): WeaponStats {
  return WEAPONS[weaponIdForFighter(fighter)];
}

export function weaponStatsById(id: WeaponId): WeaponStats {
  return WEAPONS[id];
}
