import { View } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from "react";
import styles from "@/components/map/styles/MapView.module.scss";
import { configureGlbRenderer } from "./configureGlbRenderer";
import { GlbSharedCanvasContext } from "./GlbSharedCanvasContext";
import { GlbSharedViews } from "./GlbSharedViews";
import { GlbLoaderGate } from "./GlbLoaderGate";
import type { WebGLRenderer } from "three";
import type {
  GlbSharedViewRegistration,
  GlbSharedViewSpec,
} from "./glbSharedCanvasTypes";

type GlbSharedCanvasHostProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Всегда крутить цикл рендера (сетка настроек). */
  continuousRender?: boolean;
};

function toViewSpec(r: GlbSharedViewRegistration): GlbSharedViewSpec {
  return {
    id: r.id,
    track: r.track,
    skin: r.skin,
    spin: r.spin,
    playAnimations: r.playAnimations,
    previewKind: r.previewKind,
    neutral: r.neutral,
    onReady: r.onReady,
  };
}

function pickActiveViews(
  registrations: ReadonlyMap<string, GlbSharedViewRegistration>
): GlbSharedViewSpec[] {
  return [...registrations.values()]
    .filter((r) => r.wantsView)
    .map(toViewSpec);
}

function useHostSize(ref: RefObject<HTMLElement | null>): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}

function GlbCanvasResizeSync({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>;
}): null {
  const { gl, size, invalidate } = useThree((s) => s);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const sync = () => {
      const w = Math.max(1, el.clientWidth);
      const h = Math.max(1, el.clientHeight);
      if (w !== size.width || h !== size.height) {
        gl.setSize(w, h, false);
        invalidate();
      }
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, gl, size.width, size.height, invalidate]);

  return null;
}

function GlbInvalidateBridge({
  onBind,
}: {
  onBind: (fn: () => void) => void;
}): null {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    onBind(invalidate);
    return () => onBind(() => {});
  }, [invalidate, onBind]);
  return null;
}

/** Один WebGL-контекст для всех зарегистрированных View. */
export function GlbSharedCanvasHost({
  children,
  className,
  style,
  continuousRender = false,
}: GlbSharedCanvasHostProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<WebGLRenderer | null>(null);
  const invalidateRef = useRef<() => void>(() => {});
  const hostSize = useHostSize(containerRef);
  const [registrations, setRegistrations] = useState<
    ReadonlyMap<string, GlbSharedViewRegistration>
  >(() => new Map());

  const register = useCallback((spec: GlbSharedViewRegistration) => {
    setRegistrations((prev) => {
      const next = new Map(prev);
      next.set(spec.id, spec);
      return next;
    });
    return () => {
      setRegistrations((prev) => {
        if (!prev.has(spec.id)) return prev;
        const next = new Map(prev);
        next.delete(spec.id);
        return next;
      });
    };
  }, []);

  const updateView = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          GlbSharedViewRegistration,
          "wantsView" | "priority" | "spin" | "playAnimations" | "neutral" | "onReady"
        >
      >
    ) => {
      setRegistrations((prev) => {
        const current = prev.get(id);
        if (!current) return prev;
        const next = new Map(prev);
        next.set(id, { ...current, ...patch });
        return next;
      });
    },
    []
  );

  const invalidate = useCallback(() => {
    invalidateRef.current();
  }, []);

  const views = useMemo(
    () => pickActiveViews(registrations),
    [registrations]
  );

  const bindInvalidate = useCallback((fn: () => void) => {
    invalidateRef.current = fn;
  }, []);

  const api = useMemo(
    () => ({ register, updateView, invalidate }),
    [register, updateView, invalidate]
  );

  useEffect(
    () => () => {
      glRef.current?.dispose();
      glRef.current = null;
    },
    []
  );

  const needsContinuousRender =
    continuousRender || views.some((v) => v.spin || v.playAnimations);

  const canvasStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    };
    if (hostSize.w > 0 && hostSize.h > 0) {
      return { ...base, width: hostSize.w, height: hostSize.h };
    }
    return base;
  }, [hostSize.w, hostSize.h]);

  return (
    <GlbSharedCanvasContext.Provider value={api}>
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", ...style }}
      >
        {children}
        <GlbLoaderGate>
          <GlbSharedViews views={views} />
        </GlbLoaderGate>
        <Canvas
          className={styles.mapGlbSharedCanvas}
          orthographic
          frameloop={needsContinuousRender ? "always" : "demand"}
          eventSource={containerRef as RefObject<HTMLElement>}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 1.25]}
          style={canvasStyle}
          onCreated={(state) => {
            glRef.current = state.gl;
            configureGlbRenderer(state, { pointerEventsNone: true });
          }}
        >
          <GlbInvalidateBridge onBind={bindInvalidate} />
          <GlbCanvasResizeSync containerRef={containerRef} />
          <GlbLoaderGate>
            <View.Port />
            <GlbSharedCanvasDriver views={views} />
          </GlbLoaderGate>
        </Canvas>
      </div>
    </GlbSharedCanvasContext.Provider>
  );
}

function GlbSharedCanvasDriver({
  views,
}: {
  views: readonly GlbSharedViewSpec[];
}): null {
  const invalidate = useThree((s) => s.invalidate);
  const animate = views.some((v) => v.spin || v.playAnimations);

  useFrame(() => {
    if (animate) invalidate();
  });

  return null;
}
