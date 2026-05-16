import { CELL } from "../../shared/constants.js";
import { bumpCellsTowardsCap } from "../../shared/cellGrowth.js";
import { enqueueRoomCellUpdate } from "./cellUpdateQueue.js";
import { cloneCells, getGameForRoom, listActiveGames, updateRoomCells } from "./gameState.js";
import { sourcesWithPendingLaunch } from "./roomAttack.js";
import { broadcastCells } from "./wsHub.js";

export function startGameLoop(): void {
  setInterval(() => {
    for (const { code } of listActiveGames()) {
      enqueueRoomCellUpdate(code, () => {
        const g = getGameForRoom(code);
        if (!g) return;
        const freeze = sourcesWithPendingLaunch(code);
        const next = bumpCellsTowardsCap(g.cells, new Set(), freeze);
        if (!next) return;
        const cloned = cloneCells(next);
        g.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, CELL.growthMs);
}
