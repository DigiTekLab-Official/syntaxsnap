// src/utils/json/convert/yaml.ts — JSON ↔ YAML via js-yaml.
import * as jsyaml from 'js-yaml';
import type { Type, YAMLException } from 'js-yaml';

const { dump, loadAll, CORE_SCHEMA } = jsyaml;
// js-yaml exports its built-in types at runtime, but @types/js-yaml omits them.
const { merge } = (jsyaml as unknown as { types: { merge: Type } }).types;

// YAML 1.2 core types plus merge keys (<<: *defaults). Unlike js-yaml's default
// schema there is no timestamp type, so dates stay strings.
const LOAD_SCHEMA = CORE_SCHEMA.extend({ implicit: [merge] });
import { parseJson } from '../parse';
import type { ConvertResult } from '../types';

export interface JsonToYamlOptions { indent?: number | string; sortKeys?: boolean; tolerant?: boolean }

export function jsonToYaml(input: string, opts: JsonToYamlOptions = {}): ConvertResult {
  const { value, error } = parseJson(input, { tolerant: opts.tolerant });
  if (error) return { output: '', error };
  // The default schema quotes strings that other YAML parsers would read as
  // dates, booleans (yes/on) or numbers, so the round trip is safe.
  const output = dump(value, { indent: Number(opts.indent ?? 2) || 2, sortKeys: !!opts.sortKeys, lineWidth: -1, noRefs: true });
  return { output, info: `${output.split('\n').length - 1} lines of YAML` };
}

export interface YamlToJsonOptions { indent?: number | string }

/** Plain-English versions of js-yaml's most common error reasons. */
function explain(reason: string): string {
  if (/tab characters must not be used in indentation/i.test(reason)) return 'Tabs are used for indentation. YAML only allows spaces.';
  if (/bad indentation of a mapping entry/i.test(reason)) return 'Bad indentation. This key does not line up with the keys around it.';
  if (/bad indentation of a sequence entry/i.test(reason)) return 'Bad indentation. This list item does not line up with the items around it.';
  if (/duplicated mapping key/i.test(reason)) return 'Duplicate key. Each key can appear only once in the same mapping.';
  if (/end of the stream or a document separator is expected/i.test(reason)) return 'Unexpected content. Check the indentation, or a colon or dash may be missing.';
  if (/incomplete explicit mapping pair/i.test(reason)) return 'A key is missing its value or the colon after it.';
  if (/unexpected end of the stream within a (single|double) quoted scalar/i.test(reason)) return 'A quoted string is never closed.';
  if (/can not read a block mapping entry; a multiline key may not be an implicit key/i.test(reason)) return 'A key spans more than one line, or a colon is missing after a key.';
  if (/missed comma between flow collection entries/i.test(reason)) return 'A comma is missing between items in a [ ] list or { } map.';
  return reason.charAt(0).toUpperCase() + reason.slice(1) + '.';
}

export function yamlToJson(input: string, opts: YamlToJsonOptions = {}): ConvertResult {
  if (!input.trim()) return { output: '', error: { message: 'The input is empty.' } };
  try {
    const docs = loadAll(input, undefined, { schema: LOAD_SCHEMA }).filter((d) => d !== undefined);
    const value = docs.length === 1 ? docs[0] : docs;
    const output = JSON.stringify(value === undefined ? null : value, null, Number(opts.indent ?? 2) || 2);
    return { output, info: docs.length > 1 ? `${docs.length} YAML documents → JSON array` : 'One YAML document' };
  } catch (e) {
    const err = e as YAMLException;
    const mark = err.mark;
    return {
      output: '',
      error: {
        message: explain(err.reason || err.message),
        line: mark ? mark.line + 1 : undefined,
        column: mark ? mark.column + 1 : undefined,
        position: mark?.position,
      },
    };
  }
}
