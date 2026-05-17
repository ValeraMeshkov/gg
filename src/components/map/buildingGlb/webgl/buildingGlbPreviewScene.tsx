import { Bounds, Center, OrthographicCamera } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactElement } from "react";
import { getGlbMapScale, type GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { BoundsRefitOnLoad } from "./BoundsRefitOnLoad";
import { BuildingGlbScene } from "./BuildingGlbScene";
import type { GlbPreviewKind } from "./glbSharedCanvasTypes";
import {
  MAP_PREVIEW_MODEL_BOOST,
  PREVIEW_BOUNDS_MARGIN,
  PREVIEW_CAMERA_ZOOM,
  PREVIEW_LOOK_AT_Y,
  PREVIEW_MODEL_Y,
  SETTINGS_PREVIEW_MODEL_BOOST,
  SPIN_BOUNDS_MARGIN,
} from "@/components/map/buildingGlb/constants/isoConstants";
import { PreviewIsoCamera } from "./previewIsoCamera";

export type BuildingGlbPreviewSceneProps = {
  skin: GlbBuildingSkinId;
  spin?: boolean;
  playAnimations?: boolean;
  previewKind?: GlbPreviewKind;
  neutral?: boolean;
  onReady?: () => void;
};

function PreviewReady({ onReady }: { onReady?: () => void }): null {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    onReady?.();
    invalidate();
  }, [onReady, invalidate]);
  return null;
}

/** Одна сцена для настроек и карты — без отдельной ветки mapPin. */
export function BuildingGlbPreviewScene({
  skin,
  spin = false,
  playAnimations = true,
  previewKind = "map",
  neutral = false,
  onReady,
}: BuildingGlbPreviewSceneProps): ReactElement {
  const inSettings = previewKind === "settings";
  const cameraZoom = useMemo(
    () => (inSettings ? PREVIEW_CAMERA_ZOOM * 1.1 : PREVIEW_CAMERA_ZOOM),
    [inSettings]
  );
  const boundsMargin = useMemo(() => {
    if (inSettings) {
      return spin
        ? SPIN_BOUNDS_MARGIN
        : PREVIEW_BOUNDS_MARGIN / SETTINGS_PREVIEW_MODEL_BOOST;
    }
    if (spin) return SPIN_BOUNDS_MARGIN;
    return PREVIEW_BOUNDS_MARGIN / MAP_PREVIEW_MODEL_BOOST;
  }, [spin, inSettings]);

  /** При вращении не clip — иначе модель «застывает» в рамке Bounds. */
  const clipBounds = !spin;

  return (
    <>
      <OrthographicCamera makeDefault near={0.1} far={200} />
      <PreviewIsoCamera lookAtY={PREVIEW_LOOK_AT_Y} zoom={cameraZoom} />
      {onReady ? <PreviewReady onReady={onReady} /> : null}
      <ambientLight intensity={0.88} />
      <directionalLight position={[8, 12, 10]} intensity={1.1} />
      <directionalLight position={[-5, 6, -4]} intensity={0.38} />
      <Bounds
        fit
        clip={clipBounds}
        observe={!spin}
        margin={boundsMargin}
        maxDuration={0}
      >
        <BoundsRefitOnLoad revision={skin} />
        <Center>
          <group position={[0, PREVIEW_MODEL_Y, 0]}>
            <BuildingGlbScene
              skin={skin}
              spin={spin}
              playAnimations={playAnimations}
              modelScaleBoost={
                inSettings
                  ? SETTINGS_PREVIEW_MODEL_BOOST
                  : MAP_PREVIEW_MODEL_BOOST
              }
              catalogScale={inSettings ? 1 : getGlbMapScale(skin)}
              neutral={neutral}
            />
          </group>
        </Center>
      </Bounds>
    </>
  );
}
