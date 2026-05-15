import { DEFAULT_MAP_ID } from "./game/maps";

export type AppRoute = {
  mapId: string;
};

export function readAppRoute(): AppRoute {
  const params = new URLSearchParams(window.location.search);
  const mapId = params.get("map") ?? DEFAULT_MAP_ID;
  return { mapId };
}

export function writeAppRoute(next: AppRoute): void {
  const params = new URLSearchParams();
  if (next.mapId !== DEFAULT_MAP_ID) {
    params.set("map", next.mapId);
  }
  const query = params.toString();
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  window.history.replaceState(null, "", url);
}
