// src/utils/json/types.ts — shared result shapes for the JSON engine.
import type { ParseError, Issue } from './parse';

export type { ParseError, Issue };

export interface TablePreview {
  headers: string[];
  rows: string[][];
  /** Total data rows (the preview may show fewer). */
  total: number;
}

export interface ConvertResult {
  output: string;
  error?: ParseError;
  /** Non-fatal notes, e.g. renamed XML keys or ragged CSV rows. */
  warnings?: string[];
  /** One-line summary shown in the status footer. */
  info?: string;
  table?: TablePreview;
}

export type ConvertOp =
  | 'json-to-csv'
  | 'csv-to-json'
  | 'json-to-yaml'
  | 'yaml-to-json'
  | 'json-to-xml'
  | 'xml-to-json'
  | 'escape'
  | 'unescape';

export type ConvertOptions = Record<string, string | number | boolean | undefined>;
