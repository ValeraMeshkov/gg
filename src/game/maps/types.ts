/** Одна клетка / территория на карте. */
export type MapCell = {
  /** Число под кружком (юниты), как на референсе */
  units?: number;
  /** Владелец (id игрока); пусто — нейтрал */
  ownerId?: string;
  /** Unix ms — пауза пассивного +1 после попадания по нейтрали/врагу. */
  growthPausedUntil?: number;
  /** Щит крепости (0–20). */
  fortressShield?: number;
  /** Unix ms — пауза восстановления щита после попадания. */
  fortressShieldRegenPausedUntil?: number;
  /** Подсветка выбора UI (не то же самое, что владение) */
  active?: boolean;
};

export type {
  GameMap,
  MapTerritory,
  TerritoryGameMap,
  TerritoryMapViewBox,
} from "./world/types";

export { isTerritoryMap } from "./world/types";

import type { GameMap } from "./world/types";
import { assertTerritoryMapShape } from "./world/buildTerritoryMap";

export function assertMapShape(map: GameMap): void {
  assertTerritoryMapShape(map);
}
