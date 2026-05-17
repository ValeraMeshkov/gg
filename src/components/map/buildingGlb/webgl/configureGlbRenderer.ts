import type { RootState } from "@react-three/fiber";
import { ACESFilmicToneMapping, SRGBColorSpace } from "three";

export function configureGlbRenderer(
  state: RootState,
  opts?: { pointerEventsNone?: boolean }
): void {
  const { gl, events } = state;
  gl.outputColorSpace = SRGBColorSpace;
  gl.toneMapping = ACESFilmicToneMapping;
  gl.toneMappingExposure = 1;
  if (opts?.pointerEventsNone) {
    gl.domElement.style.pointerEvents = "none";
    events?.disconnect?.();
  }
}
