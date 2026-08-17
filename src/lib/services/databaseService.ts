// databaseService
//
// Mock/local implementation backed by localStorage, scoped by workspace.
// The public interface (get/list/create/update/remove, all workspace-scoped)
// is intentionally shaped like a Supabase query layer so this file can be
// swapped for a real `@supabase/supabase-js` implementation later without
// touching any UI code. Every method takes/returns workspaceId-tagged rows.

type Collection =
  | "workspaces"
  | "memberships"
  | "projects"
  | "shootDays"
  | "productionItems"
  | "people"
  | "assignments"
  | "casting"
  | "locations"
  | "budgetLines"
  | "callSheets"
  | "acknowledgements"
  | "tasks"
  | "activity";

const STORAGE_PREFIX = "production_os:";

function storageKey(collection: Collection) {
  return `${STORAGE_PREFIX}${collection}`;
}

function readAll<T>(collection: Collection): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(collection));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeAll<T>(collection: Collection, rows: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(collection), JSON.stringify(rows));
}

export function genId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export const databaseService = {
  list<T extends { workspaceId: string }>(collection: Collection, workspaceId: string): T[] {
    return readAll<T>(collection).filter((r) => r.workspaceId === workspaceId);
  },

  get<T extends { id: string; workspaceId: string }>(
    collection: Collection,
    workspaceId: string,
    id: string
  ): T | undefined {
    return readAll<T>(collection).find((r) => r.id === id && r.workspaceId === workspaceId);
  },

  create<T extends { id: string; workspaceId: string }>(collection: Collection, row: T): T {
    const rows = readAll<T>(collection);
    rows.push(row);
    writeAll(collection, rows);
    return row;
  },

  update<T extends { id: string; workspaceId: string }>(
    collection: Collection,
    workspaceId: string,
    id: string,
    patch: Partial<T>
  ): T | undefined {
    const rows = readAll<T>(collection);
    const idx = rows.findIndex((r) => r.id === id && r.workspaceId === workspaceId);
    if (idx === -1) return undefined;
    rows[idx] = { ...rows[idx], ...patch };
    writeAll(collection, rows);
    return rows[idx];
  },

  remove(collection: Collection, workspaceId: string, id: string): void {
    const rows = readAll<{ id: string; workspaceId: string }>(collection);
    writeAll(
      collection,
      rows.filter((r) => !(r.id === id && r.workspaceId === workspaceId))
    );
  },

  // Removes every row for a workspace across a set of collections (used by Reset Workspace).
  clearWorkspace(collections: Collection[], workspaceId: string) {
    collections.forEach((c) => {
      const rows = readAll<{ workspaceId: string }>(c);
      writeAll(
        c,
        rows.filter((r) => r.workspaceId !== workspaceId)
      );
    });
  },

  // Bulk insert, used for loading demo data.
  bulkCreate<T extends { id: string; workspaceId: string }>(collection: Collection, newRows: T[]) {
    const rows = readAll<T>(collection);
    writeAll(collection, [...rows, ...newRows]);
  },
};

export const ALL_COLLECTIONS: Collection[] = [
  "projects",
  "shootDays",
  "productionItems",
  "people",
  "assignments",
  "casting",
  "locations",
  "budgetLines",
  "callSheets",
  "acknowledgements",
  "tasks",
  "activity",
];
