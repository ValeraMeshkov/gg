/** Стабильные id карт (реестр, extract). */
export const MAP_ID = {
  SOUTH_AMERICA: "south-america",
  NORTH_AMERICA: "north-america",
  EUROPE: "europe",
  AFRICA: "africa",
  ASIA: "asia",
  OCEANIA: "oceania",
  WORLD_LARGE: "world-large",
} as const;

export type MapId = (typeof MAP_ID)[keyof typeof MAP_ID];

export const DEFAULT_MAP_ID = MAP_ID.SOUTH_AMERICA;
