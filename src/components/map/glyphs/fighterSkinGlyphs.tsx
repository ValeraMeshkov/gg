import type { ReactElement } from "react";
import type { FighterSkinId } from "@/game/appearance";

/** Скины, которые поворачиваются по направлению полёта. */
export const ROTATING_FIGHTER_SKINS = new Set<FighterSkinId>([
  "star",
  "diamond",
  "rocket",
]);

/** Доп. поворот глифа (рад.): ракета нарисована «вверх», полёт angle=0 — вправо. */
const FIGHTER_ROTATION_OFFSET: Partial<Record<FighterSkinId, number>> = {
  rocket: Math.PI / 2,
};

export function fighterFlightRotation(
  skin: FighterSkinId,
  angle: number
): number {
  if (!ROTATING_FIGHTER_SKINS.has(skin)) return 0;
  return angle + (FIGHTER_ROTATION_OFFSET[skin] ?? 0);
}

export function renderFighterGlyph(
  skin: FighterSkinId,
  s: number,
  fill: string
): ReactElement | null {
  switch (skin) {
    case "heart":
      return (
        <path
          d={`M0 ${s * 0.35} C${-s * 0.9} ${-s * 0.45} ${-s * 0.35} ${
            -s * 0.95
          } 0 ${-s * 0.55} C${s * 0.35} ${-s * 0.95} ${s * 0.9} ${
            -s * 0.45
          } 0 ${s * 0.35} Z`}
          fill={fill}
        />
      );
    case "bear":
      return (
        <g fill={fill}>
          <circle cx={-s * 0.42} cy={-s * 0.42} r={s * 0.28} />
          <circle cx={s * 0.42} cy={-s * 0.42} r={s * 0.28} />
          <circle cx={0} cy={0} r={s * 0.62} />
          <ellipse
            cx={-s * 0.2}
            cy={-s * 0.05}
            rx={s * 0.1}
            ry={s * 0.12}
            fill="#fff"
            opacity={0.85}
          />
          <ellipse
            cx={s * 0.2}
            cy={-s * 0.05}
            rx={s * 0.1}
            ry={s * 0.12}
            fill="#fff"
            opacity={0.85}
          />
          <ellipse
            cx={0}
            cy={s * 0.18}
            rx={s * 0.14}
            ry={s * 0.1}
            fill="#fff"
            opacity={0.75}
          />
        </g>
      );
    case "star":
      return <polygon points={starPoints(0, 0, s * 0.85, 5)} fill={fill} />;
    case "diamond":
      return (
        <polygon
          points={`0,${-s * 0.85} ${s * 0.55},0 0,${s * 0.85} ${-s * 0.55},0`}
          fill={fill}
        />
      );
    case "ghost":
      return (
        <g fill={fill}>
          <path
            d={`M0 ${-s * 0.72} A${s * 0.55} ${s * 0.55} 0 1 1 0 ${
              -s * 0.72
            } Z M${-s * 0.55} ${-s * 0.2} L${-s * 0.55} ${s * 0.55} L${
              -s * 0.28
            } ${s * 0.35} L0 ${s * 0.62} L${s * 0.28} ${s * 0.35} L${
              s * 0.55
            } ${s * 0.55} L${s * 0.55} ${-s * 0.2} Z`}
          />
          <circle cx={-s * 0.2} cy={-s * 0.15} r={s * 0.1} fill="#fff" />
          <circle cx={s * 0.2} cy={-s * 0.15} r={s * 0.1} fill="#fff" />
        </g>
      );
    case "rocket":
      return (
        <g fill={fill}>
          <polygon
            points={`0,${-s * 0.9} ${-s * 0.32},${s * 0.35} ${s * 0.32},${
              s * 0.35
            }`}
          />
          <polygon
            points={`${-s * 0.32},${s * 0.2} ${-s * 0.55},${s * 0.65} ${
              -s * 0.12
            },${s * 0.45}`}
          />
          <polygon
            points={`${s * 0.32},${s * 0.2} ${s * 0.55},${s * 0.65} ${
              s * 0.12
            },${s * 0.45}`}
          />
          <circle
            cx={0}
            cy={-s * 0.15}
            r={s * 0.12}
            fill="#fff"
            opacity={0.85}
          />
        </g>
      );
    case "clover":
      return (
        <g fill={fill}>
          <circle cx={0} cy={-s * 0.32} r={s * 0.28} />
          <circle cx={-s * 0.32} cy={0} r={s * 0.28} />
          <circle cx={s * 0.32} cy={0} r={s * 0.28} />
          <circle cx={0} cy={s * 0.32} r={s * 0.28} />
          <rect
            x={-s * 0.08}
            y={s * 0.2}
            width={s * 0.16}
            height={s * 0.45}
            rx={s * 0.04}
          />
        </g>
      );
    case "bomb":
      return (
        <g fill={fill}>
          <circle cx={0} cy={s * 0.12} r={s * 0.52} />
          <path
            d={`M${s * 0.18} ${-s * 0.28} Q${s * 0.42} ${-s * 0.55} ${
              s * 0.28
            } ${-s * 0.72}`}
            fill="none"
            stroke={fill}
            strokeWidth={s * 0.12}
            strokeLinecap="round"
          />
          <circle cx={s * 0.32} cy={-s * 0.78} r={s * 0.1} fill="#ffe082" />
        </g>
      );
    case "ufo":
      return (
        <g fill={fill}>
          <ellipse cx={0} cy={s * 0.15} rx={s * 0.72} ry={s * 0.28} />
          <ellipse cx={0} cy={-s * 0.18} rx={s * 0.32} ry={s * 0.28} />
          <circle
            cx={-s * 0.28}
            cy={s * 0.18}
            r={s * 0.06}
            fill="#fff"
            opacity={0.8}
          />
          <circle cx={0} cy={s * 0.18} r={s * 0.06} fill="#fff" opacity={0.8} />
          <circle
            cx={s * 0.28}
            cy={s * 0.18}
            r={s * 0.06}
            fill="#fff"
            opacity={0.8}
          />
        </g>
      );
    case "shield":
      return (
        <path
          d={`M0 ${-s * 0.75} L${s * 0.62} ${-s * 0.35} L${s * 0.55} ${
            s * 0.25
          } Q0 ${s * 0.85} 0 ${s * 0.85} Q0 ${s * 0.85} ${-s * 0.55} ${
            s * 0.25
          } L${-s * 0.62} ${-s * 0.35} Z`}
          fill={fill}
        />
      );
    case "triangle":
      return null;
    default: {
      const _exhaustive: never = skin;
      return _exhaustive;
    }
  }
}

function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  points: number
): string {
  const innerR = outerR * 0.42;
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / 2) * -1 + (i * Math.PI) / points;
    coords.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return coords.join(" ");
}
