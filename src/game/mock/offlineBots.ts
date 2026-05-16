import { CELL } from "../../../shared/constants";
import { OFFLINE_MOCK_BOT_APPEARANCES } from "../../../shared/offlineMock.js";
import type { PlayerAppearance } from "../appearance";
import {
  isTerritoryIndexHidden,
  mapDotCenter,
  territoryCellPos,
  type CellPos,
} from "../maps";
import type { GameMap } from "../maps/types";
import type { MapCell } from "../maps/types";
import { normalizeOfflineBotCount } from "../../../shared/offlineBotCount.js";
import { MOCK_PLAYERS } from "./user";

/** Id активных ботов по настройке (1–5). */
export function offlineBotIdsForCount(botCount: number): string[] {
  const n = normalizeOfflineBotCount(botCount);
  return MOCK_PLAYERS.slice(1, 1 + n).map((u) => u.id);
}

/** @deprecated Используйте `offlineBotIdsForCount(2)`. */
export const OFFLINE_BOT_IDS: readonly string[] = offlineBotIdsForCount(2);

/** Скины в `shared/offlineMock.ts` — привязка к слотам mock-user-2 … mock-user-6. */
export const OFFLINE_BOT_APPEARANCES: Record<string, PlayerAppearance> =
  Object.fromEntries(
    OFFLINE_MOCK_BOT_APPEARANCES.map((appearance, i) => {
      const user = MOCK_PLAYERS[i + 1]!;
      return [user.id, { ...appearance }] as const;
    })
  );

type FlightLike = {
  readonly fromIndex: number;
  readonly sims: ReadonlyArray<{
    readonly spawnApplied?: boolean;
    readonly landApplied?: boolean;
  }>;
};

/** Узкий тип для `flights` из GameCanvas без циклических импортов. */
export type OfflineBotFlightsInput = ReadonlyArray<FlightLike>;

/** Текущее состояние клетки в партии — всегда из `cells`, не из `map.cells` сессии. */
function cellLive(cells: readonly MapCell[], index: number): MapCell | undefined {
  return cells[index];
}

function countUnspawnedFromSourceCell(
  fromI: number,
  flights: OfflineBotFlightsInput
): number {
  let n = 0;
  for (const f of flights) {
    if (f.fromIndex !== fromI) continue;
    for (const s of f.sims) {
      if (!s.spawnApplied && !s.landApplied) n += 1;
    }
  }
  return n;
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
  const skill = Math.min(100, Math.max(0, opts?.difficulty ?? 50)) / 100;
  const elite = skill >= 0.99;
  type Src = { index: number; avail: number };
  const sources: Src[] = [];
  for (let i = 0; i < map.territories.length; i++) {
    if (isTerritoryIndexHidden(map, i)) continue;
    const cell = cellLive(cells, i);
    if (!cell || cell.ownerId !== botId) continue;
    const u = cell.units ?? 0;
    const reserved = countUnspawnedFromSourceCell(i, flights);
    const avail = u - reserved;
    if (avail >= 4) sources.push({ index: i, avail });
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
      ? 1.2
      : 0.35
    : behindLeader
      ? 0.85 + rng() * 0.35
      : 0.25 + rng() * 0.2;
  const attackEnemyPull = elite
    ? aheadOfLeader
      ? 1.15
      : 0.5
    : aheadOfLeader
      ? 0.75 + rng() * 0.4
      : 0.35 + rng() * 0.25;

  const reserveSlack = elite ? 0 : Math.round((1 - skill) * 2.5);
  const minAvail = elite
    ? behindLeader
      ? 4
      : 5
    : behindLeader
      ? rng() < 0.55
        ? 4 + reserveSlack
        : 5 + reserveSlack
      : rng() < 0.4
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
      if (src.avail >= needApprox) score += elite ? 0.85 : 0.5;
      else score -= (needApprox - src.avail) * (elite ? 0.22 : 0.1 + 0.06 * skill);

      cands.push({
        fromI: src.index,
        toI: t.index,
        avail: src.avail,
        needApprox,
        score: elite ? score : score + rng() * (0.05 + (1 - skill) * 0.26),
      });
    }
  }

  cands.sort((a, b) => b.score - a.score);

  let pick: (typeof cands)[number];
  let maxUnits: number;

  if (elite) {
    pick = cands[0]!;
    maxUnits = Math.max(
      6,
      Math.min(pick.avail, pick.needApprox + (aheadOfLeader ? 10 : 5))
    );
  } else {
    const top = cands[0]!.score;
    const tierWide = 0.36 + (1 - skill) * 1.08;
    const tier = cands.filter((c) => c.score >= top - tierWide);
    shuffleInPlace(tier, rng);
    pick = tier[0]!;
    if (skill < 0.97 && rng() < (1 - skill) * 0.4) {
      pick = tier[Math.floor(rng() * tier.length)]!;
    }
    const extraBurst = Math.floor(rng() * (6 + skill * 12));
    const aheadBurst = aheadOfLeader ? Math.round(2 + skill * 7) : 0;
    maxUnits = Math.max(
      6,
      Math.min(
        pick.avail,
        Math.floor(
          (pick.needApprox + extraBurst + aheadBurst) * (0.68 + 0.32 * skill)
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

/** Очередность ходов ботов на один тик (случайная). */
export function shuffledOfflineBotIds(
  rng: () => number = Math.random
): string[] {
  const ids = [...OFFLINE_BOT_IDS];
  shuffleInPlace(ids, rng);
  return ids;
}
