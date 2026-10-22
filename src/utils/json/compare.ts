// src/utils/json/compare.ts — semantic JSON diff that ignores key order.
import { toJsonPath, typeOf, type PathPart } from './tree';

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface Change {
  kind: ChangeKind;
  /** JSONPath of the changed node. */
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface CompareOptions {
  /** Treat arrays as unordered sets of values (match items regardless of position). */
  ignoreArrayOrder?: boolean;
  /** Stop after this many changes. */
  limit?: number;
}

const canonical = (v: unknown): string => {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
  }
  return JSON.stringify(v);
};

/** Deep equality that ignores object key order. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  const ta = typeOf(a), tb = typeOf(b);
  if (ta !== tb) return false;
  if (ta === 'array') {
    const x = a as unknown[], y = b as unknown[];
    return x.length === y.length && x.every((v, i) => jsonEqual(v, y[i]));
  }
  if (ta === 'object') {
    const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
    const kx = Object.keys(x), ky = Object.keys(y);
    return kx.length === ky.length && kx.every((k) => Object.prototype.hasOwnProperty.call(y, k) && jsonEqual(x[k], y[k]));
  }
  return false;
}

export function diffJson(a: unknown, b: unknown, opts: CompareOptions = {}): { changes: Change[]; truncated: boolean } {
  const limit = opts.limit ?? 5000;
  const changes: Change[] = [];
  let truncated = false;
  const push = (c: Change) => { if (changes.length >= limit) { truncated = true; return; } changes.push(c); };

  const walk = (x: unknown, y: unknown, path: PathPart[]) => {
    if (truncated) return;
    const tx = typeOf(x), ty = typeOf(y);
    if (tx !== ty) { push({ kind: 'changed', path: toJsonPath(path), before: x, after: y }); return; }
    if (tx === 'object') {
      const ox = x as Record<string, unknown>, oy = y as Record<string, unknown>;
      for (const k of Object.keys(ox)) {
        if (!Object.prototype.hasOwnProperty.call(oy, k)) push({ kind: 'removed', path: toJsonPath([...path, k]), before: ox[k] });
        else walk(ox[k], oy[k], [...path, k]);
      }
      for (const k of Object.keys(oy)) {
        if (!Object.prototype.hasOwnProperty.call(ox, k)) push({ kind: 'added', path: toJsonPath([...path, k]), after: oy[k] });
      }
      return;
    }
    if (tx === 'array') {
      const ax = x as unknown[], ay = y as unknown[];
      if (opts.ignoreArrayOrder) {
        // Match items by their canonical form; report what is left on each side.
        const pool = new Map<string, number[]>();
        ay.forEach((v, i) => { const k = canonical(v); pool.set(k, [...(pool.get(k) ?? []), i]); });
        const unmatchedX: number[] = [];
        ax.forEach((v, i) => {
          const k = canonical(v);
          const list = pool.get(k);
          if (list && list.length) list.shift(); else unmatchedX.push(i);
        });
        const unmatchedY = [...pool.values()].flat().sort((p, q) => p - q);
        for (const i of unmatchedX) push({ kind: 'removed', path: toJsonPath([...path, i]), before: ax[i] });
        for (const i of unmatchedY) push({ kind: 'added', path: toJsonPath([...path, i]), after: ay[i] });
        return;
      }
      const n = Math.min(ax.length, ay.length);
      for (let i = 0; i < n; i++) walk(ax[i], ay[i], [...path, i]);
      for (let i = n; i < ax.length; i++) push({ kind: 'removed', path: toJsonPath([...path, i]), before: ax[i] });
      for (let i = n; i < ay.length; i++) push({ kind: 'added', path: toJsonPath([...path, i]), after: ay[i] });
      return;
    }
    if (x !== y) push({ kind: 'changed', path: toJsonPath(path), before: x, after: y });
  };
  walk(a, b, []);
  return { changes, truncated };
}

/** Pretty JSON with keys sorted, so a text diff shows only real changes. */
export function canonicalPretty(v: unknown): string {
  const sort = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(sort);
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sort(o[k])]));
    }
    return x;
  };
  return JSON.stringify(sort(v), null, 2);
}
