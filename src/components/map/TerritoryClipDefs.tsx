import type { ReactElement } from "react";
import type { TerritoryClipRect } from "../../game/maps/world/types";

export type TerritoryClipSource = {
  id: string;
  clip?: TerritoryClipRect;
};

type TerritoryClipDefsProps = {
  prefix: string;
  territories: readonly TerritoryClipSource[];
};

/** Один `<defs>` со всеми clipPath карты — без дублирования у каждой территории. */
export function TerritoryClipDefs({
  prefix,
  territories,
}: TerritoryClipDefsProps): ReactElement | null {
  let any = false;
  for (const t of territories) {
    if (t.clip) {
      any = true;
      break;
    }
  }
  if (!any) return null;

  return (
    <defs>
      {territories.map((t) =>
        t.clip ? (
          <clipPath key={t.id} id={`${prefix}-${t.id}`}>
            <rect
              x={t.clip.x}
              y={t.clip.y}
              width={t.clip.width}
              height={t.clip.height}
            />
          </clipPath>
        ) : null
      )}
    </defs>
  );
}
