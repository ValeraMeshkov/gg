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

function frameIndexAtTime(nowMs: number): number {
  const phase =
    ((nowMs / 1000) % MAP_SPIN_SHEET_PERIOD_SEC) / MAP_SPIN_SHEET_PERIOD_SEC;
  return Math.min(
    SPIN_SHEET_FRAMES - 1,
    Math.floor(phase * SPIN_SHEET_FRAMES)
  );
}

/** Текущий кадр спин-листа без React (canvas-снаряды). */
export function mapSpinFrameIndexAt(nowMs: number = performance.now()): number {
  return frameIndexAtTime(nowMs);
}

function tick(now: number): void {
  const next = frameIndexAtTime(now);
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

function getSnapshot(): number {
  return frame;
}

/** rAF-такт + дискретные кадры спрайт-листа (плавность = число запечённых кадров). */
export function useMapSpinFrame(enabled = true): number {
  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    () => (enabled ? getSnapshot() : 0),
    () => 0
  );
}
