import { memo, type MutableRefObject, type RefObject } from "react";
import type { MapProjectilesCanvasHandle } from "@/components/map";
import type { DisplayColorId, PlayerAppearancesMap } from "@/game/appearance";
import type { LandHitFx } from "@/game/hitEffects";
import type { GameMap, MapCell } from "@/game/maps";
import { TerritoryMapView } from "./TerritoryMapView";
import type { CellPos } from "@/game/maps";

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
  /** S — снять все ещё не вылетевшие залпы со своих точек. */
  onCancelAllPending?: () => void;
  syncMapLayout?: boolean;
  /** Подсказка первого хода: рука от своей точки к ближайшей цели. */
  showFirstMoveHint?: boolean;
  /** Нельзя атаковать (отсчёт, конец партии в комнате и т.д.) — горячие клавиши карты отключены. */
  mapInteractionLocked?: boolean;
};

export const MapView = memo(function MapView(props: MapViewProps) {
  const { map, showFirstMoveHint, ...rest } = props;
  return (
    <TerritoryMapView
      {...rest}
      map={map}
      showFirstMoveHint={showFirstMoveHint}
    />
  );
});

export type { MapCell };
