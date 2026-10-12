/**
 * Window stacks (BeOS): windows dropped tab-on-tab share one frame and show
 * their tabs side by side in a strip, the way Haiku's Stack & Tile arranges
 * them. A stack is a shared `stack` id on each member; `stackedAt` orders the
 * strip (the window that joined last sits rightmost). These pure helpers keep
 * the membership rules testable; useWindowManager applies them, and
 * DraggableWindow measures the tabs so each knows how far right it sits.
 */
import { useSyncExternalStore } from 'react';

interface StackMember {
  id: string;
  stack?: string;
  stackedAt?: number;
  minimized?: boolean;
}

/** Members of `stackId` in strip order (left to right); minimized windows have no tab. */
export const stackOrder = <T extends StackMember>(windows: readonly T[], stackId: string): T[] => (
  windows
    .filter((window) => window.stack === stackId && !window.minimized)
    .sort((a, b) => (a.stackedAt ?? 0) - (b.stackedAt ?? 0) || a.id.localeCompare(b.id))
);

/** Clears a stack that has fewer than two members left: one tab is no strip. */
export const dissolveSingletons = <T extends StackMember>(windows: readonly T[]): T[] => {
  const counts = new Map<string, number>();
  for (const window of windows) {
    if (window.stack) counts.set(window.stack, (counts.get(window.stack) ?? 0) + 1);
  }
  if (![...counts.values()].some((count) => count < 2)) return [...windows];
  return windows.map((window) => (
    window.stack && (counts.get(window.stack) ?? 0) < 2 ? { ...window, stack: undefined, stackedAt: undefined } : window
  ));
};

/** Takes `id` out of its stack; a stack left with one member dissolves. */
export const leaveStack = <T extends StackMember>(windows: readonly T[], id: string): T[] => {
  const member = windows.find((window) => window.id === id);
  if (!member?.stack) return [...windows];
  return dissolveSingletons(windows.map((window) => (
    window.id === id ? { ...window, stack: undefined, stackedAt: undefined } : window
  )));
};

/** Comma-joined ids from WindowContainer; a string so memoized windows see a stable prop. */
export const parseStackMembers = (members: string | null | undefined): string[] => (members ? members.split(',') : []);

/* ---------- Tab widths ---------- */

// Each stacked window reports its tab's width; the offset of a tab is the
// sum of the widths before it in the strip.
const widths = new Map<string, number>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export const reportTabWidth = (id: string, width: number) => {
  if (widths.get(id) === width) return;
  widths.set(id, width);
  notify();
};

export const forgetTabWidth = (id: string) => {
  if (!widths.delete(id)) return;
  notify();
};

export const stackTabOffset = (members: readonly string[], id: string, tabWidths: ReadonlyMap<string, number> = widths): number => {
  let offset = 0;
  for (const member of members) {
    if (member === id) break;
    offset += tabWidths.get(member) ?? 0;
  }
  return offset;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** How far right this window's tab sits in its strip; 0 when it is not stacked. */
export const useStackTabOffset = (members: readonly string[], id: string, enabled: boolean): number => (
  useSyncExternalStore(subscribe, () => (enabled ? stackTabOffset(members, id) : 0), () => 0)
);
