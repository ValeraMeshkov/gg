import { SPIN_SPEED } from "@/components/map/buildingGlb/constants/isoConstants";

/**
 * Кадров в спрайт-листе. Плавность ≈ FRAMES / PERIOD_SEC (кадров/с).
 * 256 при ~11 с ≈ 22 fps; 128 было ~11 fps и заметно «ступенчато».
 */
export const SPIN_SHEET_FRAMES = 256;

/**
 * Пикселей на кадр в PNG. На карте показываем меньше (см. MAP_SPIN_SPRITE_DISPLAY_SCALE) —
 * браузер даунскейлит, картинка чётче при том же размере на точке.
 */
export const SPIN_SHEET_FRAME_PX = 160;

/** Рендер в N× больше, затем даунскейл в SPIN_SHEET_FRAME_PX. */
export const SPIN_SHEET_BAKE_SUPERSAMPLE = 2;

/**
 * Запас ortho при bake (iso). Чуть больше 1.2 — вытянутые модели (акула) не режутся;
 * постобработка заполняет кадр по непрозрачным пикселям.
 */
export const SPIN_SHEET_BAKE_FRUSTUM_MARGIN = 1.5;

/** Отступ от краёв кадра после подгонки по непрозрачным пикселям (px). */
export const SPIN_SHEET_BAKE_FRAME_PAD_Y = 6;

/** Один полный оборот на карте — как SPIN_SPEED в 3D-превью (~11 с). */
export const MAP_SPIN_SHEET_PERIOD_SEC = (Math.PI * 2) / SPIN_SPEED;
