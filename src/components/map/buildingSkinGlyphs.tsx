import type { ReactElement } from "react";
import type { BuildingSkinId } from "../../game/appearance";

const petalAngles = [0, 72, 144, 216, 288];

type GlyphProps = {
  s: number;
  fill: string;
  stroke: string;
};

export function renderBuildingGlyph(
  skin: BuildingSkinId,
  { s, fill, stroke }: GlyphProps
): ReactElement | null {
  const sw = 1.2;
  const g = (children: ReactElement) => (
    <g fill={fill} stroke={stroke} strokeWidth={sw} vectorEffect="non-scaling-stroke">
      {children}
    </g>
  );

  switch (skin) {
    case "circle":
      return null;
    case "fortress":
      return g(
        <>
          <rect x={-s * 0.7} y={-s * 0.15} width={s * 1.4} height={s * 0.85} rx={s * 0.06} />
          <rect x={-s * 0.85} y={-s * 0.55} width={s * 0.35} height={s * 0.45} />
          <rect x={-s * 0.18} y={-s * 0.62} width={s * 0.36} height={s * 0.52} />
          <rect x={s * 0.5} y={-s * 0.55} width={s * 0.35} height={s * 0.45} />
          <rect x={-s * 0.22} y={s * 0.05} width={s * 0.44} height={s * 0.35} fill="#fff" opacity={0.35} stroke="none" />
        </>
      );
    case "flower":
      return (
        <g fill={fill} stroke={stroke} strokeWidth={1} vectorEffect="non-scaling-stroke">
          {petalAngles.map((deg, i) => (
            <ellipse
              key={i}
              cx={Math.cos((deg * Math.PI) / 180) * s * 0.42}
              cy={Math.sin((deg * Math.PI) / 180) * s * 0.42}
              rx={s * 0.28}
              ry={s * 0.38}
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r={s * 0.22} fill={stroke} stroke="none" />
        </g>
      );
    case "crown":
      return g(
        <>
          <path d={`M${-s * 0.75} ${s * 0.35} L${-s * 0.55} ${-s * 0.35} L${-s * 0.25} ${s * 0.05} L0 ${-s * 0.55} L${s * 0.25} ${s * 0.05} L${s * 0.55} ${-s * 0.35} L${s * 0.75} ${s * 0.35} Z`} />
          <rect x={-s * 0.78} y={s * 0.32} width={s * 1.56} height={s * 0.22} rx={s * 0.05} />
        </>
      );
    case "barn":
      return g(
        <>
          <rect x={-s * 0.65} y={-s * 0.05} width={s * 1.3} height={s * 0.75} rx={s * 0.04} />
          <polygon points={`${-s * 0.72},${-s * 0.05} 0,${-s * 0.62} ${s * 0.72},${-s * 0.05}`} />
          <rect x={-s * 0.22} y={s * 0.15} width={s * 0.44} height={s * 0.55} fill="#fff" opacity={0.28} stroke="none" />
        </>
      );
    case "temple":
      return g(
        <>
          <rect x={-s * 0.7} y={-s * 0.05} width={s * 1.4} height={s * 0.65} />
          <polygon points={`0,${-s * 0.78} ${-s * 0.55},${-s * 0.05} ${s * 0.55},${-s * 0.05}`} />
          <rect x={-s * 0.55} y={s * 0.05} width={s * 0.12} height={s * 0.55} />
          <rect x={-s * 0.06} y={s * 0.05} width={s * 0.12} height={s * 0.55} />
          <rect x={s * 0.43} y={s * 0.05} width={s * 0.12} height={s * 0.55} />
        </>
      );
    case "lighthouse":
      return g(
        <>
          <rect x={-s * 0.22} y={-s * 0.15} width={s * 0.44} height={s * 0.85} />
          <rect x={-s * 0.35} y={-s * 0.35} width={s * 0.7} height={s * 0.22} rx={s * 0.04} />
          <polygon points={`0,${-s * 0.75} ${-s * 0.28},${-s * 0.35} ${s * 0.28},${-s * 0.35}`} />
          <circle cx={0} cy={-s * 0.48} r={s * 0.1} fill="#ffe082" stroke="none" />
        </>
      );
    case "house":
      return g(
        <>
          <rect x={-s * 0.55} y={-s * 0.05} width={s * 1.1} height={s * 0.65} />
          <polygon points={`0,${-s * 0.65} ${-s * 0.62},${-s * 0.05} ${s * 0.62},${-s * 0.05}`} />
          <rect x={-s * 0.15} y={s * 0.12} width={s * 0.3} height={s * 0.48} fill="#fff" opacity={0.3} stroke="none" />
        </>
      );
    case "castle":
      return g(
        <>
          <rect x={-s * 0.55} y={-s * 0.1} width={s * 1.1} height={s * 0.7} />
          <rect x={-s * 0.72} y={-s * 0.45} width={s * 0.22} height={s * 0.4} />
          <rect x={s * 0.5} y={-s * 0.45} width={s * 0.22} height={s * 0.4} />
          <rect x={-s * 0.12} y={-s * 0.55} width={s * 0.24} height={s * 0.5} />
          <rect x={-s * 0.18} y={s * 0.15} width={s * 0.36} height={s * 0.45} fill="#fff" opacity={0.28} stroke="none" />
        </>
      );
    default: {
      const _exhaustive: never = skin;
      return _exhaustive;
    }
  }
}
