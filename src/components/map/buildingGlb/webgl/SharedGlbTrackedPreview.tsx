import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { useSettingsOpen } from "@/context/GameShellContext";
import { useGlbSharedCanvas } from "./GlbSharedCanvasContext";
import type { GlbTrackedPreviewProps } from "./GlbTrackedPreview";
import { BuildingGlbSettingsPreviewSolo } from "./BuildingGlbSettingsPreviewSolo";

/** Один View внутри GlbSharedCanvasHost (строка настроек или карта). */
export function SharedGlbTrackedPreview({
  skin,
  size,
  spin = false,
  neutral = false,
  playAnimations = true,
  pointerEventsNone = false,
  paused = false,
  viewId,
}: GlbTrackedPreviewProps): ReactElement {
  const host = useGlbSharedCanvas();
  const settingsOpen = useSettingsOpen();
  const isMap = pointerEventsNone;
  const previewKind = isMap ? "map" : "settings";
  const reactId = useId();
  const id = viewId ?? `${previewKind}-${skin}-${reactId}`;
  const trackRef = useRef<HTMLDivElement>(null!);
  const [ready, setReady] = useState(false);
  const onReadyRef = useRef<() => void>(() => setReady(true));
  onReadyRef.current = () => setReady(true);

  /** В настройках монтируем только при открытой модалке — всегда активны. */
  const active = isMap ? !paused && !settingsOpen : true;
  const spinLive = Boolean(spin && active);
  const animLive = Boolean(playAnimations && active);
  const wantsView = active;

  useEffect(() => {
    if (!active) setReady(false);
  }, [active, skin]);

  useEffect(() => {
    if (!host) return;
    return host.register({
      id,
      track: trackRef,
      skin,
      spin: spinLive,
      playAnimations: animLive,
      previewKind,
      neutral,
      wantsView,
      priority: isMap ? 1 : 0,
      onReady: () => onReadyRef.current(),
    });
  }, [host, id, skin, previewKind, isMap, spinLive, animLive, wantsView, neutral]);

  useEffect(() => {
    host?.updateView(id, {
      wantsView,
      spin: spinLive,
      playAnimations: animLive,
      neutral,
      onReady: () => onReadyRef.current(),
    });
  }, [host, id, wantsView, spinLive, animLive, neutral]);

  if (!host) {
    return (
      <BuildingGlbSettingsPreviewSolo
        skin={skin}
        size={size}
        spin={spin}
        playAnimations={playAnimations}
        neutral={neutral}
        previewKind={previewKind}
        pointerEventsNone={pointerEventsNone}
        paused={paused}
      />
    );
  }

  return (
    <div
      ref={trackRef}
      className="buildingGlbSettingsPreview"
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        /** На карте не прячем контейнер — под моделью уже есть SVG-круг. */
        opacity: ready ? 1 : isMap ? 1 : 0.35,
        transition: ready ? undefined : "opacity 0.12s ease",
        pointerEvents: pointerEventsNone ? "none" : undefined,
      }}
    >
      {!ready && !isMap ? (
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
            pointerEvents: "none",
          }}
        >
          …
        </span>
      ) : null}
    </div>
  );
}
