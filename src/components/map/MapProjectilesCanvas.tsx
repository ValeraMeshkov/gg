import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
  type ReactElement,
} from "react";
import {
  appearanceForPlayer,
  type DisplayColorId,
  type PlayerAppearancesMap,
} from "../../game/appearance";
import type { TerritoryGameMap } from "../../game/maps";
import { projectileColorsForPlayer } from "../../game/playerColors";
import type { MapProjectileDraw } from "./mapProjectileTypes";
import { drawMapProjectileOnCanvas } from "./projectileCanvasGlyphs";
import { computeSvgMeetTransform } from "./viewBoxMeetTransform";
import styles from "../MapView.module.scss";

export type MapProjectilesCanvasHandle = {
  setFrame: (projectiles: readonly MapProjectileDraw[], projR: number) => void;
  clear: () => void;
};

type MapProjectilesCanvasProps = {
  map: TerritoryGameMap;
  localPlayerId: string;
  localDisplayColor?: DisplayColorId;
  /** Тот же ref, что синхронизируется с merged appearances в GameCanvas. */
  appearancesRef: MutableRefObject<PlayerAppearancesMap>;
};

export const MapProjectilesCanvas = forwardRef<
  MapProjectilesCanvasHandle,
  MapProjectilesCanvasProps
>(function MapProjectilesCanvas(
  {
    map,
    localPlayerId,
    localDisplayColor,
    appearancesRef,
  }: MapProjectilesCanvasProps,
  ref
): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef(map);
  mapRef.current = map;

  const localPlayerIdRef = useRef(localPlayerId);
  localPlayerIdRef.current = localPlayerId;
  const localDisplayColorRef = useRef(localDisplayColor);
  localDisplayColorRef.current = localDisplayColor;

  const lastFrameRef = useRef<{
    projectiles: readonly MapProjectileDraw[];
    projR: number;
  } | null>(null);

  const syncCanvasBitmapSize = (
    canvas: HTMLCanvasElement,
    host: HTMLDivElement,
    dpr: number
  ): { cssW: number; cssH: number; bw: number; bh: number } => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    const bw = Math.max(1, Math.round(w * dpr));
    const bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    return { cssW: w, cssH: h, bw, bh };
  };

  const paint = (
    ctx: CanvasRenderingContext2D,
    cssW: number,
    cssH: number,
    dpr: number,
    projectiles: readonly MapProjectileDraw[],
    projR: number
  ) => {
    const m = mapRef.current.viewBox;
    const { scale, tx, ty } = computeSvgMeetTransform(cssW, cssH, m);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cssW * dpr, cssH * dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, tx * dpr, ty * dpr);

    const appearances = appearancesRef.current;
    const lp = localPlayerIdRef.current;
    const lc = localDisplayColorRef.current;
    for (const p of projectiles) {
      const { fill } = projectileColorsForPlayer(
        p.attackerId,
        lp,
        appearances,
        lc
      );
      const skin = appearanceForPlayer(appearances, p.attackerId).fighter;
      drawMapProjectileOnCanvas(ctx, skin, fill, projR, p.x, p.y, p.angle);
    }
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const onResize = () => {
      const last = lastFrameRef.current;
      if (!last) return;
      const dpr = Math.max(1, Math.min(window.devicePixelRatio ?? 1, 3));
      syncCanvasBitmapSize(canvas, host, dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      paint(ctx, host.clientWidth, host.clientHeight, dpr, last.projectiles, last.projR);
    };

    const ro = new ResizeObserver(onResize);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    setFrame(projectiles: readonly MapProjectileDraw[], projR: number) {
      lastFrameRef.current = { projectiles, projR };
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (!host || !canvas) return;
      const dpr = Math.max(1, Math.min(window.devicePixelRatio ?? 1, 3));
      const { cssW, cssH } = syncCanvasBitmapSize(canvas, host, dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      paint(ctx, cssW, cssH, dpr, projectiles, projR);
    },
    clear() {
      lastFrameRef.current = null;
      const host = hostRef.current;
      const canvas = canvasRef.current;
      if (!host || !canvas) return;
      const dpr = Math.max(1, Math.min(window.devicePixelRatio ?? 1, 3));
      const { bw, bh } = syncCanvasBitmapSize(canvas, host, dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, bw, bh);
    },
  }));

  return (
    <div ref={hostRef} className={styles.projectilesCanvasHost}>
      <canvas ref={canvasRef} className={styles.projectilesCanvas} aria-hidden />
    </div>
  );
});
