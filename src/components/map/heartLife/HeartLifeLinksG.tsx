import { memo, type ReactElement } from "react";
import type { HeartLifeChainDraw } from "./collectHeartLifeLinks";
import styles from "@/components/map/styles/MapView.module.scss";

type HeartLifeLinksGProps = {
  chains: readonly HeartLifeChainDraw[];
};

function HeartLifeLinksGInner({ chains }: HeartLifeLinksGProps): ReactElement | null {
  if (chains.length === 0) return null;

  return (
    <g className={styles.heartLifeLinksG} aria-hidden>
      {chains.map((chain) => (
        <path
          key={chain.key}
          className={styles.heartLifeLinkStroke}
          d={chain.pathD}
          stroke={chain.color}
        />
      ))}
    </g>
  );
}

export const HeartLifeLinksG = memo(HeartLifeLinksGInner);
