import { createContext, useContext, type ReactNode } from "react";
import type { MapSpotMetrics } from "@/game/maps/mapSpotMetrics";
import { computeMapSpotMetricsFallback } from "@/game/maps/mapSpotMetrics";
import type { GameMap } from "@/game/maps";

const MapSpotMetricsContext = createContext<MapSpotMetrics | null>(null);

export function MapSpotMetricsProvider({
  metrics,
  children,
}: {
  metrics: MapSpotMetrics;
  children: ReactNode;
}) {
  return (
    <MapSpotMetricsContext.Provider value={metrics}>
      {children}
    </MapSpotMetricsContext.Provider>
  );
}

export function useMapSpotMetrics(map: GameMap): MapSpotMetrics {
  const ctx = useContext(MapSpotMetricsContext);
  return ctx ?? computeMapSpotMetricsFallback(map);
}
