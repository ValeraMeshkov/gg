import { z } from "zod";
import { BUILDING_SKINS, FIGHTER_SKINS } from "./skins.js";

const appearanceSchema = z.object({
  fighter: z.enum(FIGHTER_SKINS),
  building: z.enum(BUILDING_SKINS),
});

export const profilePatchSchema = z
  .object({
    appearances: z.record(z.string().min(1).max(64), appearanceSchema).optional(),
    preferences: z
      .object({
        lastMapId: z.string().min(1).max(64).optional(),
        controlledPlayerId: z.string().min(1).max(64).optional(),
      })
      .optional(),
  })
  .refine((v) => v.appearances !== undefined || v.preferences !== undefined, {
    message: "Нужно передать appearances и/или preferences",
  });

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
