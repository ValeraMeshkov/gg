import { useFrame } from "@react-three/fiber";
import { useRef, type ReactElement, type ReactNode } from "react";
import type { Group } from "three";
import { SPIN_SPEED } from "@/components/map/buildingGlb/constants/isoConstants";

/** Вращение внутри drei View (отдельно от BuildingGlbScene). */
export function SpinningPreviewGroup({
  spin,
  children,
}: {
  spin: boolean;
  children: ReactNode;
}): ReactElement {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (spin && ref.current) {
      ref.current.rotation.y += delta * SPIN_SPEED;
    }
  });
  return <group ref={ref}>{children}</group>;
}
