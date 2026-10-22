// src/utils/json/convert.ts — one entry point for every JSON conversion.
//
// Each format lives in its own module under ./convert/ and is loaded on first
// use, so the JSON to YAML page never downloads the CSV or XML parser.
//   json-to-csv / csv-to-json   → ./convert/csv   (papaparse)
//   json-to-yaml / yaml-to-json → ./convert/yaml  (js-yaml)
//   json-to-xml / xml-to-json   → ./convert/xml   (fast-xml-parser)
//   escape / unescape           → ./convert/escape
import type { ConvertOp, ConvertOptions, ConvertResult } from './types';

export type { ConvertOp, ConvertOptions, ConvertResult };

export async function convert(op: ConvertOp, input: string, opts: ConvertOptions = {}): Promise<ConvertResult> {
  // Options arrive as a loose record from the UI and the worker; each module reads what it needs.
  const o = opts as never;
  switch (op) {
    case 'json-to-csv': return (await import('./convert/csv')).jsonToCsv(input, o);
    case 'csv-to-json': return (await import('./convert/csv')).csvToJson(input, o);
    case 'json-to-yaml': return (await import('./convert/yaml')).jsonToYaml(input, o);
    case 'yaml-to-json': return (await import('./convert/yaml')).yamlToJson(input, o);
    case 'json-to-xml': return (await import('./convert/xml')).jsonToXml(input, o);
    case 'xml-to-json': return (await import('./convert/xml')).xmlToJson(input, o);
    case 'escape': return (await import('./convert/escape')).escapeJson(input, o);
    case 'unescape': return (await import('./convert/escape')).unescapeJson(input, o);
  }
}
