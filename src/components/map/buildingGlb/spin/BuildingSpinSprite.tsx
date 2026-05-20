import { memo, useMemo, type CSSProperties, type ReactElement } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import {
  getBuildingSpriteDisplayScale,
  getSpinSheetDisplayRotationRad,
} from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import {
  MAP_SPIN_SHEET_PERIOD_SEC,
  SPIN_SHEET_FRAMES,
} from "./buildingSpinSheetConstants";
import {
  getBuildingSpinSheetUrl,
  hasBuildingSpinSheet,
} from "./buildingSpinSheets";
import { spinPhaseOffsetFromKey } from "./spinPhaseOffset";
import { useMapSpinFrame } from "./useMapSpinFrame";
import styles from "./BuildingSpinSprite.module.scss";

type BuildingSpinSpriteProps = {
  skin: GlbBuildingSkinId;
  /** Базовый размер слота (px); итог = size × spriteDisplayScale из каталога. */
  size: number;
  /** Уникальный id точки — задаёт сдвиг фазы анимации. */
  phaseKey: string;
  /** Перебивает значение из buildingSpriteDisplayScale.ts. */
  displayScale?: number;
  /** false — первый кадр без подписки на rAF (для невидимых плиток). */
  animated?: boolean;
  /** Скорость вращения; 1 = эталон (здания по умолчанию). */
  spinSpeed?: number;
  /** css — GPU-анимация на карте; react — rAF + setState (настройки, превью). */
  spinDrive?: "css" | "react";
  /** Сдвиг для центрирования в квадрате настроек (px). */
  nudgePx?: { x: number; y: number };
};

function BuildingSpinSpriteInner({
  skin,
  size,
  phaseKey,
  displayScale,
  animated = true,
  spinSpeed = 1,
  spinDrive = "react",
  nudgePx,
}: BuildingSpinSpriteProps): ReactElement | null {
  const scale = displayScale ?? getBuildingSpriteDisplayScale(skin);
  const rotationRad = getSpinSheetDisplayRotationRad(skin);
  const sheetUrl = getBuildingSpinSheetUrl(skin);
  const useCssSpin = animated && spinDrive === "css";
  const spinFrame = useMapSpinFrame(animated && spinDrive === "react", spinSpeed);
  const phaseOffset = useMemo(
    () => spinPhaseOffsetFromKey(phaseKey, SPIN_SHEET_FRAMES),
    [phaseKey]
  );

  const style = useMemo((): CSSProperties | undefined => {
    if (!sheetUrl) return undefined;
    const transformParts: string[] = [];
    if (rotationRad !== 0) {
      transformParts.push(`rotate(${(rotationRad * 180) / Math.PI}deg)`);
    }
    if (scale !== 1) {
      transformParts.push(`scale(${scale})`);
    }
    if (nudgePx?.x || nudgePx?.y) {
      transformParts.push(
        `translate(${nudgePx?.x ?? 0}px, ${nudgePx?.y ?? 0}px)`
      );
    }

    if (useCssSpin) {
      const periodSec = MAP_SPIN_SHEET_PERIOD_SEC / Math.max(0.01, spinSpeed);
      const maxOffsetPx = (SPIN_SHEET_FRAMES - 1) * size;
      const phaseDelaySec =
        -(phaseOffset / SPIN_SHEET_FRAMES) * periodSec;
      return {
        width: size,
        height: size,
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: `${SPIN_SHEET_FRAMES * size}px ${size}px`,
        backgroundPosition: "0px 0px",
        backgroundRepeat: "no-repeat",
        ...(transformParts.length > 0 && {
          transform: transformParts.join(" "),
          transformOrigin: "center center",
        }),
        ["--spin-period" as string]: `${periodSec}s`,
        ["--spin-max-offset" as string]: `${maxOffsetPx}px`,
        ["--spin-phase-delay" as string]: `${phaseDelaySec}s`,
      };
    }

    const frame =
      (spinFrame + phaseOffset + SPIN_SHEET_FRAMES) % SPIN_SHEET_FRAMES;
    const offsetPx = frame * size;
    return {
      width: size,
      height: size,
      backgroundImage: `url(${sheetUrl})`,
      backgroundSize: `${SPIN_SHEET_FRAMES * size}px ${size}px`,
      backgroundPosition: `${-offsetPx}px 0px`,
      backgroundRepeat: "no-repeat",
      ...(transformParts.length > 0 && {
        transform: transformParts.join(" "),
        transformOrigin: "center center",
      }),
    };
  }, [
    sheetUrl,
    size,
    scale,
    rotationRad,
    spinFrame,
    phaseOffset,
    nudgePx,
    useCssSpin,
    spinSpeed,
  ]);

  if (!sheetUrl || !hasBuildingSpinSheet(skin)) {
    return null;
  }

  return (
    <div
      className={useCssSpin ? `${styles.sprite} ${styles.spriteCssSpin}` : styles.sprite}
      style={style}
      aria-hidden
    />
  );
}

export const BuildingSpinSprite = memo(BuildingSpinSpriteInner);
