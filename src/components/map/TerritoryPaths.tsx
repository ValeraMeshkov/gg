import { memo, type CSSProperties, type ReactElement } from "react";

type TerritoryPathsProps = {
  paths: readonly string[];
  className?: string;
  style?: CSSProperties;
  /** id clipPath из `<TerritoryClipDefs>` (без `url(#)`). */
  clipPathId?: string;
};

function pathsEq(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function territoryPathsPropsEqual(
  prev: TerritoryPathsProps,
  next: TerritoryPathsProps
): boolean {
  if (prev.className !== next.className) return false;
  if (prev.clipPathId !== next.clipPathId) return false;
  if (!pathsEq(prev.paths, next.paths)) return false;
  const ps = prev.style;
  const ns = next.style;
  if (ps === ns) return true;
  if (!ps && !ns) return true;
  if (!ps || !ns) return false;
  return ps.fill === ns.fill && ps.stroke === ns.stroke;
}

/** Только path; clipPath задаётся один раз в `<TerritoryClipDefs>`. */
export const TerritoryPaths = memo(function TerritoryPaths({
  paths,
  clipPathId,
  className,
  style,
}: TerritoryPathsProps): ReactElement {
  const url = clipPathId ? `url(#${clipPathId})` : undefined;
  return (
    <>
      {paths.map((d, pi) => (
        <path
          key={pi}
          d={d}
          className={className}
          style={style}
          clipPath={url}
        />
      ))}
    </>
  );
}, territoryPathsPropsEqual);
