/** Последовательные обновления клеток в комнате (без гонок setTimeout). */
const chains = new Map<string, Promise<void>>();

export function enqueueRoomCellUpdate(
  roomCode: string,
  task: () => void | Promise<void>
): void {
  const key = roomCode.toUpperCase();
  const prev = chains.get(key) ?? Promise.resolve();
  const next = prev
    .then(() => task())
    .catch((err) => {
      console.error(`[room ${key}] cell update failed:`, err);
    });
  chains.set(key, next);
}

export function clearCellUpdateQueue(roomCode: string): void {
  chains.delete(roomCode.toUpperCase());
}
