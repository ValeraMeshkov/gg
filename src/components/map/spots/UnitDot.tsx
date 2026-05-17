import { memo, type CSSProperties, type ReactElement } from "react";
import styles from "@/components/map/styles/MapView.module.scss";

export type UnitDotVariant =
  | "neutral"
  | "p1"
  | "p2"
  | "p3"
  | "active"
  | "editor";

type UnitDotProps = {
  cx: number;
  cy: number;
  r: number;
  variant: UnitDotVariant;
  fillStyle?: CSSProperties;
  selected?: boolean;
  /** Редактор: кружок принимает клики и перетаскивание. */
  interactive?: boolean;
};

function fillClassForVariant(variant: UnitDotVariant): string {
  switch (variant) {
    case "p1":
      return styles.dotP1;
    case "p2":
      return styles.dotP2;
    case "p3":
      return styles.dotP3;
    case "active":
      return styles.dotActive;
    case "editor":
      return styles.dot;
    default:
      return styles.dot;
  }
}

function unitDotEqual(p: UnitDotProps, n: UnitDotProps): boolean {
  if (
    p.cx !== n.cx ||
    p.cy !== n.cy ||
    p.r !== n.r ||
    p.variant !== n.variant ||
    p.selected !== n.selected ||
    p.interactive !== n.interactive
  )
    return false;
  const a = p.fillStyle;
  const b = n.fillStyle;
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.fill === b.fill && a.stroke === b.stroke;
}

export const UnitDot = memo(function UnitDot({
  cx,
  cy,
  r,
  variant,
  fillStyle,
  selected = false,
  interactive = false,
}: UnitDotProps): ReactElement {
  const isOwned = variant === "p1" || variant === "p2" || variant === "p3";

  return (
    <circle
      className={`${fillClassForVariant(variant)} ${styles.unitDot}${
        isOwned ? ` ${styles.unitDotOwned}` : ""
      }${interactive ? ` ${styles.unitDotInteractive}` : ""}${
        selected ? ` ${styles.unitDotSelected}` : ""
      }`}
      cx={cx}
      cy={cy}
      r={r}
      style={fillStyle}
      aria-hidden
    />
  );
}, unitDotEqual);
