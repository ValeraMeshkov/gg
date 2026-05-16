import type { MutableRefObject, RefObject } from "react";
import type { MapProjectilesCanvasHandle } from "./map/MapProjectilesCanvas";
import type { DisplayColorId, PlayerAppearancesMap } from "../game/appearance";
import type { LandHitFx } from "../game/hitEffects";
import type { GameMap, MapCell } from "../game/maps";
import { TerritoryMapView } from "./TerritoryMapView";
import type { CellPos } from "../game/maps";

export type MapViewProps = {
  map: GameMap;
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  activePlayerRef: MutableRefObject<string>;
  playerAppearances: PlayerAppearancesMap;
  projectileCanvasRef: RefObject<MapProjectilesCanvasHandle | null>;
  playerAppearancesRef: MutableRefObject<PlayerAppearancesMap>;
  landHitFx?: readonly LandHitFx[];
  onCommitAttacks: (froms: readonly CellPos[], to: CellPos) => void;
  onCancelPendingFrom?: (cell: CellPos) => void;
  syncMapLayout?: boolean;
  /** Подсказка первого хода: рука от своей точки к ближайшей цели. */
  showFirstMoveHint?: boolean;
  /** Индекс точки (0…N-1) для пульсации «начни отсюда» до первого хода; null — не пульсировать. */
  firstMovePulseFromIndex?: number | null;
  /** Нельзя атаковать (отсчёт, конец партии в комнате и т.д.) — горячие клавиши карты отключены. */
  mapInteractionLocked?: boolean;
};

export function MapView(props: MapViewProps) {
  const { map, showFirstMoveHint, firstMovePulseFromIndex, ...rest } = props;
  return (
    <TerritoryMapView
      {...rest}
      map={map}
      showFirstMoveHint={showFirstMoveHint}
      firstMovePulseFromIndex={firstMovePulseFromIndex}
    />
  );
}

export type { MapCell };
