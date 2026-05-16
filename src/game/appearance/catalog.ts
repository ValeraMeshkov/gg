import type { BuildingSkinId, FighterSkinId } from "./types";

export type SkinOption<T extends string> = {
  id: T;
  label: string;
};

export const FIGHTER_SKIN_OPTIONS: readonly SkinOption<FighterSkinId>[] = [
  { id: "triangle", label: "Треугольник" },
  { id: "heart", label: "Сердце" },
  { id: "bear", label: "Мишка" },
  { id: "star", label: "Звезда" },
  { id: "diamond", label: "Ромб" },
  { id: "ghost", label: "Призрак" },
  { id: "rocket", label: "Ракета" },
  { id: "clover", label: "Клевер" },
  { id: "bomb", label: "Бомба" },
  { id: "ufo", label: "НЛО" },
  { id: "shield", label: "Щит" },
];

export const BUILDING_SKIN_OPTIONS: readonly SkinOption<BuildingSkinId>[] = [
  { id: "circle", label: "Кружок" },
  { id: "fortress", label: "Крепость" },
  { id: "flower", label: "Цветок" },
  { id: "crown", label: "Корона" },
  { id: "barn", label: "Амбар" },
  { id: "temple", label: "Храм" },
  { id: "lighthouse", label: "Маяк" },
  { id: "house", label: "Домик" },
  { id: "castle", label: "Замок" },
  { id: "skull", label: "Череп" },
];
