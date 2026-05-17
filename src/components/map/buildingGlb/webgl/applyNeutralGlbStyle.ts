import {
  Color,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
} from "three";

const NEUTRAL_TINT = new Color(0xc8d4e8);

function muteMaterial(mat: Material): Material {
  const next = mat.clone();

  if (next instanceof MeshStandardMaterial) {
    next.color.lerp(NEUTRAL_TINT, 0.22);
    next.metalness = Math.min(next.metalness, 0.12);
    next.roughness = Math.max(next.roughness, 0.82);
    if (next.emissive) {
      next.emissive.set(0x000000);
      next.emissiveIntensity = 0;
    }
    next.transparent = false;
    next.opacity = 1;
    next.depthWrite = true;
    return next;
  }

  if ("color" in next && next.color instanceof Color) {
    next.color.lerp(NEUTRAL_TINT, 0.22);
  }
  next.transparent = false;
  next.opacity = 1;
  next.depthWrite = true;
  return next;
}

/** Приглушает модель на незавоёванных точках (без прозрачности — иначе чёрные силуэты). */
export function applyNeutralGlbStyle(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map(muteMaterial);
    } else if (child.material) {
      child.material = muteMaterial(child.material);
    }
  });
}
