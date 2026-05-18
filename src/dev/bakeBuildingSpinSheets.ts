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
/** Только для dev-запекания (GLB не в git — положить локально для rebake). */
const BAKE_ONLY_GLB_URLS: Record<string, string> = {};

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

/** Нормализация GLB; итоговый размер задаёт постобработка по альфе. */
const BAKE_TARGET_MAX_EXTENT = 1.85;

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
  return BAKE_TARGET_MAX_EXTENT / maxDim;
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

/** Порог альфы для обрезки (низкий — не рвать тонкую середину у вытянутых моделей). */
const BAKE_OPAQUE_ALPHA_MIN = 10;

/** Целевая доля кадра под контент (итоговый scale ещё ограничивается без обрезки). */
const BAKE_CONTENT_FILL = 0.9;
let frameShiftCanvas: HTMLCanvasElement | null = null;

type OpaqueBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** AABB всего непрозрачного слоя. */
function measureOpaqueBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): OpaqueBounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[row + x * 4 + 3]! > BAKE_OPAQUE_ALPHA_MIN) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

/** Макс. scale от центра кадра, чтобы bbox кадра не вылез за pad. */
function maxCenterScaleForBounds(
  bounds: OpaqueBounds,
  framePx: number,
  pad: number
): number {
  const c = framePx * 0.5;
  const lo = pad;
  const hi = framePx - pad;
  let cap = Infinity;
  const { minX, maxX, minY, maxY } = bounds;

  if (minX < c) cap = Math.min(cap, (lo - c) / (minX - c));
  if (maxX > c) cap = Math.min(cap, (hi - c) / (maxX - c));
  if (minY < c) cap = Math.min(cap, (lo - c) / (minY - c));
  if (maxY > c) cap = Math.min(cap, (hi - c) / (maxY - c));
  return cap;
}

/**
 * Единый scale от центра кадра (ось вращения 3D уже в центре).
 * Без покадрового crop/центрирования — иначе «дёргается» при spin.
 */
function fitSheetOpaqueContentToFrames(
  sheetCtx: CanvasRenderingContext2D,
  framePx: number,
  frameCount: number
): void {
  const pad = SPIN_SHEET_BAKE_FRAME_PAD_Y;
  const inner = framePx - 2 * pad;
  const center = framePx * 0.5;
  const allBounds: OpaqueBounds[] = [];

  for (let i = 0; i < frameCount; i += 1) {
    const slotX = i * framePx;
    const { data, width, height } = sheetCtx.getImageData(slotX, 0, framePx, framePx);
    const bounds = measureOpaqueBounds(data, width, height);
    if (bounds) allBounds.push(bounds);
  }
  if (allBounds.length === 0) return;

  let globalMaxW = 0;
  let globalMaxH = 0;
  for (const bounds of allBounds) {
    globalMaxW = Math.max(globalMaxW, bounds.maxX - bounds.minX + 1);
    globalMaxH = Math.max(globalMaxH, bounds.maxY - bounds.minY + 1);
  }
  if (globalMaxW <= 0 || globalMaxH <= 0) return;

  const desiredScale =
    Math.min(inner / globalMaxW, inner / globalMaxH) * BAKE_CONTENT_FILL;

  let scaleCap = Infinity;
  for (const bounds of allBounds) {
    scaleCap = Math.min(scaleCap, maxCenterScaleForBounds(bounds, framePx, pad));
  }

  const scale = Math.min(desiredScale, scaleCap);
  if (scale <= 1.01 || !Number.isFinite(scale)) return;

  if (!frameShiftCanvas) {
    frameShiftCanvas = document.createElement("canvas");
  }
  frameShiftCanvas.width = framePx;
  frameShiftCanvas.height = framePx;
  const tempCtx = frameShiftCanvas.getContext("2d", { alpha: true });
  if (!tempCtx) return;

  for (let i = 0; i < frameCount; i += 1) {
    const slotX = i * framePx;
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
    sheetCtx.save();
    sheetCtx.translate(slotX + center, center);
    sheetCtx.scale(scale, scale);
    sheetCtx.drawImage(frameShiftCanvas, -center, -center, framePx, framePx);
    sheetCtx.restore();
  }
}

/** Один и тот же сдвиг для всех кадров — без «подпрыгивания». */
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

/** Один и тот же сдвиг по Y для всех кадров (как до пост-скейла). */
function centerSheetPixelsVertically(
  sheetCtx: CanvasRenderingContext2D,
  framePx: number,
  frameCount: number
): void {
  const pad = SPIN_SHEET_BAKE_FRAME_PAD_Y;
  let globalMinY = framePx;
  let globalMaxY = -1;

  for (let i = 0; i < frameCount; i += 1) {
    const slotX = i * framePx;
    const { data, width, height } = sheetCtx.getImageData(slotX, 0, framePx, framePx);
    const bounds = measureOpaqueBounds(data, width, height);
    if (!bounds) continue;
    globalMinY = Math.min(globalMinY, bounds.minY);
    globalMaxY = Math.max(globalMaxY, bounds.maxY);
  }
  if (globalMaxY < globalMinY) return;

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
} {
  const box = new Box3().setFromObject(model);
  box.getCenter(_center);
  model.position.sub(_center);

  const rotateGroup = new Group();
  rotateGroup.add(model);

  const offsetGroup = new Group();
  offsetGroup.position.y = PREVIEW_MODEL_Y;
  offsetGroup.add(rotateGroup);

  return { root: offsetGroup, rotateGroup };
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

function glbUrlForBake(entry: GlbBuildingCatalogEntry): string {
  const url = entry.url ?? BAKE_ONLY_GLB_URLS[entry.glbFile];
  if (!url) {
    throw new Error(`Нет URL для запекания: ${entry.glbFile}`);
  }
  return url;
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
  const model = await loadModel(glbUrlForBake(entry));
  const mapScale = getGlbMapScale(entry.id);
  const displayScale = fitScale(model) * MAP_PREVIEW_MODEL_BOOST * mapScale;
  model.scale.setScalar(displayScale);

  const { root, rotateGroup } = buildSpinPivot(model);

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
  spinUnion.getCenter(_center);
  centerFrustumOnWorldPoint(camera, scene, _center);

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

  fitSheetOpaqueContentToFrames(ctx, SPIN_SHEET_FRAME_PX, SPIN_SHEET_FRAMES);
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
