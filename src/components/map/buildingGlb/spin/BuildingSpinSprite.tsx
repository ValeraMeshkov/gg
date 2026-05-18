import { memo, useMemo, type CSSProperties, type ReactElement } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import {
  getBuildingSpriteDisplayScale,
  getSpinSheetDisplayRotationRad,
} from "@/components/map/buildingGlb/catalog/buildingSpriteDisplayScale";
import { SPIN_SHEET_FRAMES } from "./buildingSpinSheetConstants";
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
};

function BuildingSpinSpriteInner({
  skin,
  size,
  phaseKey,
  displayScale,
  animated = true,
  spinSpeed = 1,
}: BuildingSpinSpriteProps): ReactElement | null {
  const scale = displayScale ?? getBuildingSpriteDisplayScale(skin);
  const rotationRad = getSpinSheetDisplayRotationRad(skin);
  const sheetUrl = getBuildingSpinSheetUrl(skin);
  const spinFrame = useMapSpinFrame(animated, spinSpeed);
  const phaseOffset = useMemo(
    () => spinPhaseOffsetFromKey(phaseKey, SPIN_SHEET_FRAMES),
    [phaseKey]
  );

  const style = useMemo((): CSSProperties | undefined => {
    if (!sheetUrl) return undefined;
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
      ...(scale !== 1 || rotationRad !== 0
        ? {
            transform: [
              rotationRad !== 0
                ? `rotate(${(rotationRad * 180) / Math.PI}deg)`
                : "",
              scale !== 1 ? `scale(${scale})` : "",
            ]
              .filter(Boolean)
              .join(" "),
            transformOrigin: "center center",
          }
        : {}),
    };
  }, [sheetUrl, size, scale, rotationRad, spinFrame, phaseOffset]);

  if (!sheetUrl || !hasBuildingSpinSheet(skin)) {
    return null;
  }

  return <div className={styles.sprite} style={style} aria-hidden />;
}

export const BuildingSpinSprite = memo(BuildingSpinSpriteInner);
