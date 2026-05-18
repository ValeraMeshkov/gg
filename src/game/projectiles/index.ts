export type {
  FlightPayload,
  MapProjectileDraw,
  ProjectileSim,
} from "./types";
export {
  ATTACK_ANIMATION_CATALOG,
  getAttackAnimationSpec,
  type AttackAnimationSpec,
} from "./attackAnimationCatalog";
export type { AttackAnimationId, WeaponId } from "@/shared/weaponStats";
export {
  WEAPONS,
  fighterSkinForWeapon,
  weaponIdForFighter,
  weaponStatsById,
  weaponStatsForFighter,
} from "@/shared/weaponStats";
export { buildFlightPayload } from "./flightPayload";
export {
  cancelAllPendingLaunchesForPlayer,
  cancelPendingLaunchesFromSource,
  compactFlights,
  pendingLaunchFromIndicesForPlayer,
  stripPendingTailTowardsOtherTargets,
} from "./flightQueue";
export { cancelProjectileSim } from "./cancelSim";
export {
  flightMsForMapDistance,
  projectileDrawPosition,
  projectileFlightAngle,
  projectileLandPosition,
  simToPath,
} from "./flightMath";
