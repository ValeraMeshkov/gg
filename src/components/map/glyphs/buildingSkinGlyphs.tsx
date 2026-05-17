import type { ReactElement } from "react";
import type { BuildingSkinId } from "@/game/appearance";
import { renderBuilding3dGlyph } from "./building3dGlyphs";

type GlyphProps = {
  s: number;
  fill: string;
  stroke: string;
};

export function renderBuildingGlyph(
  skin: BuildingSkinId,
  props: GlyphProps
): ReactElement {
  return renderBuilding3dGlyph(skin, props);
}
