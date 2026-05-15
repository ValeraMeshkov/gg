import { CELL } from "../../shared/constants.js";
import { bumpCellsTowardsCap } from "../../shared/cellGrowth.js";
import { enqueueRoomCellUpdate } from "./cellUpdateQueue.js";
import { cloneCells, listActiveGames, updateRoomCells } from "./gameState.js";
import { sourcesWithPendingLaunch } from "./roomAttack.js";
import { broadcastCells } from "./wsHub.js";

export function startGameLoop(): void {
  setInterval(() => {
    for (const { code, state } of listActiveGames()) {
      const freeze = sourcesWithPendingLaunch(code);
      enqueueRoomCellUpdate(code, () => {
        const next = bumpCellsTowardsCap(state.cells, new Set(), freeze);
        if (!next) return;
        const cloned = cloneCells(next);
        state.cells = cloned;
        updateRoomCells(code, cloned);
        broadcastCells(code, cloned);
      });
    }
  }, CELL.growthMs);
}
