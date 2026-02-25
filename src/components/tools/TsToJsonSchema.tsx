import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 200_000;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `interface User {
  id: string;
  email: string;
  name?: string;
  age?: number;
  isActive: boolean;
  role: "admin" | "user" | "guest";
  tags: string[];
  address: {
    street: string;
    city: string;
    zip?: string;
  };
}

type Status = "active" | "inactive" | "pending";

type Product = {
  productId: string;
  price: number;
  inStock: boolean;
  description?: string;
  categories: string[];
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
};

interface BlogPost {
  id: number;
  title: string;
  content: string;
  author: User;
  tags: string[];
  publishedAt: string | null;
  metadata: Record<string, unknown>;
}`;

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface ParsedProperty {
  key: string;
  type: string;
  optional: boolean;
}

interface ParsedType {
  name: string;
  kind: 'interface' | 'type-object' | 'type-alias';
  properties: ParsedProperty[];
  aliasType?: string;
}

interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number | boolean)[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  const?: string | number | boolean;
  additionalProperties?: JsonSchema | boolean;
  $ref?: string;
  $schema?: string;
  $defs?: Record<string, JsonSchema>;
  description?: string;
  [key: string]: unknown;
}

// ─── TOKENIZER HELPERS ──────────────────────────────────────────────────────

const OPENERS = new Set(['{', '(', '[', '<']);
const CLOSERS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '<': '>' };

/** Skip past a string literal starting at `i`. Returns index of the closing quote. */
function skipString(src: string, i: number): number {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j;
  }
  return src.length - 1;
}

/** Find the closing delimiter matching the opener at `start`, respecting nesting. */
function findClosingDelimiter(src: string, start: number): number {
  const opener = src[start];
  const closer = CLOSERS[opener];
  if (!closer) return -1;
  let depth = 1;
  for (let i = start + 1; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(src, i); continue; }
    if (ch === '>' && i > 0 && src[i - 1] === '=') continue; // skip => arrows
    if (ch === opener) depth++;
    else if (ch === closer) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Split `str` by a single-char `delim` at delimiter depth 0. */
function smartSplit(str: string, delim: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(str, i);
      cur += str.slice(i, end + 1);
      i = end;
      continue;
    }
    if (ch === '>' && i > 0 && str[i - 1] === '=') { cur += ch; continue; }
    if (OPENERS.has(ch)) depth++;
    if (ch === '}' || ch === ')' || ch === ']' || ch === '>') depth--;
    if (ch === delim && depth === 0) { parts.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/** Split generic arguments at the top-level comma */
function splitGenericArgs(inner: string): [string, string] {
  const parts = smartSplit(inner, ',');
  return [parts[0] ?? '', parts.slice(1).join(', ').trim()];
}

// ─── PARSER ─────────────────────────────────────────────────────────────────

/** Strip single-line and multi-line comments from source. */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      const end = skipString(src, i);
      out += src.slice(i, end + 1);
      i = end + 1;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (src[i] === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += src[i];
    i++;
  }
  return out;
}

/** Parse a property line like `key?: type` */
function parseProperty(line: string): ParsedProperty | null {
  const trimmed = line.replace(/^readonly\s+/, '').trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) return null;

  const colonIdx = trimmed.indexOf(':');
  if (colonIdx === -1) return null;

  let key = trimmed.slice(0, colonIdx).trim();
  const typeStr = trimmed.slice(colonIdx + 1).trim().replace(/;$/, '').trim();

  const optional = key.endsWith('?');
  if (optional) key = key.slice(0, -1).trim();

  // Strip surrounding quotes from key
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  if (!key) return null;

  return { key, type: typeStr, optional };
}

/** Extract the body between the first { and its matching } after `start` */
function extractBody(src: string, start: number): { body: string; end: number } | null {
  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) return null;
  const braceEnd = findClosingDelimiter(src, braceStart);
  if (braceEnd === -1) return null;
  return { body: src.slice(braceStart + 1, braceEnd), end: braceEnd };
}

/** Parse properties from a body string into ParsedProperty[] */
function parseProperties(body: string): ParsedProperty[] {
  const props: ParsedProperty[] = [];
  const lines = smartSplit(body, ';');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Handle nested inline object: key: { ... }
    if (line.includes('{')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > -1) {
        let key = line.slice(0, colonIdx).trim().replace(/^readonly\s+/, '');
        const optional = key.endsWith('?');
        if (optional) key = key.slice(0, -1).trim();
        const typeStr = line.slice(colonIdx + 1).trim();
        if (key) {
          props.push({ key, type: typeStr, optional });
          continue;
        }
      }
    }

    const prop = parseProperty(line);
    if (prop) props.push(prop);
  }

  return props;
}

