import { CELL } from "@/shared/constants";
import type { PlayerAppearancesMap } from "@/game/appearance";
import {
  isTerritoryIndexHidden,
  mapDotCenter,
  territoryCellPos,
  type CellPos,
} from "@/game/maps";
import type { GameMap } from "@/game/maps/types";
import type { MapCell } from "@/game/maps/types";
import { normalizeOfflineBotCount } from "@/shared/offlineBotCount";
import { offlineBotSkillNormalized } from "@/shared/offlineBotDifficulty";
import {
  projectileCountForLaunchBudget,
  reservedLaunchPower,
} from "@/shared/launchPower";
import { weaponStatsForFighter } from "@/shared/weaponStats";
import { MOCK_PLAYERS } from "./user";

/** Id активных ботов по настройке (1–5). */
export function offlineBotIdsForCount(botCount: number): string[] {
  const n = normalizeOfflineBotCount(botCount);
  return MOCK_PLAYERS.slice(1, 1 + n).map((u) => u.id);
}

type FlightLike = {
  readonly fromIndex: number;
  readonly sims: ReadonlyArray<{
    readonly power: number;
    readonly spawnApplied?: boolean;
    readonly landApplied?: boolean;
    readonly destroyed?: boolean;
  }>;
};

/** Узкий тип для `flights` из GameCanvas без циклических импортов. */
export type OfflineBotFlightsInput = ReadonlyArray<FlightLike>;

/** Текущее состояние клетки в партии — всегда из `cells`, не из `map.cells` сессии. */
function cellLive(cells: readonly MapCell[], index: number): MapCell | undefined {
  return cells[index];
}

function reservedPowerOnSource(
  fromI: number,
  flights: OfflineBotFlightsInput
): number {
  const sims: FlightLike["sims"][number][] = [];
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    sims.push(...f.sims);
  }
  return reservedLaunchPower(sims);
}

function launchPowerForBot(
  botId: string,
  appearances?: PlayerAppearancesMap
): number {
  const fighter = appearances?.[botId]?.fighter ?? "bomb";
  return weaponStatsForFighter(fighter).power;
}

/** Суммы юнитов по владельцу только по видимым территориям карты. */
function playerTotalsOnMap(
  map: GameMap,
  cells: readonly MapCell[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i < map.territories.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    const cell = cellLive(cells, i);
    if (!cell) continue;
    const id = cell.ownerId;
    if (!id) continue;
    m.set(id, (m.get(id) ?? 0) + (cell.units ?? 0));
  }
  return m;
}

function mapRefDistance(map: GameMap): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < map.territories.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    const c = mapDotCenter(map, territoryCellPos(i));
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }
  const d = Math.hypot(maxX - minX, maxY - minY);
  return d > 1e-6 ? d : 1;
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
  }
}

export type OfflineBotAttack = {
  botId: string;
  froms: readonly CellPos[];
  to: CellPos;
  maxUnits: number;
};

/** Опции хода оффлайн-бота (клиент). */
export type PickOfflineBotAttackOpts = {
  rng?: () => number;
  /** 0 — очень просто, 100 — сложно. */
  difficulty?: number;
  appearances?: PlayerAppearancesMap;
};

/**
 * Один ход бота: скоринг пар «источник → цель» с учётом лидера по сумме юнитов,
 * расстояния и примерной стоимости захвата; залп подбирается под цель.
 */
