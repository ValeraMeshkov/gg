import { useEffect, type MutableRefObject } from "react";
import { bumpCellsTowardsCap } from "@/shared/cellGrowth";
import { FORTRESS_SHIELD, bumpFortressShields } from "@/shared/fortressShield";
import {
  SKELETON_SPAWN_INTERVAL_MS,
  ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS,
  skeletonSpawnConfig,
} from "@/shared/buildingMechanics";
import {
  HEART_LIFE,
  tickHeartLifeBalanceForOwners,
} from "@/shared/heartLife";
import {
  sourceIndicesWithUnspawnedSims,
  type FlightWithSource,
} from "@/shared/launchPower";
import { trySpawnOneSkeleton } from "@/shared/skeletonSpawn";
import { appearanceForPlayer, type PlayerAppearancesMap } from "@/game/appearance";
import type { BuildingSkinId } from "@/shared/skinIds";
import { CELL } from "@/game/constants";
import type { MapCell } from "@/game/maps/types";

/**
 * Оффлайн-пассивный рост клеток (+1 к капу). В комнате рост на сервере.
 */
type SkeletonSpawnOpts = {
  ownerId: string;
  playableIndices: () => readonly number[];
  buildingForOwner: (ownerId: string) => BuildingSkinId | undefined;
};

export function useOfflineCellGrowth(
  enabled: boolean,
  cellsRef: MutableRefObject<MapCell[]>,
  flightsRef: MutableRefObject<readonly FlightWithSource[]>,
  playerAppearancesRef: MutableRefObject<PlayerAppearancesMap>,
  onCellsChanged: () => void,
  skeletonSpawn?: SkeletonSpawnOpts,
  playableIndices?: () => readonly number[]
): void {
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const pendingLaunch = sourceIndicesWithUnspawnedSims(
        flightsRef.current
      );
      const appearances = playerAppearancesRef.current;
      const buildingForOwner = (ownerId: string | undefined) =>
        ownerId
          ? appearanceForPlayer(appearances, ownerId).building
          : undefined;
      const bumped = bumpCellsTowardsCap(
        cellsRef.current,
        new Set(),
        pendingLaunch,
        Date.now(),
        {
          buildingForOwner,
          skipOwnerBuilding: "pixellabsZombie",
        }
      );
      if (bumped) {
        cellsRef.current = bumped;
        onCellsChanged();
      }
    }, CELL.growthMs);
    return () => window.clearInterval(id);
  }, [enabled, cellsRef, flightsRef, playerAppearancesRef, onCellsChanged]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const pendingLaunch = sourceIndicesWithUnspawnedSims(
        flightsRef.current
      );
      const appearances = playerAppearancesRef.current;
      const bumped = bumpCellsTowardsCap(
        cellsRef.current,
        new Set(),
        pendingLaunch,
        Date.now(),
        {
          buildingForOwner: (ownerId) =>
            ownerId
              ? appearanceForPlayer(appearances, ownerId).building
              : undefined,
          onlyOwnerBuilding: "pixellabsZombie",
        }
      );
      if (bumped) {
        cellsRef.current = bumped;
        onCellsChanged();
      }
    }, ZOMBIE_PASSIVE_GROWTH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, cellsRef, flightsRef, playerAppearancesRef, onCellsChanged]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const appearances = playerAppearancesRef.current;
      const shielded = bumpFortressShields(cellsRef.current, (ownerId) =>
        appearanceForPlayer(appearances, ownerId).building
      );
      if (shielded) {
        cellsRef.current = shielded;
        onCellsChanged();
      }
    }, FORTRESS_SHIELD.regenMs);
    return () => window.clearInterval(id);
  }, [enabled, cellsRef, playerAppearancesRef, onCellsChanged]);

  useEffect(() => {
    if (!enabled || !skeletonSpawn) return;
    const id = window.setInterval(() => {
      const { ownerId, playableIndices, buildingForOwner } = skeletonSpawn;
      const building = buildingForOwner(ownerId);
      if (!skeletonSpawnConfig(building)) return;
      const spawned = trySpawnOneSkeleton(
        cellsRef.current,
        playableIndices(),
        ownerId,
        building
      );
      if (spawned) {
        cellsRef.current = spawned;
        onCellsChanged();
      }
    }, SKELETON_SPAWN_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, cellsRef, onCellsChanged, skeletonSpawn]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const appearances = playerAppearancesRef.current;
      const ownerIds = new Set<string>();
      for (const cell of cellsRef.current) {
        if (cell.ownerId) ownerIds.add(cell.ownerId);
      }
      const playable =
        playableIndices?.() ??
        cellsRef.current.map((_, i) => i);
      const balanced = tickHeartLifeBalanceForOwners(
        cellsRef.current,
        playable,
        [...ownerIds],
        (ownerId) =>
          appearanceForPlayer(appearances, ownerId).building
      );
      if (balanced) {
        cellsRef.current = balanced;
        onCellsChanged();
      }
    }, HEART_LIFE.balanceIntervalMs);
    return () => window.clearInterval(id);
  }, [
    enabled,
    cellsRef,
    playerAppearancesRef,
    onCellsChanged,
    playableIndices,
  ]);
}
