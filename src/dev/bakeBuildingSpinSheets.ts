import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  OrthographicCamera,
  SRGBColorSpace,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import {
  GLB_BUILDING_CATALOG,
  getGlbMapScale,
  type GlbBuildingCatalogEntry,
} from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import {
  SPIN_SHEET_BAKE_FRAME_PAD_Y,
  SPIN_SHEET_BAKE_FRUSTUM_MARGIN,
  SPIN_SHEET_BAKE_SUPERSAMPLE,
  SPIN_SHEET_FRAME_PX,
  SPIN_SHEET_FRAMES,
} from "@/components/map/buildingGlb/spin/buildingSpinSheetConstants";
import {
  MAP_PREVIEW_MODEL_BOOST,
  PREVIEW_LOOK_AT_Y,
  PREVIEW_MODEL_Y,
  SPIN_BOUNDS_MARGIN,
  isoCameraOffset,
} from "@/components/map/buildingGlb/constants/isoConstants";

export {
  MAP_SPIN_SHEET_PERIOD_SEC,
  SPIN_SHEET_FRAMES,
  SPIN_SHEET_FRAME_PX,
} from "@/components/map/buildingGlb/spin/buildingSpinSheetConstants";

const TARGET_MAX_EXTENT = 1.85;
const _center = new Vector3();
const _size = new Vector3();
const _projected = new Vector3();

export type BakedSpinSheet = {
  glbFile: string;
  skinId: string;
  pngBase64: string;
};

export type BakeSpinProgress = {
  done: number;
  total: number;
  glbFile: string;
};

let loaderReady: Promise<void> | null = null;

function ensureLoader(): Promise<void> {
  if (!loaderReady) {
    loaderReady = MeshoptDecoder.ready.then(() => undefined);
  }
  return loaderReady;
}

function fitScale(root: Group): number {
  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return 1;
  box.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z, 1e-6);
  return TARGET_MAX_EXTENT / maxDim;
}

function fitOrthoToUnionBox(
  camera: OrthographicCamera,
  union: Box3,
  margin: number
): void {
  union.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z, 1e-6) * margin;
  const half = maxDim / 2;
  camera.left = -half;
  camera.right = half;
  camera.top = half;
  camera.bottom = -half;
  camera.near = 0.1;
  camera.far = 200;
  camera.updateProjectionMatrix();
}

/**
 * Сдвигает ortho-frustum так, чтобы worldPoint попал в центр кадра (NDC 0,0).
 * Ось вращения тогда не «плывёт» между кадрами.
 */
function centerFrustumOnWorldPoint(
  camera: OrthographicCamera,
  scene: Scene,
  worldPoint: Vector3
): void {
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  _projected.copy(worldPoint).project(camera);
  const fw = camera.right - camera.left;
  const fh = camera.top - camera.bottom;
  const shiftX = _projected.x * fw * 0.5;
  const shiftY = _projected.y * fh * 0.5;
  camera.left -= shiftX;
  camera.right -= shiftX;
  camera.top -= shiftY;
  camera.bottom -= shiftY;
  camera.updateProjectionMatrix();
}

const ALPHA_THRESHOLD = 12;
let frameShiftCanvas: HTMLCanvasElement | null = null;

function measureOpaqueVerticalBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): { minY: number; maxY: number } | null {
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3]! > ALPHA_THRESHOLD) {
        if (y < minY) minY = y;
        maxY = y;
        break;
      }
    }
  }
  if (maxY < minY) return null;
  return { minY, maxY };
}

/** Один и тот же сдвиг для всех кадров листа — без «подпрыгивания» при вращении. */
function shiftFrameSlot(
  sheetCtx: CanvasRenderingContext2D,
  slotX: number,
  framePx: number,
  shift: number
): void {
  if (shift === 0) return;
  if (!frameShiftCanvas) {
    frameShiftCanvas = document.createElement("canvas");
  }
  frameShiftCanvas.width = framePx;
  frameShiftCanvas.height = framePx;
  const tempCtx = frameShiftCanvas.getContext("2d", { alpha: true });
  if (!tempCtx) return;

  tempCtx.clearRect(0, 0, framePx, framePx);
  tempCtx.drawImage(
    sheetCtx.canvas,
    slotX,
    0,
    framePx,
    framePx,
    0,
    0,
    framePx,
    framePx
  );
  sheetCtx.clearRect(slotX, 0, framePx, framePx);
  sheetCtx.drawImage(frameShiftCanvas, 0, 0, framePx, framePx, slotX, shift, framePx, framePx);
}

function centerSheetPixelsVertically(
  sheetCtx: CanvasRenderingContext2D,
  framePx: number,
  frameCount: number
): void {
  let globalMinY = framePx;
  let globalMaxY = -1;
  for (let i = 0; i < frameCount; i += 1) {
    const slotX = i * framePx;
    const { data, width, height } = sheetCtx.getImageData(slotX, 0, framePx, framePx);
    const bounds = measureOpaqueVerticalBounds(data, width, height);
    if (!bounds) continue;
    globalMinY = Math.min(globalMinY, bounds.minY);
    globalMaxY = Math.max(globalMaxY, bounds.maxY);
  }
  if (globalMaxY < globalMinY) return;

  const pad = SPIN_SHEET_BAKE_FRAME_PAD_Y;
  const innerH = framePx - 2 * pad;
  const contentH = globalMaxY - globalMinY + 1;
  const shift = Math.round((innerH - contentH) / 2) + pad - globalMinY;
  if (shift === 0) return;

  for (let i = 0; i < frameCount; i += 1) {
    shiftFrameSlot(sheetCtx, i * framePx, framePx, shift);
  }
}

