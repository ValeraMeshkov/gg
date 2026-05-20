import { memo, useMemo, type ReactElement } from "react";
import type { TerritoryGameMap } from "@/game/maps";
import { mapPointToOverlayPixel } from "@/components/map/buildingGlb/map/mapPixelPosition";
import type { HeartLifeChainDraw } from "./collectHeartLifeLinks";
import styles from "@/components/map/styles/MapView.module.scss";

type HeartLifeLinksLayerProps = {
  chains: readonly HeartLifeChainDraw[];
  width: number;
  height: number;
  viewBox: TerritoryGameMap["viewBox"];
};

function parsePathPoints(pathD: string): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const re = /[ML]\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(pathD))) {
    points.push({ x: Number(match[1]), y: Number(match[2]) });
  }
  return points;
}

function chainToPixelPath(
  chain: HeartLifeChainDraw,
  width: number,
  height: number,
  viewBox: TerritoryGameMap["viewBox"]
): string {
  const points = parsePathPoints(chain.pathD);
  if (points.length < 2) return "";
  let d = "";
  for (let i = 0; i < points.length; i++) {
    const { px, py } = mapPointToOverlayPixel(
      points[i]!.x,
      points[i]!.y,
      width,
      height,
      viewBox
    );
    d += i === 0 ? `M${px} ${py}` : ` L${px} ${py}`;
  }
  return d;
}

function HeartLifeLinksLayerInner({
  chains,
  width,
  height,
  viewBox,
}: HeartLifeLinksLayerProps): ReactElement | null {
  const paths = useMemo(() => {
    return chains.map((chain) => ({
      key: chain.key,
      d: chainToPixelPath(chain, width, height, viewBox),
      color: chain.color,
    }));
  }, [chains, width, height, viewBox]);

  if (paths.length === 0) return null;

  return (
    <svg
      className={styles.heartLifeLinksSvg}
      width={width}
      height={height}
      aria-hidden
    >
      {paths.map((path) => (
        <path
          key={path.key}
          className={styles.heartLifeLink}
          d={path.d}
          stroke={path.color}
          fill="none"
        />
      ))}
    </svg>
  );
}

export const HeartLifeLinksLayer = memo(HeartLifeLinksLayerInner);
