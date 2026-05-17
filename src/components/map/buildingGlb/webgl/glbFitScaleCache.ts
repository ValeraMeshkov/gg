import { Box3, Vector3 } from "three";
import type { Object3D } from "three";

/** Целевой размер по max-оси bbox — одинаковый визуальный масштаб в Bounds. */
const TARGET_MAX_EXTENT = 1.85;

const scaleByKey = new Map<string, number>();

/** Единый масштаб по геометрии GLB (кэш по url). */
export function getGlbFitScale(cacheKey: string, root: Object3D): number {
  const cached = scaleByKey.get(cacheKey);
  if (cached != null) return cached;

  const box = new Box3().setFromObject(root);
  if (box.isEmpty()) return 1;

  const size = box.getSize(new Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const scale = TARGET_MAX_EXTENT / maxDim;
  scaleByKey.set(cacheKey, scale);
  return scale;
}
