/**
 * Desktop icon order: a list of application types, persisted under
 * DESKTOP_ICON_ORDER_KEY. Pure helpers live here so they can be tested and
 * so Config can reset the layout without reaching into the desktop.
 */

export const DESKTOP_ICON_ORDER_KEY = 'desktop:icon-order';

/** Dispatched on window when the layout should go back to the catalog order. */
export const DESKTOP_ICON_ORDER_RESET_EVENT = 'lok:desktop-icon-order-reset';

/**
 * Keep the stored order for apps that still exist and append new apps in
 * catalog order, so a saved layout survives apps being added or removed.
 */
export const normalizeIconOrder = (stored: unknown, catalog: string[]): string[] => {
  const known = new Set(catalog);
  const kept = Array.isArray(stored)
    ? stored.filter((type, index, list): type is string => typeof type === 'string' && known.has(type) && list.indexOf(type) === index)
    : [];
  const seen = new Set(kept);
  return [...kept, ...catalog.filter((type) => !seen.has(type))];
};

/**
 * Move `type` to the slot `target` occupies: dropping on a later icon lands
 * after it, dropping on an earlier icon lands before it. Unknown ids and a
 * drop on itself leave the order untouched.
 */
export const moveIcon = (order: string[], type: string, target: string): string[] => {
  const from = order.indexOf(type);
  const to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return order;
  const next = order.filter((entry) => entry !== type);
  next.splice(to, 0, type);
  return next;
};
