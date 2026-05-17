import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState, type ReactElement } from "react";
import type { WebGLRenderer } from "three";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { BuildingGlbPreviewScene } from "./buildingGlbPreviewScene";
import type { GlbPreviewKind } from "./glbSharedCanvasTypes";
import { useSettingsOpen } from "@/context/GameShellContext";
import { configureGlbRenderer } from "./configureGlbRenderer";
import { GlbLoaderGate } from "./GlbLoaderGate";

export type BuildingGlbSettingsPreviewSoloProps = {
  skin: GlbBuildingSkinId;
  size: number;
  spin?: boolean;
  neutral?: boolean;
  playAnimations?: boolean;
  pointerEventsNone?: boolean;
  paused?: boolean;
  previewKind?: GlbPreviewKind;
};

/** Отдельный WebGL-canvas на каждую плитку (настройки) или fallback на карте. */
export function BuildingGlbSettingsPreviewSolo({
  skin,
  size,
  spin = false,
  neutral = false,
  playAnimations = true,
  pointerEventsNone = false,
  paused = false,
  previewKind = "settings",
}: BuildingGlbSettingsPreviewSoloProps): ReactElement {
  const settingsOpen = useSettingsOpen();
  const glRef = useRef<WebGLRenderer | null>(null);
  const [ready, setReady] = useState(false);
  const passThrough = pointerEventsNone;
  const isMapPin = pointerEventsNone;
  const inSettings = previewKind === "settings";
  const live = !paused && (isMapPin ? !settingsOpen : inSettings ? true : settingsOpen);
  const spinLive = Boolean(spin && live);
  const animLive = Boolean(playAnimations && live);

  useEffect(() => {
    setReady(false);
  }, [skin, size]);

  useEffect(
    () => () => {
      glRef.current?.dispose();
      glRef.current = null;
    },
    []
  );

  return (
    <div
      className="buildingGlbSettingsPreview"
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        pointerEvents: passThrough ? "none" : undefined,
        contain: "strict",
      }}
    >
      {!ready ? (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.max(10, size * 0.14),
            fontWeight: 700,
            color: "#6a758c",
            pointerEvents: passThrough ? "none" : undefined,
          }}
        >
          …
        </span>
      ) : null}
      <Canvas
        key={skin}
        orthographic
        frameloop={
          live && (spinLive || animLive) ? "always" : live ? "demand" : "never"
        }
        gl={{ alpha: true, antialias: true }}
        dpr={
          inSettings || (isMapPin && (spinLive || animLive))
            ? [1, 2]
            : [1, 1]
        }
        style={{
          width: size,
          height: size,
          opacity: isMapPin ? 1 : ready ? 1 : 0,
          transition:
            isMapPin || ready ? undefined : "opacity 0.12s ease",
          pointerEvents: passThrough ? "none" : undefined,
        }}
        onCreated={(state) => {
          glRef.current = state.gl;
          configureGlbRenderer(
            state,
            pointerEventsNone ? { pointerEventsNone: true } : undefined
          );
        }}
      >
        <GlbLoaderGate>
          <Suspense fallback={null}>
            <BuildingGlbPreviewScene
              skin={skin}
              spin={spinLive}
              playAnimations={animLive}
              previewKind={previewKind}
              neutral={neutral}
              onReady={() => setReady(true)}
            />
          </Suspense>
        </GlbLoaderGate>
      </Canvas>
    </div>
  );
}
