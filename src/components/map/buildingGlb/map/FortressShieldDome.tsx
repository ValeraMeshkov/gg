import { memo, type CSSProperties, type ReactElement } from "react";
import { FORTRESS_SHIELD } from "@/shared/fortressShield";
import styles from "./FortressShieldDome.module.scss";

export type FortressShieldDomeProps = {
  /** Диаметр купола в px. */
  size: number;
  /** Цвет территории владельца (hex/rgb). */
  color: string;
  /** Очки щита 0–20 — яркость и толщина эффекта. */
  shieldPoints: number;
  /** false на карте — без вращающегося кольца (меньше слоёв GPU). */
  animateArc?: boolean;
};

function FortressShieldDomeInner({
  size,
  color,
  shieldPoints,
  animateArc = true,
}: FortressShieldDomeProps): ReactElement {
  const strength = Math.min(
    1,
    Math.max(0, shieldPoints / FORTRESS_SHIELD.max)
  );
  const style = {
    width: size,
    height: size,
    left: -size / 2,
    top: -size / 2,
    "--shield-color": color,
    "--shield-strength": String(strength),
  } as CSSProperties;

  return (
    <div
      className={styles.root}
      style={style}
      data-animate-arc={animateArc ? "1" : "0"}
      aria-hidden
    >
      <div className={styles.glowOuter} />
      <div className={styles.pulseWrap}>
        <div className={styles.domeFill} />
        <div className={styles.arcRing} />
        <div className={styles.rim} />
        <div className={styles.specular} />
      </div>
    </div>
  );
}

export const FortressShieldDome = memo(FortressShieldDomeInner);
