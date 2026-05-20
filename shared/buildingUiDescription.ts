import { CELL } from "./constants.js";
import {
  buildingMechanics,
  ownedCapForBuilding,
  passiveGrowthMsForBuilding,
  playerStartForBuilding,
  skeletonSpawnConfig,
  extraStartTerritoriesForBuilding,
} from "./buildingMechanics.js";
import { FORTRESS_SHIELD, isFortressBuilding } from "./fortressShield.js";
import type { BuildingSkinId } from "./skinIds.js";

export type BuildingUiDescription = {
  summary: string;
  bullets: string[];
};

/** Щит крепости: см. `FORTRESS_SHIELD` и `bumpFortressShields`. */
function fortressShieldUiBullet(): string {
  const s = FORTRESS_SHIELD;
  const regenSec = Math.round(s.regenMs / 1000);
  const pauseSec = Math.round(s.hitPauseMs / 1000);
  return (
    `Щит-броня крепости вокруг ваших точек: максимум ${s.max} единиц; +1 каждые ${regenSec} с. ` +
    `После попадания по такой точке восстановление щита приостанавливается на ${pauseSec} с.`
  );
}

function standardEconomyBullets(skin: BuildingSkinId): string[] {
  const lines = [
    `Старт на своей клетке: ${CELL.playerStart} HP`,
    `Потолок силы на своих клетках: ${CELL.ownedCap} HP`,
    `Пассивный рост: +1 HP каждые ${CELL.growthMs} мс`,
  ];
  if (!isFortressBuilding(skin)) return lines;
  return [
    lines[0]!,
    lines[1]!,
    fortressShieldUiBullet(),
    lines[2]!,
  ];
}

/** Краткая выжимка без чисел — для зданий с особыми правилами. */
const FLAVOR_SUMMARY: Record<BuildingSkinId, string> = {
  cube:
    "Устаревший служебный скин; в бою подставляется обычное здание из набора.",
  pixellabs:
    "Высокая башня — универсальное здание без особых бонусов, стандартная экономика.",
  pixellabs3822:
    "Альтернативная башня; те же базовые правила, другой вид на карте.",
  pixellabsBomb:
    "Здание в форме бомбы: визуальный акцент, игровые правила по умолчанию.",
  pixellabsUndead:
    "Статуя нежити: жуткий силуэт при обычной механике территории.",
  pixellabsZombie:
    "Заражённый зомби: быстрый набор силы, низкий потолок HP и крупные бонусы за захваты.",
  pixellabsGrimReaper3011:
    "Жнец: устрашающая модель без уникальных правил — как у базовых зданий.",
  pixellabsSkeletonArcher4240:
    "Скелет-лучник: призывает юнитов на нейтральные клетки и стартует с усиленным присутствием на карте.",
  blendertimerHeart23:
    "Живое сердце: выше старт и потолок HP; точки соединяются «артериями» и делят здоровье по цепочке.",
  freedomCastle:
    "Каменный замок — классика, стандартные параметры роста и предела силы.",
  freedomCastle4441:
    "Вариант замка с другим силуэтом; игровые правила как у обычного базового здания.",
};

function describeZombie(skin: BuildingSkinId): BuildingUiDescription {
  const cap = ownedCapForBuilding(skin);
  const bonus = buildingMechanics(skin).captureBonus!;
  const extra = extraStartTerritoriesForBuilding(skin);
  return {
    summary: FLAVOR_SUMMARY.pixellabsZombie,
    bullets: [
      extra > 0 ? `+${extra} нейтральная клетка HP со старта партии` : "",
      "Пассивный рост: +1 HP каждые 500 мс (отдельный быстрый тик, до 2 HP/с)",
      `Низкий потолок на своих клетках: ${cap} HP — «стеклянная пушка», но быстро качается`,
      `После захвата нейтрали или чужой клетки: сила на точке — ${bonus.neutral} HP (до потолка здания)`,
    ].filter(Boolean),
  };
}

function describeSkeletonArcher(skin: BuildingSkinId): BuildingUiDescription {
  const cfg = skeletonSpawnConfig(skin);
  const growthMs = passiveGrowthMsForBuilding(skin);
  if (!cfg) {
    return {
      summary: FLAVOR_SUMMARY.pixellabsSkeletonArcher4240,
      bullets: standardEconomyBullets(skin),
    };
  }
  const bullets: string[] = [];
  if (cfg.startSecondMinion) {
    bullets.push(
      "Сразу после старта — ещё один юнит на случайной свободной нейтрали"
    );
  }
  bullets.push(
    `Каждые ${Math.round(cfg.intervalMs / 1000)} с пытается поставить +${cfg.spawnUnits} HP на свободную нейтраль (если есть клетки)`
  );
  bullets.push(
    growthMs > CELL.growthMs
      ? `Пассивный рост на своих клетках: +1 HP каждые ${growthMs} мс (медленнее базовых ${CELL.growthMs} мс)`
      : `Пассивный рост: +1 HP каждые ${growthMs} мс`
  );
  return {
    summary: FLAVOR_SUMMARY.pixellabsSkeletonArcher4240,
    bullets,
  };
}

function describeHeart(skin: BuildingSkinId): BuildingUiDescription {
  const start = playerStartForBuilding(skin);
  const cap = ownedCapForBuilding(skin);
  return {
    summary: FLAVOR_SUMMARY.blendertimerHeart23,
    bullets: [
      `Повышенный старт на своей клетке: ${start} HP (база — ${CELL.playerStart})`,
      `Повышенный потолок на своих клетках: ${cap} HP (база — ${CELL.ownedCap})`,
      "Точки вашего цвета соединяются цепочкой; HP выравнивается по линиям сети",
    ],
  };
}

export function getBuildingUiDescription(
  skin: BuildingSkinId
): BuildingUiDescription {
  if (skin === "pixellabsZombie") return describeZombie(skin);
  if (skin === "pixellabsSkeletonArcher4240")
    return describeSkeletonArcher(skin);
  if (skin === "blendertimerHeart23") return describeHeart(skin);

  return {
    summary: FLAVOR_SUMMARY[skin],
    bullets: standardEconomyBullets(skin),
  };
}
