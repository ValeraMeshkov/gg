import { z } from "zod";
import { MAX_ROOM_PLAYERS, MIN_ROOM_PLAYERS } from "../../shared/playerSlots.js";
import { BUILDING_SKINS, FIGHTER_SKINS } from "./skins.js";

export const createUserBodySchema = z.object({
  userId: z.string().uuid().optional(),
});

export const profilePatchSchema = z
  .object({
    fighter: z.enum(FIGHTER_SKINS).optional(),
    building: z.enum(BUILDING_SKINS).optional(),
    displayName: z.string().trim().max(32).optional(),
  })
  .refine(
    (v) =>
      v.fighter !== undefined ||
      v.building !== undefined ||
      v.displayName !== undefined,
    {
      message: "Нужно передать fighter, building и/или displayName",
    }
  );

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

const roomUserId = z.string().min(8).max(128);

export const createRoomBodySchema = z.object({
  hostUserId: roomUserId,
  mapId: z.string().min(1).max(64).optional(),
  maxPlayers: z.number().int().min(MIN_ROOM_PLAYERS).max(MAX_ROOM_PLAYERS).optional(),
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
