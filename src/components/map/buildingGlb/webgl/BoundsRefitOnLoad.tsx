import { useBounds } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";

/** После загрузки GLB переподогнать камеру (на первом кадре bbox часто пустой). */
export function BoundsRefitOnLoad({ revision }: { revision: string }): null {
  const bounds = useBounds();
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    let cancelled = false;
    let frame = 0;

    const refit = () => {
      if (cancelled || frame > 24) return;
      try {
        bounds?.refresh()?.clip();
      } catch {
        return;
      }
      invalidate();
      frame += 1;
      requestAnimationFrame(refit);
    };

    refit();
    return () => {
      cancelled = true;
    };
  }, [revision, bounds, invalidate]);

  return null;
}
