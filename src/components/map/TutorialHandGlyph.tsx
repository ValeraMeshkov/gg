import type { ReactElement } from "react";
import handPng from "../../assets/hand.png";

type TutorialHandGlyphProps = {
  className?: string;
  scaleFixed: number;
};

/** Сторона квадрата подсказки в локальных единицах (согласовано с FirstMoveHintLayer). */
export const TUTORIAL_HAND_ART_SIZE = 140;

/**
 * Рука hand.png «как в файле»: только PNG, без перекраски.
 * Якорь (кончик) — точка (tipX + nudgeX, tipY + nudgeY) → (0,0) карты. Тень — класс снаружи (firstMoveHintHandWrap).
 */
export function TutorialHandGlyph({
  className,
  scaleFixed,
}: TutorialHandGlyphProps): ReactElement {
  const art = TUTORIAL_HAND_ART_SIZE;
  const tipX = 28;
  const tipY = -15;
  const nudgeX = 26;
  const nudgeY = 32;
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
