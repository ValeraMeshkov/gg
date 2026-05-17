import type { Object3D } from "three";

/** Подготовленные шаблоны (нейтраль/обычный) — быстрее, чем clone+mute с нуля. */
const templates = new Map<string, Object3D>();

export function getGlbModelTemplateKey(
  url: string,
  neutral: boolean
): string {
  return `${url}:${neutral ? "n" : "o"}`;
}

export function getGlbModelTemplate(key: string): Object3D | undefined {
  return templates.get(key);
}

export function setGlbModelTemplate(key: string, template: Object3D): void {
  templates.set(key, template);
}
