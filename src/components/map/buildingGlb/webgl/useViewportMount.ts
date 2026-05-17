import { useEffect, useState } from "react";

type UseViewportMountOptions = {
  /** Скролл-контейнер; без root — окно браузера. */
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
};

/** Элемент пересекает root (окно или скролл-контейнер). */
export function useViewportMount(
  element: HTMLElement | null,
  options?: UseViewportMountOptions
): boolean {
  const [mounted, setMounted] = useState(false);
  const root = options?.root ?? null;
  const rootMargin = options?.rootMargin ?? "48px";
  const threshold = options?.threshold ?? 0.01;

  useEffect(() => {
    if (!element) {
      setMounted(false);
      return;
    }

    const sync = (intersecting: boolean) => {
      setMounted(intersecting);
    };

    const io = new IntersectionObserver(
      ([entry]) => sync(entry.isIntersecting),
      { root, rootMargin, threshold }
    );
    io.observe(element);

    const rect = element.getBoundingClientRect();
    if (root) {
      const rootRect = root.getBoundingClientRect();
      const inView =
        rect.width > 0 &&
        rect.left < rootRect.right &&
        rect.right > rootRect.left;
      if (inView) sync(true);
    } else {
      const inView =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth;
      if (inView) sync(true);
    }

    return () => io.disconnect();
  }, [element, root, rootMargin, threshold]);

  return mounted;
}
