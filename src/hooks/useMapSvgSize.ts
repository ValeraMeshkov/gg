import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

/** Размер SVG на экране для meet-scale и постоянного px-размера точек. */
export function useMapSvgSize(
  svgRef: RefObject<SVGSVGElement | null>,
  resetKey?: string
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    const sync = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) =>
        prev.width === w && prev.height === h ? prev : { width: w, height: h }
      );
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [svgRef, resetKey]);

  return size;
}
