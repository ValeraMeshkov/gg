/** Ключи localStorage / sessionStorage — единый реестр. */
export const STORAGE_KEYS = {
  displayName: "game-display-name-v1",
  mySkins: "game-my-skins-v1",
  playerAppearance: "game-player-appearance-v1",
  offlineBotCount: "game-offline-bot-count-v1",
  offlineBotDifficulty: "game-offline-bot-difficulty-v1",
  randomMapOnStart: "game-random-map-on-start-v1",
  userId: "game-user-id-v1",
  glbBuildingVisibility: "glb-building-visibility-v1",
  mapDotEditorMap: "map-dot-editor-map",
} as const;

export const GLB_BUILDING_VISIBILITY_CHANGE_EVENT =
  "glb-building-visibility-change";
