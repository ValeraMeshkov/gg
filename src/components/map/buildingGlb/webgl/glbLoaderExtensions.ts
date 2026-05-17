import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

let meshoptReady: Promise<void> | null = null;
let meshoptResolved = false;

function ensureMeshoptReady(): Promise<void> {
  if (!meshoptReady) {
    meshoptReady = MeshoptDecoder.ready.then(() => {
      meshoptResolved = true;
    });
  }
  return meshoptReady;
}

export function isGlbLoaderReady(): boolean {
  return meshoptResolved;
}

/** Настройка GLTFLoader для meshopt-сжатых GLB (gltf-transform). */
export function extendGlbLoader(loader: {
  setMeshoptDecoder: (decoder: typeof MeshoptDecoder) => void;
}): void {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

const MESHOPT_READY_TIMEOUT_MS = 6_000;

/** Вызвать до preload / useGLTF. Не блокирует вечно, если meshopt не инициализировался. */
export async function prepareGlbLoader(): Promise<void> {
  await Promise.race([
    ensureMeshoptReady(),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, MESHOPT_READY_TIMEOUT_MS);
    }),
  ]);
}
