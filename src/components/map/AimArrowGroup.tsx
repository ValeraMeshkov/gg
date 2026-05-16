import { memo, type ReactElement } from "react";
import styles from "../MapView.module.scss";

export type AimSeg = { x1: number; y1: number; x2: number; y2: number };

const AIM_OUTLINE = "#ffffff";

type AimArrowGroupProps = {
  seg: AimSeg;
  stroke: string;
  head: string;
  shaftWidth: number;
  tipLead: number;
  headDepth: number;
  headHalf: number;
};

function aimSegEqual(a: AimSeg, b: AimSeg): boolean {
  return a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2;
}

function aimArrowGroupEqual(p: AimArrowGroupProps, n: AimArrowGroupProps): boolean {
  return (
    aimSegEqual(p.seg, n.seg) &&
    p.stroke === n.stroke &&
    p.head === n.head &&
    p.shaftWidth === n.shaftWidth &&
    p.tipLead === n.tipLead &&
    p.headDepth === n.headDepth &&
    p.headHalf === n.headHalf
  );
}

/** Шток + наконечник; белая обводка 1px, чтобы стрелка не сливалась с границей территории. */
export const AimArrowGroup = memo(function AimArrowGroup({
  seg,
  stroke,
  head,
  shaftWidth,
  tipLead,
  headDepth,
  headHalf,
}: AimArrowGroupProps): ReactElement {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const shaftClear = 0;
  const tipX = seg.x2 + ux * tipLead;
  const tipY = seg.y2 + uy * tipLead;
  const baseX = tipX - ux * headDepth;
  const baseY = tipY - uy * headDepth;
  const p1x = baseX + px * headHalf;
  const p1y = baseY + py * headHalf;
  const p2x = baseX - px * headHalf;
  const p2y = baseY - py * headHalf;
  const shaftEx = tipX - ux * (headDepth + shaftClear);
  const shaftEy = tipY - uy * (headDepth + shaftClear);
  const headPoints = `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`;

  return (
    <g>
      <line
        x1={seg.x1}
        y1={seg.y1}
        x2={shaftEx}
        y2={shaftEy}
        className={styles.aimArrow}
        stroke={AIM_OUTLINE}
        strokeWidth={shaftWidth + 2}
        vectorEffect="nonScalingStroke"
      />
      <line
        x1={seg.x1}
        y1={seg.y1}
        x2={shaftEx}
        y2={shaftEy}
        className={styles.aimArrow}
        stroke={stroke}
        strokeWidth={shaftWidth}
        vectorEffect="nonScalingStroke"
      />
      <polygon
        className={styles.aimArrowHead}
        points={headPoints}
        fill={AIM_OUTLINE}
        stroke={AIM_OUTLINE}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="nonScalingStroke"
      />
      <polygon
        className={styles.aimArrowHead}
        points={headPoints}
        fill={head}
      />
    </g>
  );
}, aimArrowGroupEqual);
