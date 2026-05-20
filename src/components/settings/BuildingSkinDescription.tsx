import type { ReactElement } from "react";
import type { BuildingSkinId } from "@/game/appearance";
import { getBuildingUiDescription } from "@/shared/buildingUiDescription";
import styles from "./BuildingSkinDescription.module.scss";

export type BuildingSkinDescriptionProps = {
  building: BuildingSkinId;
  className?: string;
};

export function BuildingSkinDescription({
  building,
  className,
}: BuildingSkinDescriptionProps): ReactElement {
  const { summary, bullets } = getBuildingUiDescription(building);

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <p className={styles.summary}>{summary}</p>
      {bullets.length > 0 ? (
        <ul className={styles.list}>
          {bullets.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
