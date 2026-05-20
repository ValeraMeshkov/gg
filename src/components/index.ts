/** Публичный API UI-компонентов. */

export { AppGameChrome } from "./game/AppGameChrome";
export { GameCanvas } from "./game/GameCanvas";
export { MapView } from "./game/MapView";
export { TerritoryMapView } from "./game/TerritoryMapView";
export type { MapCell, MapViewProps } from "./game/MapView";

export { MapDotEditor } from "./editor/MapDotEditor";

export { RoomChat } from "./room/RoomChat";
export { RoomJoinRedirect } from "./room/RoomJoinRedirect";
export { RoomLobby } from "./room/RoomLobby";
export { RoomWaiting } from "./room/RoomWaiting";

export { PlayerAppearanceSelect } from "./settings/PlayerAppearanceSelect";
export { PlayerShareBar } from "./settings/PlayerShareBar";
export type { PlayerShareBarEntry } from "./settings/PlayerShareBar";

export * from "./map";
