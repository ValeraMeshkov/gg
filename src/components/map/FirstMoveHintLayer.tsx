import type { ReactElement } from "react";
import { useMemo } from "react";
import type { TerritoryGameMap } from "../../game/maps";
import { firstMoveHintEndpoints } from "../../game/firstMoveHint";
import styles from "../MapView.module.scss";
import { TutorialHandGlyph, TUTORIAL_HAND_ART_SIZE } from "./TutorialHandGlyph";

type FirstMoveHintLayerProps = {
  map: TerritoryGameMap;
  localPlayerId: string;
  show: boolean;
  syncMapLayout?: boolean;
};

/**
 * Цикл: сверху (та же X) — падение на точку 1 → сразу на точку 2 → вверх, крупнее, исчезает.
 * Без второго захода к точке 1 и без «отхода назад».
 */
const CYCLE_SEC = 3.2;

const HAND_ART_HEIGHT = TUTORIAL_HAND_ART_SIZE;

const KEY_TIMES = "0;0.07;0.18;0.30;0.38;0.56;0.63;1";

export function FirstMoveHintLayer({
  map,
  localPlayerId,
  show,
  syncMapLayout = false,
}: FirstMoveHintLayerProps): ReactElement | null {
  const hiddenOpts = syncMapLayout ? { syncMapLayout: true as const } : undefined;
  const endpoints = useMemo(
    () =>
      show ? firstMoveHintEndpoints(map, localPlayerId, hiddenOpts) : null,
    [show, map, localPlayerId, syncMapLayout]
  );

  const anim = useMemo(() => {
    if (!endpoints) return null;
    const { from, to } = endpoints;
    const vb = map.viewBox;
    const m = Math.min(vb.width, vb.height);
    const drop = m * 0.135;
    const rise = m * 0.125;
    const { x: fx, y: fy } = from;
    const { x: tx, y: ty } = to;

    const translateValues = `${fx},${fy - drop};${fx},${fy - drop * 0.24};${fx},${fy};${tx},${ty};${tx},${ty};${tx},${ty - rise};${fx},${fy - drop};${fx},${fy - drop}`;

    const scaleValues = "1.24;1.08;1;1;1;1.38;1.22;1.22";

    const opacityValues = "0;1;1;1;1;0;0;0";

    return { translateValues, scaleValues, opacityValues };
  }, [endpoints, map.viewBox]);

  if (!endpoints || !anim) return null;

  const vb = map.viewBox;
  const handLen = Math.min(vb.width, vb.height) * 0.12;
  const scaleFixed = handLen / HAND_ART_HEIGHT;

  return (
    <g aria-hidden className={styles.firstMoveHint} style={{ pointerEvents: "none" }}>
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values={anim.translateValues}
          keyTimes={KEY_TIMES}
          dur={`${CYCLE_SEC}s`}
          repeatCount="indefinite"
          calcMode="linear"
        />
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values={anim.scaleValues}
            keyTimes={KEY_TIMES}
            dur={`${CYCLE_SEC}s`}
            repeatCount="indefinite"
            calcMode="linear"
            additive="replace"
          />
          <g>
            <animate
              attributeName="opacity"
              values={anim.opacityValues}
              keyTimes={KEY_TIMES}
              dur={`${CYCLE_SEC}s`}
              repeatCount="indefinite"
              calcMode="linear"
            />
            <TutorialHandGlyph
              className={styles.firstMoveHintHandWrap}
              scaleFixed={scaleFixed}
            />
          </g>
        </g>
      </g>
    </g>
  );
}
