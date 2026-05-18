import type { AttackAnimationId } from "@/shared/weaponStats";

export type ProjectileSim = {
  id: string;
  flightFid: string;
  releaseWave: number;
  spawnTime: number;
  flightDuration: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  arcPerpX: number;
  arcPerpY: number;
  placeInRow: number;
  rowWidth: number;
  hitAffiliationId: string;
  /** Текущая сила: падает в столкновениях, уходит в урон по клетке при приземлении. */
  power: number;
  attackAnimation: AttackAnimationId;
  destroyed?: boolean;
  spawnApplied?: boolean;
  landApplied?: boolean;
};

export type FlightPayload = {
  attackId: string;
  sims: ProjectileSim[];
  fromIndex: number;
  toIndex: number;
  amount: number;
  visualCombat: boolean;
  waveSpawnTids: Partial<Record<number, number>>;
  simLandTids: Partial<Record<string, number>>;
};

export type MapProjectileDraw = {
  id: string;
  x: number;
  y: number;
  angle: number;
  attackAnimation: AttackAnimationId;
  attackerId: string;
  gridRow: number;
  rowWidth: number;
  placeInRow: number;
  flightFid: string;
};
