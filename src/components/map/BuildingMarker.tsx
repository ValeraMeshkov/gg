import { memo, type CSSProperties, type ReactElement } from "react";
import type { BuildingSkinId } from "../../game/appearance";
import { renderBuildingGlyph } from "./buildingSkinGlyphs";
import { UnitDot, type UnitDotVariant } from "./UnitDot";

type BuildingMarkerProps = {
  skin: BuildingSkinId;
  cx: number;
  cy: number;
  size: number;
  variant: UnitDotVariant;
  fillStyle?: CSSProperties;
};

function buildingMarkerEqual(
  p: BuildingMarkerProps,
  n: BuildingMarkerProps
): boolean {
  if (
    p.skin !== n.skin ||
    p.cx !== n.cx ||
    p.cy !== n.cy ||
    p.size !== n.size ||
    p.variant !== n.variant
  )
    return false;
  const a = p.fillStyle;
  const b = n.fillStyle;
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.fill === b.fill && a.stroke === b.stroke;
}

/**
 * Маркер «здания» на точке территории.
 * `circle` — прежний кружок; остальные — SVG-иконки того же размера.
 */
export const BuildingMarker = memo(function BuildingMarker({
  skin,
  cx,
  cy,
  size,
  variant,
  fillStyle,
}: BuildingMarkerProps): ReactElement {
  if (skin === "circle") {
    return (
      <UnitDot
        cx={cx}
        cy={cy}
        r={size}
        variant={variant}
        fillStyle={fillStyle}
      />
    );
  }

  const fill = fillStyle?.fill ?? "#1a3a5c";
  const stroke = fillStyle?.stroke ?? "#eef0f4";
  const s = size * 1.15;
  const glyph = renderBuildingGlyph(skin, { s, fill, stroke });

  return (
    <g transform={`translate(${cx} ${cy})`} aria-hidden>
      {glyph}
    </g>
  );
}, buildingMarkerEqual);
