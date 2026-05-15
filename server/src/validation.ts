import { z } from "zod";
import { BUILDING_SKINS, FIGHTER_SKINS } from "./skins.js";

export const createUserBodySchema = z.object({
  userId: z.string().uuid().optional(),
});

export const profilePatchSchema = z
  .object({
    fighter: z.enum(FIGHTER_SKINS).optional(),
    building: z.enum(BUILDING_SKINS).optional(),
  })
  .refine((v) => v.fighter !== undefined || v.building !== undefined, {
    message: "Нужно передать fighter и/или building",
  });

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

const roomUserId = z.string().min(8).max(128);

export const createRoomBodySchema = z.object({
  hostUserId: roomUserId,
  mapId: z.string().min(1).max(64).optional(),
});

export const joinRoomBodySchema = z.object({
  userId: roomUserId,
});

export const startRoomBodySchema = z.object({
  hostUserId: roomUserId,
});

export const restartRoomBodySchema = z.object({
  hostUserId: roomUserId,
  mapId: z.string().min(1).max(64).optional(),
});
