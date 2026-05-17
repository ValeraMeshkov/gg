import type { RefObject } from "react";
import type { GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";

export type GlbPreviewKind = "settings" | "map";

export type GlbSharedViewSpec = {
  id: string;
  track: RefObject<HTMLElement>;
  skin: GlbBuildingSkinId;
  spin: boolean;
  playAnimations: boolean;
  previewKind: GlbPreviewKind;
  neutral?: boolean;
  onReady?: () => void;
};

export type GlbSharedViewRegistration = GlbSharedViewSpec & {
  wantsView: boolean;
  priority: number;
};

export type GlbSharedCanvasApi = {
  register: (spec: GlbSharedViewRegistration) => () => void;
  updateView: (
    id: string,
    patch: Partial<
      Pick<
        GlbSharedViewRegistration,
        "wantsView" | "priority" | "spin" | "playAnimations" | "neutral" | "onReady"
      >
    >
  ) => void;
  /** Перерисовать canvas (скролл, смена размера сетки). */
  invalidate: () => void;
};