/** Как BuildingGlbPreviewScene: Center + offset + вращение внутри. */
function buildSpinPivot(model: Group): {
  root: Group;
  rotateGroup: Group;
  spinAnchor: Vector3;
} {
  const box = new Box3().setFromObject(model);
  box.getCenter(_center);
  model.position.sub(_center);

  const rotateGroup = new Group();
  rotateGroup.add(model);

  const offsetGroup = new Group();
  offsetGroup.position.y = PREVIEW_MODEL_Y;
  offsetGroup.add(rotateGroup);

  const spinAnchor = new Vector3(0, PREVIEW_MODEL_Y, 0);
  return { root: offsetGroup, rotateGroup, spinAnchor };
}

function unionBoxOverSpin(rotateGroup: Group): Box3 {
  const union = new Box3();
  for (let i = 0; i < SPIN_SHEET_FRAMES; i += 1) {
    rotateGroup.rotation.y = (i / SPIN_SHEET_FRAMES) * Math.PI * 2;
    union.union(new Box3().setFromObject(rotateGroup));
  }
  rotateGroup.rotation.y = 0;
  return union;
}

async function loadModel(url: string): Promise<Group> {
  await ensureLoader();
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  return gltf.scene.clone(true) as Group;
}

function spinBoundsMargin(): number {
  return (SPIN_BOUNDS_MARGIN / MAP_PREVIEW_MODEL_BOOST) * SPIN_SHEET_BAKE_FRUSTUM_MARGIN;
}

export async function bakeBuildingSpinSheet(
  entry: GlbBuildingCatalogEntry
): Promise<BakedSpinSheet> {
  const model = await loadModel(entry.url);
  const mapScale = getGlbMapScale(entry.id);
  const displayScale = fitScale(model) * MAP_PREVIEW_MODEL_BOOST * mapScale;
  model.scale.setScalar(displayScale);

  const { root, rotateGroup, spinAnchor } = buildSpinPivot(model);

  const scene = new Scene();
  scene.add(root);
  scene.add(new AmbientLight(0xffffff, 0.88));
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(8, 12, 10);
  scene.add(key);
  const fill = new DirectionalLight(0xffffff, 0.38);
  fill.position.set(-5, 6, -4);
  scene.add(fill);

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const dist = 14;
  const [ox, oy, oz] = isoCameraOffset(dist);
  camera.position.set(ox, oy, oz);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, PREVIEW_LOOK_AT_Y, 0);

  const spinUnion = unionBoxOverSpin(rotateGroup);
  fitOrthoToUnionBox(camera, spinUnion, spinBoundsMargin());
  centerFrustumOnWorldPoint(camera, scene, spinAnchor);

  const renderer = new WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
  });
  const renderPx = SPIN_SHEET_FRAME_PX * SPIN_SHEET_BAKE_SUPERSAMPLE;
  renderer.setSize(renderPx, renderPx, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;

  const sheet = document.createElement("canvas");
  sheet.width = SPIN_SHEET_FRAME_PX * SPIN_SHEET_FRAMES;
  sheet.height = SPIN_SHEET_FRAME_PX;
  const ctx = sheet.getContext("2d", { alpha: true });
  if (!ctx) {
    renderer.dispose();
    throw new Error("2d context unavailable");
  }
  ctx.clearRect(0, 0, sheet.width, sheet.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (let i = 0; i < SPIN_SHEET_FRAMES; i += 1) {
    rotateGroup.rotation.y = (i / SPIN_SHEET_FRAMES) * Math.PI * 2;
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);
    const slotX = i * SPIN_SHEET_FRAME_PX;
    ctx.clearRect(slotX, 0, SPIN_SHEET_FRAME_PX, SPIN_SHEET_FRAME_PX);
    ctx.drawImage(
      renderer.domElement,
      0,
      0,
      renderPx,
      renderPx,
      slotX,
      0,
      SPIN_SHEET_FRAME_PX,
      SPIN_SHEET_FRAME_PX
    );
  }

  centerSheetPixelsVertically(ctx, SPIN_SHEET_FRAME_PX, SPIN_SHEET_FRAMES);

  renderer.dispose();

  const pngBase64 = sheet.toDataURL("image/png").split(",")[1] ?? "";
  return {
    glbFile: entry.glbFile,
    skinId: entry.id,
    pngBase64,
  };
}

export async function bakeAllBuildingSpinSheets(
  onProgress?: (p: BakeSpinProgress) => void,
  onlyGlbFile?: string
): Promise<BakedSpinSheet[]> {
  const entries = [...GLB_BUILDING_CATALOG].filter(
    (e) => !onlyGlbFile || e.glbFile === onlyGlbFile
  );
  if (onlyGlbFile && entries.length === 0) {
    throw new Error(`GLB не найден в каталоге: ${onlyGlbFile}`);
  }
  const out: BakedSpinSheet[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i]!;
    onProgress?.({ done: i, total: entries.length, glbFile: entry.glbFile });
    out.push(await bakeBuildingSpinSheet(entry));
  }
  onProgress?.({
    done: entries.length,
    total: entries.length,
    glbFile: "",
  });
  return out;
}
