import { MAP_ID } from "../mapIds";

/** ISO / class-ключ территории в world.svg (Simplemaps). */
export type WorldTerritoryRef = {
  id: string;
  name: string;
  svgClass?: string;
};

export type WorldContinentDef = {
  id: string;
  name: string;
  territories: readonly WorldTerritoryRef[];
};

export const SOUTH_AMERICA: WorldContinentDef = {
  id: MAP_ID.SOUTH_AMERICA,
  name: "Южная Америка",
  territories: [],
};

/** Метаданные континентов в случайном пуле (данные SVG — в `generated/`). */
export const WORLD_CONTINENTS: readonly { id: string; name: string }[] = [
  { id: MAP_ID.SOUTH_AMERICA, name: "Южная Америка" },
  { id: MAP_ID.NORTH_AMERICA, name: "Северная Америка" },
  { id: MAP_ID.EUROPE, name: "Европа" },
  { id: MAP_ID.AFRICA, name: "Африка" },
  { id: MAP_ID.ASIA, name: "Азия" },
  { id: MAP_ID.OCEANIA, name: "Океания" },
];
