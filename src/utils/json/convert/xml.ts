// src/utils/json/convert/xml.ts — JSON ↔ XML via fast-xml-parser.
import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { parseJson } from '../parse';
import type { ConvertResult } from '../types';

export interface JsonToXmlOptions {
  /** Name of the wrapping element. Empty = use the object's only key as the root. */
  root?: string;
  /** Element name for items of a top-level or nested array. */
  itemName?: string;
  /** Keys with this prefix become attributes. */
  attrPrefix?: string;
  declaration?: boolean;
  indent?: number;
  tolerant?: boolean;
}

const NAME_START = /^[A-Za-z_]/;
const NAME_BAD = /[^\w.:-]/g; // colons kept for namespaced names like atom:link

/** Makes a string a valid XML element name. */
export function xmlName(key: string): string {
  let s = key.replace(NAME_BAD, '_');
  if (!NAME_START.test(s) || /^xml/i.test(s)) s = '_' + s;
  return s;
}

export function jsonToXml(input: string, opts: JsonToXmlOptions = {}): ConvertResult {
  const { value, error } = parseJson(input, { tolerant: opts.tolerant });
  if (error) return { output: '', error };
  const attrPrefix = opts.attrPrefix ?? '@_';
  const itemName = xmlName(opts.itemName?.trim() || 'item');
  const renamed = new Map<string, string>();

  const prep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) ? { [itemName]: prep(x) } : prep(x)));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) {
        if (k === '#text' || (attrPrefix && k.startsWith(attrPrefix))) {
          const attr = attrPrefix && k.startsWith(attrPrefix) ? attrPrefix + xmlName(k.slice(attrPrefix.length)) : k;
          out[attr] = val;
          continue;
        }
        const name = xmlName(k);
        if (name !== k) renamed.set(k, name);
        out[name] = Array.isArray(val) && val.length === 0 ? '' : prep(val);
      }
      return out;
    }
    return v;
  };

  let rootName = opts.root?.trim() ? xmlName(opts.root.trim()) : '';
  let body: unknown;
  if (!rootName && value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1) {
    const only = Object.keys(value)[0];
    rootName = xmlName(only);
    body = prep((value as Record<string, unknown>)[only]);
  } else {
    rootName ||= 'root';
    body = Array.isArray(value) ? { [itemName]: prep(value) } : prep(value);
  }

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: attrPrefix,
    textNodeName: '#text',
    format: true,
    indentBy: ' '.repeat(opts.indent ?? 2),
    suppressEmptyNode: false,
    suppressBooleanAttributes: false,
  });
  let xml = builder.build({ [rootName]: body }) as string;
  xml = xml.trim() + '\n';
  if (opts.declaration ?? true) xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;

  const warnings: string[] = [];
  if (renamed.size) {
    const list = [...renamed].slice(0, 4).map(([a, b]) => `"${a}" → <${b}>`).join(', ');
    const one = renamed.size === 1;
    warnings.push(`${renamed.size} key${one ? ' is not a valid XML name and was' : 's are not valid XML names and were'} renamed: ${list}${renamed.size > 4 ? ', …' : ''}.`);
  }
  return { output: xml, warnings, info: `Root element <${rootName}>` };
}

export interface XmlToJsonOptions {
  /** Prefix added to attribute names in the JSON, e.g. "@_" or "@". Empty = no prefix. */
  attrPrefix?: string;
  ignoreAttributes?: boolean;
  /** Convert "42" and "true" in text and attributes to numbers and booleans. */
  parseValues?: boolean;
  indent?: number;
}

export function xmlToJson(input: string, opts: XmlToJsonOptions = {}): ConvertResult {
  if (!input.trim()) return { output: '', error: { message: 'The input is empty.' } };
  const valid = XMLValidator.validate(input, { allowBooleanAttributes: true });
  if (valid !== true) {
    const { msg, line, col } = valid.err;
    return { output: '', error: { message: msg.replace(/\.?$/, '.'), line, column: col } };
  }
  const parseValues = opts.parseValues ?? true;
  const parser = new XMLParser({
    ignoreAttributes: !!opts.ignoreAttributes,
    attributeNamePrefix: opts.attrPrefix ?? '@_',
    textNodeName: '#text',
    parseTagValue: parseValues,
    parseAttributeValue: parseValues,
    trimValues: true,
    ignoreDeclaration: true,
    ignorePiTags: true,
    allowBooleanAttributes: true,
    // Keep IDs like 007 and 0x1F as strings.
    numberParseOptions: { leadingZeros: false, hex: false, eNotation: true },
  });
  const value = parser.parse(input);
  return { output: JSON.stringify(value, null, opts.indent ?? 2), info: `Root <${Object.keys(value)[0] ?? ''}>` };
}
