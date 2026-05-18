import type { WeaponId } from "@/shared/weaponStats";

/**
 * Каталог анимаций / визуала патрона (пока совпадает с id оружия).
 * Позже: URL спрайт-листов, GLB, параметры rAF.
 */
export type AttackAnimationSpec = {
  id: WeaponId;
  label: string;
};

export const ATTACK_ANIMATION_CATALOG: Record<WeaponId, AttackAnimationSpec> = {
  bullet: { id: "bullet", label: "Пуля" },
  bomb: { id: "bomb", label: "Бомба" },
  poison: { id: "poison", label: "Яд" },
  potion: { id: "potion", label: "Зелье" },
  dagger: { id: "dagger", label: "Дагер" },
};

export function getAttackAnimationSpec(id: WeaponId): AttackAnimationSpec {
  return ATTACK_ANIMATION_CATALOG[id];
}
