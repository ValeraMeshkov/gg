import type { ReactElement } from "react";
import type { BuildingSkinId } from "@/game/appearance";
import { isGlbBuildingSkin } from "@/components/map/buildingGlb";

type GlyphProps = {
  s: number;
  fill: string;
  stroke: string;
};

function isoCubeFaces(edge: number): {
  top: string;
  right: string;
  left: string;
} {
  const hx = edge * 0.866;
  const hy = edge * 0.5;
  return {
    top: `0,${-hy} ${hx},0 0,${hy} ${-hx},0`,
    right: `0,${hy} ${hx},0 ${hx},${edge} 0,${hy + edge}`,
    left: `0,${hy} ${-hx},0 ${-hx},${edge} 0,${hy + edge}`,
  };
}

function Cube3d({ s, fill, stroke }: GlyphProps): ReactElement {
  const edge = s * 0.92;
  const { top, right, left } = isoCubeFaces(edge);
  const hx = edge * 0.866;
  const hy = edge * 0.5;
  return (
    <g>
      <g fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        <polygon points={left} opacity={0.62} />
      </g>
      <g fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        <polygon points={right} opacity={0.82} />
      </g>
      <g fill={fill} stroke={stroke} strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        <polygon points={top} />
      </g>
      <path
        d={`M0,${hy} L${hx},0 M0,${hy} L${-hx},0`}
        fill="none"
        stroke="#fff"
        strokeWidth={0.9}
        opacity={0.45}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

const CUBE_CENTER_Y_RATIO = 0.92 * 0.5;

export function building3dCenterY(s: number): number {
  return s * CUBE_CENTER_Y_RATIO;
}

export function renderBuilding3dGlyph(
  skin: BuildingSkinId,
  props: GlyphProps
): ReactElement {
  if (isGlbBuildingSkin(skin)) {
    return <g />;
  }
  const centerY = building3dCenterY(props.s);
  return (
    <g transform={`translate(0 ${-centerY})`}>
      <Cube3d {...props} />
    </g>
  );
}
