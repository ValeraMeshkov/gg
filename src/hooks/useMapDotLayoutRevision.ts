import { useEffect, useState } from "react";
import { MAP_DOT_LAYOUT_CHANGE_EVENT } from "@/game/maps/world/mapDotLayout";

/** Перерисовка при сохранении раскладки точек в localStorage. */
export function useMapDotLayoutRevision(mapId: string): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ mapId?: string }>).detail;
      if (!detail?.mapId || detail.mapId === mapId) {
        setRevision((v) => v + 1);
      }
    };
    window.addEventListener(MAP_DOT_LAYOUT_CHANGE_EVENT, onChange);
    return () =>
      window.removeEventListener(MAP_DOT_LAYOUT_CHANGE_EVENT, onChange);
  }, [mapId]);

  return revision;
}
