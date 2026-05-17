import { View } from "@react-three/drei";
import { Suspense, type ReactElement } from "react";
import type { GlbSharedViewSpec } from "./glbSharedCanvasTypes";
import { BuildingGlbPreviewScene } from "./buildingGlbPreviewScene";

export function GlbSharedViews({
  views,
}: {
  views: readonly GlbSharedViewSpec[];
}): ReactElement {
  return (
    <>
      {views.map((view) => (
        <View key={view.id} track={view.track}>
          <Suspense fallback={null}>
            <BuildingGlbPreviewScene
              skin={view.skin}
              spin={view.spin}
              playAnimations={view.playAnimations}
              previewKind={view.previewKind}
              neutral={view.neutral}
              onReady={view.onReady}
            />
          </Suspense>
        </View>
      ))}
    </>
  );
}