/** Parse all interfaces and type aliases from source */
function parseTypes(src: string): ParsedType[] {
  const clean = stripComments(src);
  const types: ParsedType[] = [];

  // Parse interfaces: interface Name { ... }
  const ifaceRe = /\binterface\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>]*>)?\s*(?:extends\s+[^{]+)?\{/g;
  let match: RegExpExecArray | null;

  while ((match = ifaceRe.exec(clean)) !== null) {
    const name = match[1];
    const bodyResult = extractBody(clean, match.index);
    if (!bodyResult) continue;
    types.push({
      name,
      kind: 'interface',
      properties: parseProperties(bodyResult.body),
    });
  }

  // Parse type aliases: type Name = { ... } or type Name = ...
  const typeRe = /\btype\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:<[^>]*>)?\s*=\s*/g;

  while ((match = typeRe.exec(clean)) !== null) {
    const name = match[1];
    const afterEquals = clean.slice(match.index + match[0].length).trim();

    if (afterEquals.startsWith('{')) {
      const bodyResult = extractBody(clean, match.index + match[0].length);
      if (!bodyResult) continue;
      types.push({
        name,
        kind: 'type-object',
        properties: parseProperties(bodyResult.body),
      });
    } else {
      // Simple alias: type Status = "a" | "b"
      let end = clean.indexOf(';', match.index + match[0].length);
      if (end === -1) end = clean.length;
      const aliasType = clean.slice(match.index + match[0].length, end).trim();
      types.push({
        name,
        kind: 'type-alias',
        properties: [],
        aliasType,
      });
    }
  }

  return types;
}

// ─── TYPE → JSON SCHEMA MAPPER ──────────────────────────────────────────────

function mapTypeToSchema(ts: string, knownTypes: Set<string>): JsonSchema {
  const t = ts.trim();

  // Primitives
  if (t === 'string') return { type: 'string' };
  if (t === 'number') return { type: 'number' };
  if (t === 'boolean') return { type: 'boolean' };
  if (t === 'null') return { type: 'null' };
  if (t === 'any' || t === 'unknown') return {};
  if (t === 'never') return { not: {} };
  if (t === 'void' || t === 'undefined') return { type: 'null' };
  if (t === 'Date') return { type: 'string', format: 'date-time' };
  if (t === 'bigint') return { type: 'integer' };

  // String literals
  if (/^"[^"]*"$/.test(t) || /^'[^']*'$/.test(t)) {
    return { const: t.slice(1, -1) };
  }
  // Number literals
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    return { const: Number(t) };
  }
  // Boolean literals
  if (t === 'true') return { const: true };
  if (t === 'false') return { const: false };

  // Unwrap outer parens
  if (t.startsWith('(') && t.endsWith(')')) {
    const close = findClosingDelimiter(t, 0);
    if (close === t.length - 1) return mapTypeToSchema(t.slice(1, -1), knownTypes);
  }

  // Union types (split on | at depth 0)
  const unionParts = smartSplit(t, '|');
  if (unionParts.length > 1) {
    // Check if all parts are string literals → use enum
    const allStringLiterals = unionParts.every(p => /^["'][^"']*["']$/.test(p.trim()));
    if (allStringLiterals) {
      return { type: 'string', enum: unionParts.map(p => p.trim().slice(1, -1)) };
    }
    // Check if all parts are number literals → use enum
    const allNumberLiterals = unionParts.every(p => /^-?\d+(\.\d+)?$/.test(p.trim()));
    if (allNumberLiterals) {
      return { type: 'number', enum: unionParts.map(p => Number(p.trim())) };
    }
    // Nullable shorthand: T | null
    if (unionParts.length === 2) {
      const nullIdx = unionParts.findIndex(p => p.trim() === 'null');
      if (nullIdx !== -1) {
        const other = unionParts[1 - nullIdx].trim();
        const schema = mapTypeToSchema(other, knownTypes);
        return { anyOf: [schema, { type: 'null' }] };
      }
    }
    return { oneOf: unionParts.map(p => mapTypeToSchema(p.trim(), knownTypes)) };
  }

  // Intersection types (split on & at depth 0)
  const interParts = smartSplit(t, '&');
  if (interParts.length > 1) {
    return { allOf: interParts.map(p => mapTypeToSchema(p.trim(), knownTypes)) };
  }

  // Array shorthand: Type[]
  if (t.endsWith('[]')) {
    const inner = t.slice(0, -2).trim();
    return { type: 'array', items: mapTypeToSchema(inner, knownTypes) };
  }

  // Array<Type> generic
  const arrayMatch = t.match(/^Array<(.+)>$/);
  if (arrayMatch) {
    return { type: 'array', items: mapTypeToSchema(arrayMatch[1], knownTypes) };
  }

  // Record<K, V> → object with additionalProperties
  const recordMatch = t.match(/^Record<(.+)>$/);
  if (recordMatch) {
    const [, valueType] = splitGenericArgs(recordMatch[1]);
    return { type: 'object', additionalProperties: mapTypeToSchema(valueType, knownTypes) };
  }

  // Partial<Type> → $ref (we note it but keep the ref)
  const partialMatch = t.match(/^Partial<(.+)>$/);
  if (partialMatch) {
    const inner = partialMatch[1].trim();
    if (knownTypes.has(inner)) {
      return { $ref: `#/$defs/${inner}`, description: `Partial<${inner}> — all properties optional` };
    }
    return mapTypeToSchema(inner, knownTypes);
  }

  // Required<Type>
  const requiredMatch = t.match(/^Required<(.+)>$/);
  if (requiredMatch) {
    const inner = requiredMatch[1].trim();
    if (knownTypes.has(inner)) {
      return { $ref: `#/$defs/${inner}`, description: `Required<${inner}> — all properties required` };
    }
    return mapTypeToSchema(inner, knownTypes);
  }

  // Inline object type: { key: Type; ... }
  if (t.startsWith('{') && t.endsWith('}')) {
    const body = t.slice(1, -1).trim();
    const props = parseProperties(body);
    return buildObjectSchema(props, knownTypes);
  }

  // Tuple: [Type, Type]
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    const parts = smartSplit(inner, ',');
    return {
      type: 'array',
      items: parts.map(p => mapTypeToSchema(p.trim(), knownTypes)),
      minItems: parts.length,
      maxItems: parts.length,
    } as unknown as JsonSchema;
  }

  // Reference to known type
  if (knownTypes.has(t)) {
    return { $ref: `#/$defs/${t}` };
  }

  // Fallback — treat as opaque
  return { description: `Unsupported TypeScript type: ${t}` };
}

