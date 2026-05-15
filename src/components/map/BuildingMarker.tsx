import type { CSSProperties, ReactElement } from "react";
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

/**
 * Маркер «здания» на точке территории.
 * `circle` — прежний кружок; остальные — SVG-иконки того же размера.
 */
export function BuildingMarker({
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
}
