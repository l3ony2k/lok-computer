/**
 * Desktop icon geometry. Icons flow in columns from the top-right corner (the
 * CSS grid mode); with snapping off they sit at stored coordinates, and icons
 * without one take the slot the flow would have given them, so switching modes
 * never moves anything. Pure helpers so the layout can be tested.
 */
import type { DesktopIconSize } from '@/hooks/useUserSettings';

export interface IconCell {
  /** Button footprint. */
  width: number;
  height: number;
  /** The framed image box and the glyph drawn inside it. */
  image: number;
  glyph: number;
}

export const ICON_CELLS: Record<DesktopIconSize, IconCell> = {
  s: { width: 80, height: 64, image: 32, glyph: 24 },
  m: { width: 96, height: 76, image: 42, glyph: 32 },
  l: { width: 120, height: 100, image: 60, glyph: 48 },
};

/** Gap between cells, matching the CSS flow (`gap-3`); the layer itself carries the desktop inset. */
export const ICON_GAP = 12;

export interface IconPoint {
  x: number;
  y: number;
}

export interface IconArea {
  width: number;
  height: number;
}

export const DESKTOP_ICON_POSITIONS_KEY = 'desktop:icon-positions';

/**
 * Where the flow puts each of `count` icons inside the layer: columns fill top
 * to bottom, starting at the right edge, as many rows as fit.
 */
export const layoutIconSlots = (count: number, area: IconArea, cell: IconCell): IconPoint[] => {
  const rows = Math.max(1, Math.floor((area.height + ICON_GAP) / (cell.height + ICON_GAP)));
  return Array.from({ length: count }, (_, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    return {
      x: area.width - (column + 1) * cell.width - column * ICON_GAP,
      y: row * (cell.height + ICON_GAP),
    };
  });
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Keeps an icon fully inside the desktop; an unmeasured area (0×0) leaves the point alone. */
export const clampIconPosition = (point: IconPoint, area: IconArea, cell: IconCell): IconPoint => {
  if (area.width <= 0 || area.height <= 0) return { x: Math.round(point.x), y: Math.round(point.y) };
  return {
    x: clamp(Math.round(point.x), 0, Math.max(0, area.width - cell.width)),
    y: clamp(Math.round(point.y), 0, Math.max(0, area.height - cell.height)),
  };
};

/** Stored coordinates for apps that still exist, with finite numbers only. */
export const normalizeIconPositions = (stored: unknown, catalog: string[]): Record<string, IconPoint> => {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
  const known = new Set(catalog);
  const positions: Record<string, IconPoint> = {};
  for (const [type, value] of Object.entries(stored as Record<string, unknown>)) {
    if (!known.has(type) || !value || typeof value !== 'object') continue;
    const { x, y } = value as Partial<IconPoint>;
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      positions[type] = { x, y };
    }
  }
  return positions;
};
