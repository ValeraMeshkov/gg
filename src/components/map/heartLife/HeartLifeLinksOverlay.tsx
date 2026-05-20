import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import type { DisplayColorId, PlayerAppearancesMap } from "@/game/appearance";
import { useSettingsOpen } from "@/context/GameShellContext";
import type { TerritoryGameMap } from "@/game/maps";
import styles from "@/components/map/styles/MapView.module.scss";
import { collectHeartLifeChains } from "./collectHeartLifeLinks";
import { HeartLifeLinksLayer } from "./HeartLifeLinksLayer";

type OverlaySize = { w: number; h: number };

type HeartLifeLinksOverlayProps = {
  map: TerritoryGameMap;
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  playerAppearances: PlayerAppearancesMap;
  syncMapLayout?: boolean;
  svgRef: RefObject<SVGSVGElement | null>;
};

const MIN_OVERLAY_PX = 16;

function measureOverlay(
  svg: SVGSVGElement | null,
  host: HTMLDivElement | null
): OverlaySize | null {
  const el = svg ?? host;
  if (!el) return null;
  const w = Math.round(el.clientWidth);
  const h = Math.round(el.clientHeight);
  if (w < MIN_OVERLAY_PX || h < MIN_OVERLAY_PX) return null;
  return { w, h };
}

export function HeartLifeLinksOverlay({
  map,
  localPlayerId,
  localDisplayColor,
  playerAppearances,
  syncMapLayout,
  svgRef,
}: HeartLifeLinksOverlayProps): ReactElement | null {
  const settingsOpen = useSettingsOpen();
  const hostRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<OverlaySize | null>(null);
  const [size, setSize] = useState<OverlaySize | null>(null);

  const hiddenOpts = useMemo(
    () => (syncMapLayout ? { syncMapLayout: true as const } : undefined),
    [syncMapLayout]
  );

  const chains = useMemo(
    () =>
      collectHeartLifeChains(
        map,
        localPlayerId,
        localDisplayColor,
        playerAppearances,
        hiddenOpts
      ),
    [map, localPlayerId, localDisplayColor, playerAppearances, hiddenOpts]
  );

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const sync = () => {
      const svg = svgRef.current;
      let next = measureOverlay(svg, host);
      if (!next) {
        const rect = host.getBoundingClientRect();
        if (rect.width >= MIN_OVERLAY_PX && rect.height >= MIN_OVERLAY_PX) {
          next = {
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        }
      }
      if (!next) return;
      if (
        sizeRef.current &&
        sizeRef.current.w === next.w &&
        sizeRef.current.h === next.h
      ) {
        return;
      }
      sizeRef.current = next;
      setSize(next);
    };

    sync();
    const raf = requestAnimationFrame(sync);
    const ro = new ResizeObserver(sync);
    ro.observe(host);
    const svg = svgRef.current;
    if (svg) ro.observe(svg);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [svgRef, map.id, chains.length]);

  if (chains.length === 0 || settingsOpen) return null;

  const renderSize =
    size ??
    sizeRef.current ??
    measureOverlay(svgRef.current, hostRef.current);

  return (
    <div
      ref={hostRef}
      className={styles.projectilesCanvasHost}
      style={{ zIndex: 1, overflow: "visible", pointerEvents: "none" }}
    >
      {renderSize ? (
        <HeartLifeLinksLayer
          chains={chains}
          width={renderSize.w}
          height={renderSize.h}
          viewBox={map.viewBox}
        />
      ) : null}
    </div>
  );
}
