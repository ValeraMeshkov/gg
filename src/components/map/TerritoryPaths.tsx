import type { CSSProperties, ReactElement } from "react";
import type { TerritoryClipRect } from "../../game/maps/world/types";

type TerritoryPathsProps = {
  clipIdPrefix: string;
  territoryId: string;
  paths: readonly string[];
  clip?: TerritoryClipRect;
  className?: string;
  style?: CSSProperties;
};

export function TerritoryPaths({
  clipIdPrefix,
  territoryId,
  paths,
  clip,
  className,
  style,
}: TerritoryPathsProps): ReactElement {
  const clipId = clip ? `${clipIdPrefix}-${territoryId}` : undefined;

  return (
    <>
      {clip ? (
        <defs>
          <clipPath id={clipId}>
            <rect
              x={clip.x}
              y={clip.y}
              width={clip.width}
              height={clip.height}
            />
          </clipPath>
        </defs>
      ) : null}
      {paths.map((d, pi) => (
        <path
          key={pi}
          d={d}
          className={className}
          style={style}
          clipPath={clipId ? `url(#${clipId})` : undefined}
        />
      ))}
    </>
  );
}
