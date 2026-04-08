/**
 * アプリケーション共通定数
 */

// デバウンス・インターバル (ms)
export const CONTENT_CHANGE_DEBOUNCE_MS = 500;
export const TREE_REBUILD_DEBOUNCE_MS = 300;
export const IFRAME_HEIGHT_CHECK_MS = 1000;

// ドラッグ閾値 (px)
export const DRAG_THRESHOLD_PX = 5;
export const SHAPE_DRAG_THRESHOLD_PX = 3;

// ドロップゾーン境界 (要素の高さに対する比率)
export const DROP_ZONE_BEFORE = 0.25;
export const DROP_ZONE_AFTER = 0.75;

// ページサイズ (A4)
export const PAGE_SIZES = {
  'a4-portrait': { width: 794, height: 1123 },
  'a4-landscape': { width: 1123, height: 786.4 },
} as const;

export type PageWidth = keyof typeof PAGE_SIZES;
