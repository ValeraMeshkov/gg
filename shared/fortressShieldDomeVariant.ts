/** Купол щита крепости — вращающиеся дуги. */
export const FORTRESS_SHIELD_DOME_VARIANT = "arc" as const;

export type FortressShieldDomeVariantId = typeof FORTRESS_SHIELD_DOME_VARIANT;

export const DEFAULT_FORTRESS_SHIELD_DOME_VARIANT: FortressShieldDomeVariantId =
  FORTRESS_SHIELD_DOME_VARIANT;

export function isFortressShieldDomeVariantId(
  value: string
): value is FortressShieldDomeVariantId {
  return value === FORTRESS_SHIELD_DOME_VARIANT;
}
