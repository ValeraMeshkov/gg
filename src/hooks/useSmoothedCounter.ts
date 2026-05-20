import { useEffect, useRef, useState } from "react";

type Options = {
  /** false — показываем целевое значение без анимации. */
  enabled?: boolean;
};

/**
 * Плавно догоняет отображаемое число до target (для HP на карте).
 */
export function useSmoothedCounter(
  target: number,
  { enabled = true }: Options = {}
): number {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(target);
  const targetRef = useRef(target);
  const rafRef = useRef(0);

  targetRef.current = target;

  useEffect(() => {
    if (!enabled) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }

    const step = () => {
      const t = targetRef.current;
      const d = displayRef.current;
      const delta = t - d;
      if (Math.abs(delta) < 0.04) {
        if (d !== t) {
          displayRef.current = t;
          setDisplay(t);
        }
        return;
      }
      const next = d + delta * 0.42;
      displayRef.current = next;
      setDisplay(next);
      rafRef.current = requestAnimationFrame(step);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, enabled]);

  return enabled ? Math.round(display) : target;
}
