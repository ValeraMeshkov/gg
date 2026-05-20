import { memo, type MutableRefObject, type RefObject } from "react";
import type { MapProjectilesCanvasHandle } from "@/components/map";
import type {
  DisplayColorId,
  FighterSkinId,
  PlayerAppearancesMap,
} from "@/game/appearance";
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
  /** D — своя точка с макс. запасом; S — снять все ещё не вылетевшие залпы. */
  onCancelAllPending?: () => void;
  syncMapLayout?: boolean;
  /** Подсказка первого хода: рука от своей точки к ближайшей цели. */
  showFirstMoveHint?: boolean;
  /** Нельзя атаковать (отсчёт, конец партии в комнате и т.д.) — горячие клавиши карты отключены. */
  mapInteractionLocked?: boolean;
  /** Блок только панели оружия (без учёта syncReady). */
  fighterPickerDisabled?: boolean;
  onMapFlightMetricsChange?: (metrics: {
    meetScale: number;
    dotRadius: number;
  }) => void;
  offlineBotCount?: number;
  onOfflineBotCountChange?: (value: number) => void;
  onOfflineBotCountCommit?: (value: number) => void;
  offlineBotDifficulty?: number;
  onOfflineBotDifficultyChange?: (value: number) => void;
  fighter: FighterSkinId;
  onFighterChange: (fighter: FighterSkinId) => void;
  mapId: string;
  onMapIdChange: (mapId: string) => void;
  mapSelectHint?: string;
  mapCatalogDisabled?: boolean;
  randomMapOnStart?: boolean;
  onRandomMapOnStartChange?: (value: boolean) => void;
  randomMapLabel?: string;
  hideSideMapPicker?: boolean;
  hideSideHotkeys?: boolean;
  hideSideSoloControls?: boolean;
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
