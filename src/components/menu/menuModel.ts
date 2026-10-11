/**
 * One menu model for the system menu, window menus, and context menus, so a
 * theme restyles every menu through the same classes.
 */
export type MenuEntry =
  | { type: 'divider' }
  | {
      type?: 'item';
      label: string;
      /** Icon type for CustomIcon. */
      icon?: string;
      /** Right-aligned hint, such as a keyboard shortcut. */
      shortcut?: string;
      /** Draws a check mark in the icon slot; for toggles and radio-like choices. */
      checked?: boolean;
      disabled?: boolean;
      action?: () => void;
      subItems?: MenuEntry[];
    };

export type MenuItemEntry = Exclude<MenuEntry, { type: 'divider' }>;

export const isDivider = (entry: MenuEntry): entry is { type: 'divider' } => entry.type === 'divider';