/** Build a JSON Schema object node from parsed properties */
function buildObjectSchema(props: ParsedProperty[], knownTypes: Set<string>): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const prop of props) {
    properties[prop.key] = mapTypeToSchema(prop.type, knownTypes);
    if (!prop.optional) {
      required.push(prop.key);
    }
  }

  const schema: JsonSchema = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}

// ─── CONVERSION ENTRY ───────────────────────────────────────────────────────

function convertToJsonSchema(input: string): { code: string; error: string | null } {
  try {
    if (!input.trim()) return { code: '', error: null };

    const parsed = parseTypes(input);
    if (parsed.length === 0) {
      return { code: '', error: 'No TypeScript interfaces or type aliases found. Paste an interface or type declaration.' };
    }

    const knownTypes = new Set(parsed.map(p => p.name));
    const defs: Record<string, JsonSchema> = {};

    for (const t of parsed) {
      if (t.kind === 'type-alias' && t.aliasType) {
        defs[t.name] = mapTypeToSchema(t.aliasType, knownTypes);
      } else {
        defs[t.name] = buildObjectSchema(t.properties, knownTypes);
      }
    }

    // If there's only one type, make it the root schema; otherwise use $defs
    let schema: JsonSchema;

    if (parsed.length === 1) {
      const rootDef = defs[parsed[0].name];
      schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: parsed[0].name,
        ...rootDef,
      };
    } else {
      // Use the first interface/object type as root, others as $defs
      const rootType = parsed[0];
      const rootDef = defs[rootType.name];
      const otherDefs: Record<string, JsonSchema> = {};
      for (const t of parsed.slice(1)) {
        otherDefs[t.name] = defs[t.name];
      }
      schema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        title: rootType.name,
        ...rootDef,
        $defs: otherDefs,
      };
    }

    return { code: JSON.stringify(schema, null, 2), error: null };
  } catch (err) {
    return { code: '', error: `Conversion failed: ${(err as Error).message}` };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function TsToJsonSchema() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const jsonSchema = useMemo(() => {
    const r = convertToJsonSchema(debouncedInput);
    queueMicrotask(() => setError(r.error));
    return r.code;
  }, [debouncedInput]);

  const handleClear = useCallback(() => {
    setInput('');
    textareaRef.current?.focus();
  }, []);

  const handleLoadExample = useCallback(() => {
    setInput(DEFAULT_INPUT);
  }, []);

  const isNearLimit = input.length > MAX_INPUT_LENGTH * 0.8;
  const utilization = ((input.length / MAX_INPUT_LENGTH) * 100).toFixed(0);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex gap-2">
          <button
            onClick={handleLoadExample}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Load example TypeScript code"
          >
            Load Example
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Clear input"
          >
            Clear
          </button>
        </div>

        {isNearLimit && (
          <div className="flex items-center gap-2 text-xs text-amber-400" role="status">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{utilization}% capacity used</span>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-150">
        {/* Input Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-sm font-semibold text-slate-300">TypeScript Input</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {(input.length / 1_000).toFixed(1)}KB
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-[#020617] text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
            placeholder="interface User { id: string; name: string; }"
            spellCheck={false}
            maxLength={MAX_INPUT_LENGTH + 10_000}
            aria-label="TypeScript code input"
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">JSON Schema Output</span>
            </div>
            <CopyButton
              text={jsonSchema}
              label="Copy JSON"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
              aria-label="Copy generated JSON Schema to clipboard"
            />
          </div>
          <pre className="flex-1 overflow-auto p-4 bg-[#020617]">
            <code className="text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {jsonSchema}
            </code>
          </pre>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm" role="alert">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
