/** N разных индексов из пула (детерминировано при переданном rng). */
export function pickDistinctIndices(
  playable: readonly number[],
  count: number,
  rng: () => number = Math.random
): number[] {
  if (playable.length < count) {
    throw new Error(
      `Для ${count} стартовых точек нужно минимум ${count} играбельных клеток (сейчас ${playable.length})`
    );
  }
  const picked = new Set<number>();
  while (picked.size < count) {
    picked.add(playable[Math.floor(rng() * playable.length)]!);
  }
  return [...picked];
}
