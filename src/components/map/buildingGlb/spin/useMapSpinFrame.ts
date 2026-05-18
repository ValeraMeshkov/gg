import { useSyncExternalStore } from "react";
import {
  MAP_SPIN_SHEET_PERIOD_SEC,
  SPIN_SHEET_FRAMES,
} from "./buildingSpinSheetConstants";

let frame = 0;
let rafId = 0;
let subscriberCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** Кадр спин-листа: `spinSpeed` 1 = эталон, 2 = в 2 раза быстрее. */
export function spinFrameIndexAt(
  nowMs: number = performance.now(),
  spinSpeed = 1
): number {
  const speed = Math.max(0.01, spinSpeed);
  const periodSec = MAP_SPIN_SHEET_PERIOD_SEC / speed;
  const phase = ((nowMs / 1000) % periodSec) / periodSec;
  return Math.min(
    SPIN_SHEET_FRAMES - 1,
    Math.floor(phase * SPIN_SHEET_FRAMES)
  );
}

/** Текущий кадр спин-листа без React (canvas-снаряды), скорость 1. */
export function mapSpinFrameIndexAt(nowMs: number = performance.now()): number {
  return spinFrameIndexAt(nowMs, 1);
}

function tick(now: number): void {
  const next = spinFrameIndexAt(now, 1);
  if (next !== frame) {
    frame = next;
    emit();
  }
  rafId = requestAnimationFrame(tick);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  subscriberCount += 1;
  if (subscriberCount === 1) {
    rafId = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(listener);
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
}

const noopSubscribe = () => () => {};

/** rAF-такт + дискретные кадры спрайт-листа (плавность = число запечённых кадров). */
export function useMapSpinFrame(enabled = true, spinSpeed = 1): number {
  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    () => (enabled ? spinFrameIndexAt(performance.now(), spinSpeed) : 0),
    () => 0
  );
}
