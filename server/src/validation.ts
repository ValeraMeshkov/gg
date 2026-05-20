import { z } from "zod";
import { DISPLAY_COLORS } from "@/shared/displayColors.js";
import { MAX_ROOM_PLAYERS, MIN_ROOM_PLAYERS } from "@/shared/playerSlots.js";
import { BUILDING_SKINS, FIGHTER_SKINS } from "./skins.js";

export const createUserBodySchema = z.object({
  userId: z.string().uuid().optional(),
});

export const profilePatchSchema = z
  .object({
    fighter: z.enum(FIGHTER_SKINS).optional(),
    building: z.enum(BUILDING_SKINS).optional(),
    displayName: z.string().trim().max(32).optional(),
    displayColor: z.enum(DISPLAY_COLORS).optional(),
    offlineBotCount: z.number().int().min(1).max(5).optional(),
    offlineBotDifficulty: z.number().int().min(0).max(100).optional(),
    randomMapOnStart: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.fighter !== undefined ||
      v.building !== undefined ||
      v.displayName !== undefined ||
      v.displayColor !== undefined ||
      v.offlineBotCount !== undefined ||
      v.offlineBotDifficulty !== undefined ||
      v.randomMapOnStart !== undefined,
    {
      message: "Нужно передать хотя бы одно поле профиля",
    }
  );

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

const roomUserId = z.string().min(8).max(128);

export const createRoomBodySchema = z.object({
  hostUserId: roomUserId,
  mapId: z.string().min(1).max(64).optional(),
  maxPlayers: z.number().int().min(MIN_ROOM_PLAYERS).max(MAX_ROOM_PLAYERS).optional(),
  randomMapOnStart: z.boolean().optional(),
});

export const patchRoomBodySchema = z
  .object({
    hostUserId: roomUserId,
    randomMapOnStart: z.boolean().optional(),
    mapId: z.string().min(1).max(64).optional(),
  })
  .refine(
    (v) => v.randomMapOnStart !== undefined || v.mapId !== undefined,
    { message: "Нужно передать randomMapOnStart или mapId" }
  );

export const readyRoomBodySchema = z.object({
  userId: roomUserId,
  ready: z.boolean(),
});

export const joinRoomBodySchema = z.object({
  userId: roomUserId,
});

export const startRoomBodySchema = z.object({
  hostUserId: roomUserId,
});

export const endRoundBodySchema = z.object({
  hostUserId: roomUserId,
  mapId: z.string().min(1).max(64).optional(),
  randomMapOnStart: z.boolean().optional(),
});

/** @deprecated используйте endRoundBodySchema */
export const restartRoomBodySchema = endRoundBodySchema;
