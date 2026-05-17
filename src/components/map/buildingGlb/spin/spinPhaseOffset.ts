/** Стабильный сдвиг кадра 0…frames-1 по id точки (разный ритм у соседних пинов). */
export function spinPhaseOffsetFromKey(key: string, frames: number): number {
  if (frames <= 0) return 0;
  let h = 2_166_136_261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16_777_619);
  }
  return (h >>> 0) % frames;
}
