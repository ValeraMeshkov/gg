export type PlayerDotVariant = "neutral" | "p1" | "p2" | "p3";

export type OwnedTerritoryColors = {
  fill: string;
  stroke: string;
};

export type Palette = {
  fillPale: [number, number, number];
  fillFull: [number, number, number];
  strokePale: [number, number, number];
  strokeFull: [number, number, number];
};

export type ShareBarColorView = {
  colorIndex: number;
  /** Свой личный цвет — inline, не data-player */
  background?: string;
};

export type ProjectileColorPair = { fill: string; stroke: string };
