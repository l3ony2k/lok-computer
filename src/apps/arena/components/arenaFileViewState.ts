import { ArenaItem } from "@/types/arena";

export type ArenaFileViewMode = "grid" | "list";
export type ArenaFileSize = "small" | "medium" | "large";
export type ArenaFileSort = "default" | "title" | "type" | "added" | "updated";

export interface ArenaFileViewState {
  view: ArenaFileViewMode;
  sort: ArenaFileSort;
  direction: "asc" | "desc";
  gridSize: ArenaFileSize;
  listSize: ArenaFileSize;
  query: string;
  types: ArenaItem["kind"][];
}

interface LegacyArenaFileViewState {
  isListView?: boolean;
  gridSize?: ArenaFileSize | "S" | "M" | "L";
  listSize?: ArenaFileSize | "S" | "M" | "L";
}

const FILE_SIZES: ArenaFileSize[] = ["small", "medium", "large"];
export const ARENA_FILE_SORTS: ArenaFileSort[] = ["default", "title", "type", "added", "updated"];

const sizeFromLegacy = (size?: LegacyArenaFileViewState["gridSize"]): ArenaFileSize | undefined => {
  if (size === "S") return "small";
  if (size === "M") return "medium";
  if (size === "L") return "large";
  return FILE_SIZES.includes(size as ArenaFileSize) ? size as ArenaFileSize : undefined;
};
export const createArenaFileViewState = (
  overrides: Partial<ArenaFileViewState> = {}
): ArenaFileViewState => ({
  view: "grid",
  sort: "default",
  direction: "asc",
  gridSize: "medium",
  listSize: "medium",
  query: "",
  types: [],
  ...overrides,
});

export const normalizeArenaFileViewState = (
  value: (Partial<ArenaFileViewState> & LegacyArenaFileViewState) | null | undefined,
  defaults: ArenaFileViewState
): ArenaFileViewState => {
  if (!value) return defaults;

  const gridSize = sizeFromLegacy(value.gridSize) ?? defaults.gridSize;
  const listSize = sizeFromLegacy(value.listSize) ?? gridSize ?? defaults.listSize;
  const view = value.view === "grid" || value.view === "list"
    ? value.view
    : value.isListView === undefined
      ? defaults.view
      : value.isListView ? "list" : "grid";

  return {
    view,
    sort: ARENA_FILE_SORTS.includes(value.sort as ArenaFileSort) ? value.sort as ArenaFileSort : defaults.sort,
    direction: value.direction === "desc" ? "desc" : "asc",
    gridSize,
    listSize,
    query: typeof value.query === "string" ? value.query : defaults.query,
    types: Array.isArray(value.types)
      ? value.types.filter((type): type is ArenaItem["kind"] => ["image", "text", "link", "attachment", "embed", "channel"].includes(type))
      : defaults.types,
  };
};
