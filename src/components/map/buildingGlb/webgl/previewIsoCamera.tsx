import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { OrthographicCamera, Vector3 } from "three";
import { isoCameraOffset, PREVIEW_LOOK_AT_Y } from "@/components/map/buildingGlb/constants/isoConstants";

/** Камера превью — 3/4 как в PixelLabs. Без `zoom` зум задаёт только Bounds.fit. */
export function PreviewIsoCamera({
  lookAtY = PREVIEW_LOOK_AT_Y,
  zoom,
}: {
  lookAtY?: number;
  /** Не передавать на карте — иначе затирается подгонка Bounds. */
  zoom?: number;
}): null {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const cam = camera as OrthographicCamera;
    const dist = 14;
    const [ox, oy, oz] = isoCameraOffset(dist);
    const look = new Vector3(0, lookAtY, 0);
    cam.position.set(ox, oy, oz);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    if (zoom != null) {
      // Three.js camera — мутация в layout-effect, не в React render.
      // eslint-disable-next-line react-hooks/immutability -- orthographic zoom
      cam.zoom = zoom;
    }
    cam.near = 0.1;
    cam.far = 200;
    cam.updateProjectionMatrix();
  }, [camera, lookAtY, zoom]);

  return null;
}
