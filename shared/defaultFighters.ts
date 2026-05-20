import type { FighterSkinId } from "./skinIds.js";

/** Бойцы с 3D spin-спрайтами в полёте (настройки и дефолты). */
export const WEAPON_FIGHTER_SKINS = [
  "dagger",
  "bomb",
  "poison",
  "potion",
] as const satisfies readonly FighterSkinId[];

export type WeaponFighterSkinId = (typeof WEAPON_FIGHTER_SKINS)[number];

/** Старые геометрические скины → оружие. */
export const LEGACY_FIGHTER_SKIN_MAP: Record<string, FighterSkinId> = {
  triangle: "dagger",
  heart: "bomb",
  bear: "poison",
  star: "potion",
  rocket: "dagger",
  fireball: "bomb",
};

export function defaultFighterForSlotIndex(slotIndex: number): FighterSkinId {
  return WEAPON_FIGHTER_SKINS[
    ((slotIndex % WEAPON_FIGHTER_SKINS.length) + WEAPON_FIGHTER_SKINS.length) %
      WEAPON_FIGHTER_SKINS.length
  ]!;
}

export function coerceWeaponFighterSkin(
  skin: unknown,
  fallback: FighterSkinId = "dagger"
): FighterSkinId {
  if (typeof skin === "string") {
    const legacy = LEGACY_FIGHTER_SKIN_MAP[skin];
    if (legacy) return legacy;
    if ((WEAPON_FIGHTER_SKINS as readonly string[]).includes(skin)) {
      return skin as FighterSkinId;
    }
  }
  return fallback;
}
