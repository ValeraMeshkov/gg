import type { MutableRefObject } from "react";
import type { PlayerAppearancesMap } from "../game/appearance";
import type { GameMap, MapCell } from "../game/maps";
import { TerritoryMapView } from "./TerritoryMapView";
import type { CellPos } from "../game/maps";

export type MapViewProps = {
  map: GameMap;
  activePlayerRef: MutableRefObject<string>;
  adoptPlayerForCell: (ownerId: string) => void;
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
};

export function MapView(props: MapViewProps) {
  return <TerritoryMapView {...props} map={props.map} />;
}

export type { MapCell };
