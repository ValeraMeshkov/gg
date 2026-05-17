import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { LoopRepeat, type Group } from "three";
import { applyNeutralGlbStyle } from "./applyNeutralGlbStyle";
import { getGlbBuildingUrl, type GlbBuildingSkinId } from "@/components/map/buildingGlb/catalog/buildingGlbCatalog";
import { getGlbFitScale } from "./glbFitScaleCache";
import {
  getGlbModelTemplate,
  getGlbModelTemplateKey,
  setGlbModelTemplate,
} from "./glbModelTemplateCache";
import { extendGlbLoader } from "./glbLoaderExtensions";
import { SPIN_SPEED } from "@/components/map/buildingGlb/constants/isoConstants";

type BuildingGlbSceneProps = {
  skin: GlbBuildingSkinId;
  /** Вращение в превью настроек. */
  spin?: boolean;
  /** GLB-анимации (выкл. в сетке настроек для невыбранных). */
  playAnimations?: boolean;
  /** Доп. масштаб (настройки / карта). */
  modelScaleBoost?: number;
  /** Поправка из каталога (только сетка настроек). */
  catalogScale?: number;
  /** Незавоёванная точка — приглушённый вид на карте. */
  neutral?: boolean;
};

function playLoopingActions(
  actions: Record<string, import("three").AnimationAction | null>
): (() => void) | void {
  const names = Object.keys(actions);
  if (names.length === 0) return;
  const stops: Array<() => void> = [];
  for (const name of names) {
    const action = actions[name];
    if (!action) continue;
    action.reset().setLoop(LoopRepeat, Infinity).play();
    stops.push(() => action.stop());
  }
  return () => {
    for (const stop of stops) stop();
  };
}

/** Загрузка и отображение GLB; ориентация как в файле (ракурс задаёт камера). */
export function BuildingGlbScene({
  skin,
  spin = false,
  playAnimations = true,
  modelScaleBoost = 1,
  catalogScale = 1,
  neutral = false,
}: BuildingGlbSceneProps): ReactElement {
  const url = getGlbBuildingUrl(skin);
  const { scene, animations } = useGLTF(url, false, false, extendGlbLoader);
  const rootRef = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const animated = animations.length > 0;

  const model = useMemo(() => {
    if (animated) {
      const clone = scene.clone(true);
      if (neutral) applyNeutralGlbStyle(clone);
      return clone;
    }
    const cacheKey = getGlbModelTemplateKey(url, neutral);
    let template = getGlbModelTemplate(cacheKey);
    if (!template) {
      template = scene.clone(true);
      if (neutral) applyNeutralGlbStyle(template);
      setGlbModelTemplate(cacheKey, template);
    }
    return template.clone(true);
  }, [animated, scene, url, neutral]);

  const { actions } = useAnimations(animated ? animations : [], rootRef);

  const displayScale = useMemo(
    () => getGlbFitScale(url, model) * modelScaleBoost * catalogScale,
    [url, model, modelScaleBoost, catalogScale]
  );

  useEffect(() => {
    if (!animated || !playAnimations) return;
    return playLoopingActions(actions);
  }, [animated, playAnimations, actions]);

  useEffect(() => {
    if (!animated || !playAnimations) return;
    let frame = 0;
    let raf = 0;
    const tick = () => {
      invalidate();
      frame += 1;
      if (frame < 3) raf = requestAnimationFrame(tick);
    };
    tick();
    const id = window.setInterval(() => invalidate(), 1000 / 30);
    return () => {
      window.clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [animated, playAnimations, invalidate, skin]);

  useEffect(() => {
    invalidate();
  }, [displayScale, invalidate]);

  useFrame((_, delta) => {
    if (spin && rootRef.current) {
      rootRef.current.rotation.y += delta * SPIN_SPEED;
      invalidate();
    }
  });

  return (
    <group ref={rootRef} scale={displayScale}>
      <primitive object={model} />
    </group>
  );
}
