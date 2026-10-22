// src/utils/json/tree.ts — a flat, lazily built row list for the tree view.
// Only expanded containers have their children materialised, so a 10 MB
// document costs nothing until you open it up.

export type JsonType = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
export type PathPart = string | number;

export interface TreeRow {
  /** JSONPath of the node; unique, used as the expansion key. */
  id: string;
  path: PathPart[];
  key: PathPart | null;
  type: JsonType;
  /** Short display text for the value (or a summary for containers). */
  preview: string;
  /** Number of direct children for objects and arrays, 0 otherwise. */
  childCount: number;
  depth: number;
  value: unknown;
}

export function typeOf(v: unknown): JsonType {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  if (t === 'object') return 'object';
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  return 'null';
}

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** `$.items[0].sku` style path; keys that are not identifiers use ['bracket'] notation. */
export function toJsonPath(path: PathPart[]): string {
  let s = '$';
  for (const p of path) {
    if (typeof p === 'number') s += `[${p}]`;
    else if (IDENT.test(p)) s += `.${p}`;
    else s += `['${p.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}']`;
  }
  return s;
}

export function childCount(v: unknown): number {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') return Object.keys(v).length;
  return 0;
}

export function previewOf(v: unknown, max = 120): string {
  const t = typeOf(v);
  if (t === 'string') {
    const s = JSON.stringify(v as string);
    return s.length > max ? s.slice(0, max - 1) + '…"' : s;
  }
  if (t === 'array') return `Array(${(v as unknown[]).length})`;
  if (t === 'object') return `{${childCount(v)}}`;
  return String(v);
}

function makeRow(value: unknown, path: PathPart[], key: PathPart | null, depth: number): TreeRow {
  return { id: toJsonPath(path), path, key, type: typeOf(value), preview: previewOf(value), childCount: childCount(value), depth, value };
}

export function rootRow(value: unknown): TreeRow {
  return makeRow(value, [], null, 0);
}

/** Direct children of a row, created on demand. */
export function childrenOf(row: TreeRow): TreeRow[] {
  const v = row.value;
  if (Array.isArray(v)) return v.map((item, i) => makeRow(item, [...row.path, i], i, row.depth + 1));
  if (v && typeof v === 'object') {
    return Object.keys(v).map((k) => makeRow((v as Record<string, unknown>)[k], [...row.path, k], k, row.depth + 1));
  }
  return [];
}

/** The rows currently visible given a set of expanded ids. */
export function visibleRows(value: unknown, expanded: ReadonlySet<string>, limit = 2_000_000): TreeRow[] {
  const rows: TreeRow[] = [];
  const walk = (row: TreeRow) => {
    if (rows.length >= limit) return;
    rows.push(row);
    if (row.childCount > 0 && expanded.has(row.id)) {
      for (const c of childrenOf(row)) walk(c);
    }
  };
  walk(rootRow(value));
  return rows;
}

/**
 * Ids of every container down to `depth` levels (root is level 0).
 * Stops after `limit` containers so "expand all" stays usable on huge files.
 */
export function idsToDepth(value: unknown, depth: number, limit = 20_000): { ids: Set<string>; truncated: boolean } {
  const ids = new Set<string>();
  let truncated = false;
  const queue: TreeRow[] = [rootRow(value)];
  for (let qi = 0; qi < queue.length; qi++) {
    const row = queue[qi];
    if (row.childCount === 0 || row.depth >= depth) continue;
    if (ids.size >= limit) { truncated = true; break; }
    ids.add(row.id);
    for (const c of childrenOf(row)) if (c.childCount > 0) queue.push(c);
  }
  return { ids, truncated };
}

export interface SearchResult {
  /** Ids of nodes whose key or value matches. */
  matches: string[];
  /** Ancestors to expand so the matches are visible. */
  expand: Set<string>;
  truncated: boolean;
}

/** Case-insensitive search over keys and primitive values. */
export function searchTree(value: unknown, query: string, limit = 500): SearchResult {
  const q = query.trim().toLowerCase();
  const matches: string[] = [];
  const expand = new Set<string>();
  if (!q) return { matches, expand, truncated: false };
  let truncated = false;

  const walk = (v: unknown, path: PathPart[], key: PathPart | null, ancestors: string[]) => {
    if (truncated) return;
    const t = typeOf(v);
    const keyHit = key !== null && String(key).toLowerCase().includes(q);
    const valHit = t !== 'object' && t !== 'array' && String(v).toLowerCase().includes(q);
    if (keyHit || valHit) {
      if (matches.length >= limit) { truncated = true; return; }
      matches.push(toJsonPath(path));
      for (const a of ancestors) expand.add(a);
    }
    if (t === 'array' || t === 'object') {
      const id = toJsonPath(path);
      const next = [...ancestors, id];
      if (t === 'array') (v as unknown[]).forEach((item, i) => walk(item, [...path, i], i, next));
      else for (const k of Object.keys(v as object)) walk((v as Record<string, unknown>)[k], [...path, k], k, next);
    }
  };
  walk(value, [], null, []);
  return { matches, expand, truncated };
}