export function pickOfflineBotAttack(
  map: GameMap,
  cells: readonly MapCell[],
  botId: string,
  flights: OfflineBotFlightsInput,
  opts?: PickOfflineBotAttackOpts
): OfflineBotAttack | null {
  const rng = opts?.rng ?? Math.random;
  const skill = offlineBotSkillNormalized(opts?.difficulty ?? 50);
  const hard = skill >= 0.78;
  const elite = skill >= 0.99;
  const launchPower = launchPowerForBot(botId, opts?.appearances);
  type Src = { index: number; avail: number; launchPower: number };
  const sources: Src[] = [];
  for (let i = 0; i < map.territories.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    const cell = cellLive(cells, i);
    if (!cell || cell.ownerId !== botId) continue;
    const u = cell.units ?? 0;
    const reserved = reservedPowerOnSource(i, flights);
    const avail = u - reserved;
    if (avail >= launchPower * 4) sources.push({ index: i, avail, launchPower });
  }
  if (sources.length === 0) return null;

  const totals = playerTotalsOnMap(map, cells);
  const myScore = totals.get(botId) ?? 0;
  let leaderScore = 0;
  for (const [id, t] of totals) {
    if (id !== botId && t > leaderScore) leaderScore = t;
  }
  const behindLeader =
    leaderScore > 0 && myScore < leaderScore * 0.92;
  const aheadOfLeader =
    leaderScore > 0 && myScore > leaderScore * 1.08;
  /** Тяга к нейтралям при отставании; к вражеским слабым точкам при преимуществе. */
  const expandNeutralPull = elite
    ? behindLeader
      ? 1.28
      : 0.38
    : hard
      ? behindLeader
        ? 1.05 + rng() * 0.25
        : 0.32 + rng() * 0.15
      : behindLeader
        ? 0.88 + rng() * 0.32
        : 0.22 + rng() * 0.18;
  const attackEnemyPull = elite
    ? aheadOfLeader
      ? 1.22
      : 0.55
    : hard
      ? aheadOfLeader
        ? 0.95 + rng() * 0.28
        : 0.42 + rng() * 0.18
      : aheadOfLeader
        ? 0.72 + rng() * 0.38
        : 0.3 + rng() * 0.22;

  const reserveSlack = elite ? 0 : hard ? 1 : Math.round((1 - skill) * 2.2);
  const minAvail = elite
    ? behindLeader
      ? 4
      : 5
    : hard
      ? behindLeader
        ? 4 + reserveSlack
        : 5 + reserveSlack
      : behindLeader
        ? rng() < 0.5
          ? 4 + reserveSlack
          : 5 + reserveSlack
        : rng() < 0.38
          ? 5 + reserveSlack
          : 6 + reserveSlack;
  const strongSources = sources.filter((s) => s.avail >= Math.min(minAvail, 10));
  const srcPool = strongSources.length > 0 ? strongSources : sources;

  const targets: { index: number; isNeutral: boolean; tu: number }[] = [];
  let minEnemyU = Infinity;
  for (let i = 0; i < map.territories.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    const cell = cellLive(cells, i);
    if (!cell) continue;
    const o = cell.ownerId;
    if (o === botId) continue;
    if (o == null || o === "") {
      const tu = cell.units ?? CELL.neutralStart;
      targets.push({ index: i, isNeutral: true, tu });
    } else {
      const tu = cell.units ?? 0;
      targets.push({ index: i, isNeutral: false, tu });
      if (tu < minEnemyU) minEnemyU = tu;
    }
  }
  if (targets.length === 0) return null;

  const refD = mapRefDistance(map);

  type Cand = {
    fromI: number;
    toI: number;
    avail: number;
    launchPower: number;
    needApprox: number;
    score: number;
  };
  const cands: Cand[] = [];

  for (const src of srcPool) {
    const fromCenter = mapDotCenter(map, territoryCellPos(src.index));
    for (const t of targets) {
      const toCenter = mapDotCenter(map, territoryCellPos(t.index));
      const dist = Math.hypot(fromCenter.x - toCenter.x, fromCenter.y - toCenter.y);
      const normDist = Math.min(1, dist / refD);

      const needApprox = elite
        ? t.tu +
          2 +
          (t.isNeutral ? Math.floor(CELL.neutralStart * 0.05) : 0)
        : t.tu +
          2 +
          Math.floor(rng() * 5) +
          (t.isNeutral ? Math.floor(CELL.neutralStart * 0.05) : 0);

      let score = (1 - normDist) * 3.2;
      if (t.isNeutral) {
        score += 1.15 + expandNeutralPull;
        score += (CELL.neutralStart / (t.tu + 8)) * 0.35;
      } else {
        score += 0.95 + attackEnemyPull;
        const weak = 42 / (t.tu + 12);
        score += weak;
        if (t.tu <= minEnemyU + 2) score += 0.45;
      }
      const needPower = needApprox * src.launchPower;
      if (src.avail >= needPower) score += elite ? 0.85 : 0.5;
      else
        score -= (needPower - src.avail) * (elite ? 0.22 : 0.1 + 0.06 * skill);

      cands.push({
        fromI: src.index,
        toI: t.index,
        avail: src.avail,
        launchPower: src.launchPower,
        needApprox,
        score: elite
          ? score
          : score + rng() * (0.04 + (1 - skill) * (hard ? 0.16 : 0.24)),
      });
    }
  }

  cands.sort((a, b) => b.score - a.score);

  let pick: (typeof cands)[number];
  let maxUnits: number;

  if (elite) {
    pick = cands[0]!;
    const maxByBudget = projectileCountForLaunchBudget(
      pick.avail,
      pick.launchPower
    );
    maxUnits = Math.max(
      1,
      Math.min(
        maxByBudget,
        pick.needApprox + (aheadOfLeader ? 10 : 5)
      )
    );
  } else {
    const top = cands[0]!.score;
    const tierWide = hard ? 0.22 + (1 - skill) * 0.55 : 0.32 + (1 - skill) * 0.95;
    const tier = cands.filter((c) => c.score >= top - tierWide);
    shuffleInPlace(tier, rng);
    pick = tier[0]!;
    if (skill < 0.97 && rng() < (hard ? (1 - skill) * 0.22 : (1 - skill) * 0.38)) {
      pick = tier[Math.floor(rng() * tier.length)]!;
    }
    const maxByBudget = projectileCountForLaunchBudget(
      pick.avail,
      pick.launchPower
    );
    const extraBurst = Math.floor(rng() * (7 + skill * 14));
    const aheadBurst = aheadOfLeader ? Math.round(2 + skill * 8) : 0;
    maxUnits = Math.max(
      1,
      Math.min(
        maxByBudget,
        Math.floor(
          (pick.needApprox + extraBurst + aheadBurst) *
            (hard ? 0.74 + 0.28 * skill : 0.7 + 0.3 * skill)
        )
      )
    );
  }

  return {
    botId,
    froms: [territoryCellPos(pick.fromI)],
    to: territoryCellPos(pick.toI),
    maxUnits,
  };
}
