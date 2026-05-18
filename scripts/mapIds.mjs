/** Для node-скриптов. Значения должны совпадать с `src/game/maps/mapIds.ts`. */
export const MAP_ID = {
  SOUTH_AMERICA: "south-america",
  NORTH_AMERICA: "north-america",
  EUROPE: "europe",
  AFRICA: "africa",
  ASIA: "asia",
  OCEANIA: "oceania",
  WORLD_LARGE: "world-large",
};

/** Выражение для codegen: `MAP_ID.SOUTH_AMERICA` */
export function mapIdConstExpr(id) {
  const entry = Object.entries(MAP_ID).find(([, value]) => value === id);
  if (!entry) {
    throw new Error(`Неизвестный id карты: ${id}`);
  }
  return `MAP_ID.${entry[0]}`;
}
