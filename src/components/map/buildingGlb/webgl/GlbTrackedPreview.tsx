import type { ReactElement } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { useGlbSharedCanvas } from "./GlbSharedCanvasContext";
import { BuildingGlbSettingsPreviewSolo } from "./BuildingGlbSettingsPreviewSolo";
import { SharedGlbTrackedPreview } from "./SharedGlbTrackedPreview";

export type GlbTrackedPreviewProps = {
  skin: GlbBuildingSkinId;
  size: number;
  spin?: boolean;
  neutral?: boolean;
  playAnimations?: boolean;
  pointerEventsNone?: boolean;
  paused?: boolean;
  viewId?: string;
  isSelected?: boolean;
};

/**
 * Внутри GlbSharedCanvasHost — View (строка настроек / карта).
 * Без хоста — solo canvas (fallback).
 */
export function GlbTrackedPreview(props: GlbTrackedPreviewProps): ReactElement {
  const host = useGlbSharedCanvas();
  if (host) {
    return <SharedGlbTrackedPreview {...props} />;
  }
  return (
    <BuildingGlbSettingsPreviewSolo
      {...props}
      previewKind={props.pointerEventsNone ? "map" : "settings"}
      pointerEventsNone={props.pointerEventsNone}
      playAnimations={props.playAnimations ?? !props.pointerEventsNone}
    />
  );
}
