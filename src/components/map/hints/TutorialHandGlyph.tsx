import type { ReactElement } from "react";
import handPng from "@/assets/hand.png";
import {
  MAP_CURSOR_ART_SIZE,
  MAP_CURSOR_NUDGE_X,
  MAP_CURSOR_NUDGE_Y,
  MAP_CURSOR_TIP_X,
  MAP_CURSOR_TIP_Y,
} from "@/game/mapCursor";

type TutorialHandGlyphProps = {
  className?: string;
  scaleFixed: number;
};

/** Сторона квадрата подсказки в локальных единицах (согласовано с FirstMoveHintLayer). */
export const TUTORIAL_HAND_ART_SIZE = MAP_CURSOR_ART_SIZE;

/**
 * Прицел hand.png «как в файле»: только PNG, без перекраски.
 * Якорь (кончик) — точка (tipX + nudgeX, tipY + nudgeY) → (0,0) карты. Тень — класс снаружи (firstMoveHintHandWrap).
 */
export function TutorialHandGlyph({
  className,
  scaleFixed,
}: TutorialHandGlyphProps): ReactElement {
  const art = TUTORIAL_HAND_ART_SIZE;
  const tipX = MAP_CURSOR_TIP_X;
  const tipY = MAP_CURSOR_TIP_Y;
  const nudgeX = MAP_CURSOR_NUDGE_X;
  const nudgeY = MAP_CURSOR_NUDGE_Y;
  const ax = tipX + nudgeX;
  const ay = tipY + nudgeY;

  return (
    <g className={className} transform={`scale(${scaleFixed})`}>
      <g transform={`translate(${-ax}, ${-ay})`}>
        <image
          href={handPng}
          x={0}
          y={0}
          width={art}
          height={art}
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>
  );
}
