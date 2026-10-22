// src/utils/json/format.ts — beautify / minify / sort, plus document stats.
import { parseJson, lintJson, type ParseError, type Issue } from './parse';

export type Indent = '2' | '4' | 'tab';

export interface FormatOptions {
  indent?: Indent;
  minify?: boolean;
  sortKeys?: boolean;
  /** Accept comments, trailing commas and single quotes (JSONC / JSON5). */
  tolerant?: boolean;
  /** Also run the validator and return every issue (validator page). */
  lint?: boolean;
}

export interface JsonStats { keys: number; depth: number; nodes: number }

export interface FormatResult {
  output: string;
  error?: ParseError;
  issues?: Issue[];
  stats?: JsonStats;
  inputBytes: number;
  outputBytes: number;
  /** Milliseconds spent in the parser. */
  parseMs: number;
}

export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeysDeep(o[k])]));
  }
  return v;
}

/** Key count, nesting depth and node count, without recursion (safe on deep documents). */
export function stats(v: unknown): JsonStats {
  let keys = 0, depth = 0, nodes = 0;
  const stack: [unknown, number][] = [[v, 0]];
  while (stack.length) {
    const [x, d] = stack.pop()!;
    nodes++;
    if (d > depth) depth = d;
    if (Array.isArray(x)) { for (let i = 0; i < x.length; i++) stack.push([x[i], d + 1]); }
    else if (x && typeof x === 'object') {
      for (const k in x as object) { keys++; stack.push([(x as Record<string, unknown>)[k], d + 1]); }
    }
  }
  return { keys, depth, nodes };
}

let encoder: TextEncoder | undefined;
/** UTF-8 byte length. */
export const bytes = (s: string) => {
  // Fast path for ASCII-only strings.
  // eslint-disable-next-line no-control-regex
  if (s.length < 4096 && !/[^\x00-\x7f]/.test(s)) return s.length;
  encoder ??= new TextEncoder();
  return encoder.encode(s).length;
};

export const fmtBytes = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function formatJson(text: string, opts: FormatOptions = {}): FormatResult {
  const inputBytes = bytes(text);
  const t0 = now();
  const { value, error } = parseJson(text, { tolerant: opts.tolerant });
  const parseMs = now() - t0;
  const issues = opts.lint ? lintJson(text, { tolerant: opts.tolerant }) : undefined;
  if (error) return { output: '', error, issues, inputBytes, outputBytes: 0, parseMs };
  const v = opts.sortKeys ? sortKeysDeep(value) : value;
  const space = opts.minify ? undefined : opts.indent === 'tab' ? '\t' : Number(opts.indent ?? 2);
  const output = JSON.stringify(v, null, space);
  return { output, issues, stats: stats(value), inputBytes, outputBytes: bytes(output), parseMs };
}
