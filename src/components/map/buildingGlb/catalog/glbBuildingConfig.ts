import type { GlbBuildingSkinId } from "./buildingGlbCatalog";

/**
 * Id зданий, скрытых в игре и в настройках (редактор → «Записать в код»).
 * Имена как в каталоге: freedomCastle, pixellabs, …
 */
export const GLB_HIDDEN_BUILDING_SKINS = [] as const satisfies readonly GlbBuildingSkinId[];
