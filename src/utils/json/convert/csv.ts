// src/utils/json/convert/csv.ts — JSON ↔ CSV with dot-path flattening.
import Papa from 'papaparse';
import { parseJson } from '../parse';
import type { ConvertResult } from '../types';

export type ArrayMode = 'index' | 'join' | 'json';

export interface JsonToCsvOptions {
  delimiter?: string;
  /** Flatten nested objects into dot-path columns (address.city). Off = nested values as JSON text. */
  flatten?: boolean;
  /** How arrays become cells: tags.0/tags.1 columns, "a; b" in one cell, or JSON text. */
  arrays?: ArrayMode;
  /** Prefix cells starting with = + - @ so spreadsheets do not run them as formulas. */
  escapeFormulae?: boolean;
  tolerant?: boolean;
}

type Row = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);

/** Flattens one record into { "a.b.c": primitive } pairs. */
export function flattenRecord(v: unknown, opts: Pick<JsonToCsvOptions, 'flatten' | 'arrays'> = {}): Row {
  const out: Row = {};
  const arrays = opts.arrays ?? 'index';
  const walk = (x: unknown, prefix: string) => {
    if (Array.isArray(x)) {
      if (!opts.flatten || arrays === 'json') { out[prefix || 'value'] = JSON.stringify(x); return; }
      if (arrays === 'join' && x.every((i) => !i || typeof i !== 'object')) {
        out[prefix || 'value'] = x.map((i) => (i === null ? '' : String(i))).join('; ');
        return;
      }
      if (x.length === 0) { out[prefix || 'value'] = ''; return; }
      x.forEach((item, i) => walk(item, prefix ? `${prefix}.${i}` : String(i)));
      return;
    }
    if (isPlainObject(x)) {
      if (!opts.flatten && prefix) { out[prefix] = JSON.stringify(x); return; }
      const keys = Object.keys(x);
      if (keys.length === 0 && prefix) { out[prefix] = ''; return; }
      for (const k of keys) walk(x[k], prefix ? `${prefix}.${k}` : k);
      return;
    }
    out[prefix || 'value'] = x;
  };
  walk(v, '');
  return out;
}

/** Finds the list of records in a document: the top-level array, or a lone array property like {"data": [...]}. */
export function findRecords(value: unknown): { records: unknown[]; from?: string } {
  if (Array.isArray(value)) return { records: value };
  if (isPlainObject(value)) {
    const arrays = Object.entries(value).filter(([, v]) => Array.isArray(v) && v.length > 0 && (v as unknown[]).every(isPlainObject));
    if (arrays.length === 1) return { records: arrays[0][1] as unknown[], from: arrays[0][0] };
    return { records: [value] };
  }
  return { records: [value] };
}

const cell = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v));

export function jsonToCsv(input: string, opts: JsonToCsvOptions = {}): ConvertResult {
  const { value, error } = parseJson(input, { tolerant: opts.tolerant });
  if (error) return { output: '', error };
  const { records, from } = findRecords(value);
  const flat = records.map((r) => flattenRecord(r, { flatten: opts.flatten ?? true, arrays: opts.arrays }));

  // Union of columns in first-seen order.
  const seen = new Set<string>();
  const headers: string[] = [];
  for (const r of flat) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); headers.push(k); }

  const data = flat.map((r) => headers.map((h) => cell(r[h])));
  const output = Papa.unparse({ fields: headers, data }, {
    delimiter: opts.delimiter || ',',
    newline: '\n',
    escapeFormulae: !!opts.escapeFormulae,
  });
  const missing = flat.reduce((n, r) => n + (Object.keys(r).length < headers.length ? 1 : 0), 0);
  const warnings: string[] = [];
  if (missing) warnings.push(`${missing} of ${flat.length} rows are missing some columns; those cells are empty.`);
  if (headers.length > 500) warnings.push(`${headers.length} columns. Consider turning off flattening or using JSON cells for arrays.`);
  return {
    output,
    warnings,
    info: `${flat.length} row${flat.length === 1 ? '' : 's'} × ${headers.length} column${headers.length === 1 ? '' : 's'}${from ? ` from "${from}"` : ''}`,
    table: { headers, rows: data.slice(0, 100), total: data.length },
  };
}

// ─── CSV → JSON ──────────────────────────────────────────────────────────────

export interface CsvToJsonOptions {
  /** 'auto' detects comma, semicolon, tab or pipe. */
  delimiter?: string;
  /** First row holds column names. Off = an array of arrays. */
  header?: boolean;
  /** Turn "42", "true" and empty cells into numbers, booleans and null. */
  inferTypes?: boolean;
  /** Rebuild nested objects from dot-path headers such as address.city. */
  unflatten?: boolean;
  indent?: number;
}

