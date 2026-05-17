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
  offX: number;
  offY: number;
  placeInRow: number;
  rowWidth: number;
  hitAffiliationId: string;
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
  attackerId: string;
  gridRow: number;
  rowWidth: number;
  placeInRow: number;
  flightFid: string;
};
