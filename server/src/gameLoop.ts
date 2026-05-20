import { CELL } from "@/shared/constants.js";
import { bumpCellsTowardsCap } from "@/shared/cellGrowth.js";
import {
  bumpFortressShields,
  FORTRESS_SHIELD,
} from "@/shared/fortressShield.js";
import {
  SKELETON_SPAWN_INTERVAL_MS,
  ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS,
} from "@/shared/buildingMechanics.js";
import {
  HEART_LIFE,
  tickHeartLifeBalanceForOwners,
} from "@/shared/heartLife.js";
import { tickSkeletonSpawnsForOwners } from "@/shared/skeletonSpawn.js";
import { enqueueRoomCellUpdate } from "./cellUpdateQueue.js";
import { cloneCells, getGameForRoom, listActiveGames, updateRoomCells } from "./gameState.js";
import { buildingForSlot } from "./roomBuilding.js";
import { sourcesWithPendingLaunch } from "./roomAttack.js";
import { getRoom } from "./rooms.js";
import { broadcastCells } from "./wsHub.js";

export function startGameLoop(): void {
  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        const room = getRoom(code);
        if (!g || !room) return;
        const freeze = sourcesWithPendingLaunch(code);
        const buildingForOwner = (ownerId: string | undefined) =>
          buildingForSlot(room, ownerId);
        const next = bumpCellsTowardsCap(g.cells, new Set(), freeze, Date.now(), {
          buildingForOwner,
          skipOwnerBuilding: "pixellabsZombie",
        });
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, CELL.growthMs);

  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        const room = getRoom(code);
        if (!g || !room) return;
        const freeze = sourcesWithPendingLaunch(code);
        const next = bumpCellsTowardsCap(g.cells, new Set(), freeze, Date.now(), {
          buildingForOwner: (ownerId) => buildingForSlot(room, ownerId),
          onlyOwnerBuilding: "pixellabsZombie",
        });
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS);

  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        const room = getRoom(code);
        if (!g || !room) return;
        const next = bumpFortressShields(g.cells, (ownerId) =>
          buildingForSlot(room, ownerId)
        );
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, FORTRESS_SHIELD.regenMs);

  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        const room = getRoom(code);
        if (!g || !room) return;
        const playable = g.cells.map((_, i) => i);
        const ownerIds = room.players
          .map((p) => p.slotId)
          .filter((id): id is string => Boolean(id));
        const next = tickSkeletonSpawnsForOwners(
          g.cells,
          playable,
          ownerIds,
          (ownerId) => buildingForSlot(room, ownerId)
        );
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, SKELETON_SPAWN_INTERVAL_MS);

  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        const room = getRoom(code);
        if (!g || !room) return;
        const playable = g.cells.map((_, i) => i);
        const ownerIds = room.players
          .map((p) => p.slotId)
          .filter((id): id is string => Boolean(id));
        const next = tickHeartLifeBalanceForOwners(
          g.cells,
          playable,
          ownerIds,
          (ownerId) => buildingForSlot(room, ownerId)
        );
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, HEART_LIFE.balanceIntervalMs);
}