const NUM = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

export function inferCell(s: string): unknown {
  const t = s.trim();
  if (t === '') return null;
  if (NUM.test(t)) {
    const n = Number(t);
    // Keep IDs that would lose precision as strings.
    if (Number.isSafeInteger(n) || !/^-?\d+$/.test(t)) return n;
    return t;
  }
  if (t === 'true' || t === 'TRUE' || t === 'True') return true;
  if (t === 'false' || t === 'FALSE' || t === 'False') return false;
  if (t === 'null' || t === 'NULL') return null;
  return s;
}

/** Turns {"a.b": 1, "a.c": 2, "tags.0": "x"} into {a: {b: 1, c: 2}, tags: ["x"]}. */
export function unflattenRecord(row: Row): Row {
  const out: Row = {};
  for (const [path, v] of Object.entries(row)) {
    const parts = path.split('.');
    let node: Row = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!isPlainObject(node[p])) node[p] = {};
      node = node[p] as Row;
    }
    node[parts[parts.length - 1]] = v;
  }
  return arrayify(out) as Row;
}

/** Objects whose keys are exactly 0..n-1 become arrays. */
function arrayify(v: unknown): unknown {
  if (!isPlainObject(v)) return v;
  const keys = Object.keys(v);
  for (const k of keys) v[k] = arrayify(v[k]);
  if (keys.length && keys.every((k, i) => k === String(i))) return keys.map((k) => v[k]);
  return v;
}

const DELIM_NAMES: Record<string, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab', '|': 'pipe' };

export function csvToJson(input: string, opts: CsvToJsonOptions = {}): ConvertResult {
  if (!input.trim()) return { output: '', error: { message: 'The input is empty.' } };
  const auto = !opts.delimiter || opts.delimiter === 'auto';
  const parsed = Papa.parse<string[]>(input.replace(/^\uFEFF/, ''), {
    delimiter: auto ? '' : opts.delimiter,
    delimitersToGuess: [',', ';', '\t', '|'],
    skipEmptyLines: 'greedy',
  });
  const rows = parsed.data;
  const warnings: string[] = [];
  const quoteErr = parsed.errors.find((e) => e.type === 'Quotes');
  if (quoteErr) {
    return {
      output: '',
      error: { message: `Row ${(quoteErr.row ?? 0) + 1}: ${quoteErr.message}. A quoted cell is probably missing its closing quote.`, line: (quoteErr.row ?? 0) + 1 },
    };
  }
  if (rows.length === 0) return { output: '', error: { message: 'No rows found.' } };

  const header = opts.header ?? true;
  const conv = opts.inferTypes ? inferCell : (s: string) => s;
  let value: unknown;
  let count: number;
  let cols: number;

  if (header) {
    const raw = rows[0].map((h, i) => h.trim() || `column_${i + 1}`);
    // Make duplicate column names unique so no data is lost.
    const names: string[] = [];
    const counts = new Map<string, number>();
    for (const h of raw) {
      const c = (counts.get(h) ?? 0) + 1;
      counts.set(h, c);
      names.push(c === 1 ? h : `${h}_${c}`);
    }
    if (names.some((n, i) => n !== raw[i])) warnings.push('Duplicate column names were renamed with a _2, _3… suffix.');
    let ragged = 0;
    const records = rows.slice(1).map((r) => {
      if (r.length !== names.length) ragged++;
      const o: Row = {};
      const width = Math.max(r.length, names.length);
      for (let i = 0; i < width; i++) {
        const key = names[i] ?? `column_${i + 1}`;
        o[key] = i < r.length ? conv(r[i]) : opts.inferTypes ? null : '';
      }
      return opts.unflatten ? unflattenRecord(o) : o;
    });
    if (ragged) warnings.push(`${ragged} row${ragged === 1 ? ' has' : 's have'} a different number of cells than the header.`);
    value = records;
    count = records.length;
    cols = names.length;
  } else {
    value = rows.map((r) => r.map(conv));
    count = rows.length;
    cols = Math.max(...rows.map((r) => r.length));
  }

  const delim = parsed.meta.delimiter;
  return {
    output: JSON.stringify(value, null, opts.indent ?? 2),
    warnings,
    info: `${count} row${count === 1 ? '' : 's'} × ${cols} column${cols === 1 ? '' : 's'} · ${DELIM_NAMES[delim] ?? JSON.stringify(delim)}-separated${auto ? ' (detected)' : ''}`,
  };
}
