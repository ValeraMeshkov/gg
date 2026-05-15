import type { MutableRefObject } from "react";
import type { DisplayColorId, PlayerAppearancesMap } from "../game/appearance";
import type { GameMap, MapCell } from "../game/maps";
import { TerritoryMapView } from "./TerritoryMapView";
import type { CellPos } from "../game/maps";

export type MapViewProps = {
  map: GameMap;
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  activePlayerRef: MutableRefObject<string>;
  playerAppearances: PlayerAppearancesMap;
  projectiles: readonly {
    id: string;
    x: number;
    y: number;
    angle: number;
    attackerId: string;
    gridRow: number;
    rowWidth: number;
    placeInRow: number;
    flightFid: string;
  }[];
  explosions?: readonly { id: string; x: number; y: number; start: number }[];
  onCommitAttacks: (froms: readonly CellPos[], to: CellPos) => void;
  onCancelPendingFrom?: (cell: CellPos) => void;
  syncMapLayout?: boolean;
};

export function MapView(props: MapViewProps) {
  return <TerritoryMapView {...props} map={props.map} />;
}

export type { MapCell };
