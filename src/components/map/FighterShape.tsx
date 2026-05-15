import type { ReactElement } from "react";
import type { FighterSkinId } from "../../game/appearance";
import {
  fighterFlightRotation,
  renderFighterGlyph,
} from "./fighterSkinGlyphs";
import { ProjectileTriangle } from "./ProjectileTriangle";

type FighterShapeProps = {
  skin: FighterSkinId;
  x: number;
  y: number;
  angle: number;
  size: number;
  fill: string;
  className?: string;
};

/** Иконка бойца в полёте (пуля). */
export function FighterShape({
  skin,
  x,
  y,
  angle,
  size,
  fill,
  className,
}: FighterShapeProps): ReactElement {
  if (skin === "triangle") {
    return (
      <ProjectileTriangle
        className={className}
        x={x}
        y={y}
        angle={angle}
        size={size}
        fill={fill}
      />
    );
  }

  const s = size * 1.35;
  const rotate = fighterFlightRotation(skin, angle);
  const glyph = renderFighterGlyph(skin, s, fill);

  return (
    <g
      className={className}
      transform={`translate(${x} ${y}) rotate(${(rotate * 180) / Math.PI})`}
    >
      {glyph}
    </g>
  );
}
