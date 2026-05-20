import { DEFAULT_BUILDING_SKIN, type BuildingSkinId } from "@/shared/skinIds.js";
import { getProfile } from "./db.js";
import { getRoom, type Room } from "./rooms.js";

/** Скин здания игрока в комнате по id слота на карте. */
export function buildingForSlot(
  room: Room,
  slotId: string | undefined
): BuildingSkinId | undefined {
  if (!slotId) return undefined;
  const player = room.players.find((p) => p.slotId === slotId);
  if (!player) return undefined;
  const profile = getProfile(player.userId);
  return profile?.building ?? DEFAULT_BUILDING_SKIN;
}

export function buildingForSlotInRoom(
  roomCode: string,
  slotId: string | undefined
): BuildingSkinId | undefined {
  const room = getRoom(roomCode);
  if (!room) return undefined;
  return buildingForSlot(room, slotId);
}
