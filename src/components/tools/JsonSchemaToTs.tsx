import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500_000;
const MAX_NESTING_DEPTH = 64;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "name": { "type": "string" },
    "age": { "type": "integer", "minimum": 0 },
    "isActive": { "type": "boolean" },
    "role": { "type": "string", "enum": ["admin", "editor", "viewer"] },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "zip": { "type": "string" }
      },
      "required": ["street", "city"]
    },
    "metadata": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    }
  },
  "required": ["id", "email", "isActive", "role", "tags"],
  "$defs": {
    "Status": {
      "type": "string",
      "enum": ["active", "inactive", "pending"]
    },
    "Product": {
      "type": "object",
      "properties": {
        "productId": { "type": "string" },
        "price": { "type": "number" },
        "inStock": { "type": "boolean" },
        "categories": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": ["productId", "price", "inStock"]
    }
  }
}`;

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Cheap iterative depth check to prevent stack overflow. */
function measureDepth(obj: unknown, limit: number): boolean {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: obj, depth: 0 }];
  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (depth > limit) return false;
    if (value !== null && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        stack.push({ value: v, depth: depth + 1 });
      }
    }
  }
  return true;
}

/** Does this look like a JSON Schema? */
function looksLikeJsonSchema(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    'type' in o ||
    'properties' in o ||
    'allOf' in o ||
    'oneOf' in o ||
    'anyOf' in o ||
    '$ref' in o ||
    '$schema' in o ||
    'items' in o ||
    'enum' in o
  );
}

/** PascalCase a string for interface names */
function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase());
}

/** Check if a property key is a valid JS identifier */
function isValidIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/** Format a property key — quote if needed */
function formatKey(key: string): string {
  return isValidIdentifier(key) ? key : JSON.stringify(key);
}

// ─── JSON SCHEMA → TYPESCRIPT CONVERTER ─────────────────────────────────────

interface SchemaNode {
  type?: string | string[];
  properties?: Record<string, SchemaNode>;
  required?: string[];
  items?: SchemaNode | SchemaNode[];
  enum?: (string | number | boolean | null)[];
  const?: string | number | boolean | null;
  oneOf?: SchemaNode[];
  anyOf?: SchemaNode[];
  allOf?: SchemaNode[];
  $ref?: string;
  $defs?: Record<string, SchemaNode>;
  definitions?: Record<string, SchemaNode>;
  additionalProperties?: boolean | SchemaNode;
  title?: string;
  description?: string;
  format?: string;
  [key: string]: unknown;
}

/** Resolve a $ref path like "#/$defs/User" to a TypeScript name */
function resolveRef(ref: string): string {
  const parts = ref.split('/');
  const last = parts[parts.length - 1];
  return toPascalCase(last);
}

/** Convert a single schema node to a TypeScript type string */
function schemaToType(node: SchemaNode, indent: number, knownRefs: Set<string>): string {
  if (!node || typeof node !== 'object') return 'unknown';

  // $ref
  if (node.$ref) {
    return resolveRef(node.$ref);
  }

  // const
  if (node.const !== undefined) {
    return typeof node.const === 'string' ? JSON.stringify(node.const) : String(node.const);
  }

  // enum
  if (node.enum) {
    return node.enum
      .map((v) => (typeof v === 'string' ? JSON.stringify(v) : String(v)))
      .join(' | ');
  }

  // oneOf / anyOf → union
  if (node.oneOf && node.oneOf.length > 0) {
    const parts = node.oneOf.map((s) => schemaToType(s, indent, knownRefs));
    return parts.length === 1 ? parts[0] : parts.join(' | ');
  }
  if (node.anyOf && node.anyOf.length > 0) {
    const parts = node.anyOf.map((s) => schemaToType(s, indent, knownRefs));
    return parts.length === 1 ? parts[0] : parts.join(' | ');
  }

  // allOf → intersection
  if (node.allOf && node.allOf.length > 0) {
    const parts = node.allOf.map((s) => schemaToType(s, indent, knownRefs));
    return parts.length === 1 ? parts[0] : parts.join(' & ');
  }

  // handle type as array: ["string", "null"] → string | null
  if (Array.isArray(node.type)) {
    const parts = node.type.map((t) => schemaToType({ ...node, type: t }, indent, knownRefs));
    return parts.join(' | ');
  }

  const type = node.type;

  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';

    case 'array': {
      if (Array.isArray(node.items)) {
        // Tuple
        const tupleTypes = node.items.map((it) => schemaToType(it, indent, knownRefs));
        return '[' + tupleTypes.join(', ') + ']';
      }
      if (node.items && typeof node.items === 'object') {
        const itemType = schemaToType(node.items as SchemaNode, indent, knownRefs);
        // Wrap union types in parens for array
        if (itemType.includes(' | ') || itemType.includes(' & ')) {
          return `(${itemType})[]`;
        }
        return itemType + '[]';
      }
      return 'unknown[]';
    }

    case 'object': {
      // additionalProperties only (no named properties) → Record
      if (!node.properties && node.additionalProperties) {
        if (node.additionalProperties === true) {
          return 'Record<string, unknown>';
        }
        const valType = schemaToType(node.additionalProperties as SchemaNode, indent, knownRefs);
        return `Record<string, ${valType}>`;
      }

      // Named properties → inline object type
      if (node.properties) {
        const requiredSet = new Set(node.required ?? []);
        const pad = '  '.repeat(indent + 1);
        const closePad = '  '.repeat(indent);
        const lines: string[] = [];

        for (const [key, propSchema] of Object.entries(node.properties)) {
          const tsType = schemaToType(propSchema, indent + 1, knownRefs);
          const optional = requiredSet.has(key) ? '' : '?';
          const comment = propSchema.description
            ? ` /** ${propSchema.description} */\n${pad}`
            : '';
          lines.push(`${pad}${comment}${formatKey(key)}${optional}: ${tsType};`);
        }

        // If there are additionalProperties alongside named props
        if (node.additionalProperties) {
          const valType =
            node.additionalProperties === true
              ? 'unknown'
              : schemaToType(node.additionalProperties as SchemaNode, indent + 1, knownRefs);
          lines.push(`${pad}[key: string]: ${valType};`);
        }

        return '{\n' + lines.join('\n') + '\n' + closePad + '}';
      }

      // Empty object
      return 'Record<string, unknown>';
    }

    default:
      break;
  }

  // No type specified but has properties → treat as object
  if (node.properties) {
    return schemaToType({ ...node, type: 'object' }, indent, knownRefs);
  }

  return 'unknown';
}

/** Convert a full JSON Schema document to TypeScript interfaces */
function convertJsonSchemaToTs(input: string): { code: string; error: string | null } {
  try {
    const trimmed = input.trim();
    if (!trimmed) return { code: '', error: null };

    if (trimmed.length > MAX_INPUT_LENGTH) {
      return { code: '', error: `Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB limit.` };
    }

    let schema: SchemaNode;
    try {
      schema = JSON.parse(trimmed);
    } catch {
      return { code: '', error: 'Invalid JSON — check for syntax errors.' };
    }

    if (!looksLikeJsonSchema(schema)) {
      return {
        code: '',
        error: 'This does not appear to be a JSON Schema. Expected "type", "properties", "$ref", etc.',
      };
    }

    if (!measureDepth(schema, MAX_NESTING_DEPTH)) {
      return { code: '', error: `Schema exceeds maximum nesting depth of ${MAX_NESTING_DEPTH}.` };
    }

    const knownRefs = new Set<string>();
    const lines: string[] = [];

    // Collect $defs / definitions names
    const defs = schema.$defs ?? schema.definitions ?? {};
    for (const name of Object.keys(defs)) {
      knownRefs.add(toPascalCase(name));
    }
    if (schema.title) {
      knownRefs.add(toPascalCase(schema.title));
    }

    // Generate root interface
    const rootName = schema.title ? toPascalCase(schema.title) : 'Root';

    if (schema.type === 'object' || schema.properties) {
      const requiredSet = new Set(schema.required ?? []);
      const propLines: string[] = [];

      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const tsType = schemaToType(propSchema, 1, knownRefs);
          const optional = requiredSet.has(key) ? '' : '?';
          const comment = propSchema.description
            ? `  /** ${propSchema.description} */\n`
            : '';
          propLines.push(`${comment}  ${formatKey(key)}${optional}: ${tsType};`);
        }
      }

      // additionalProperties on root
      if (schema.additionalProperties) {
        const valType =
          schema.additionalProperties === true
            ? 'unknown'
            : schemaToType(schema.additionalProperties as SchemaNode, 1, knownRefs);
        propLines.push(`  [key: string]: ${valType};`);
      }

      lines.push(`export interface ${rootName} {`);
      lines.push(...propLines);
      lines.push('}');
    } else {
      // Non-object root (e.g. enum, array)
      const tsType = schemaToType(schema, 0, knownRefs);
      lines.push(`export type ${rootName} = ${tsType};`);
    }

    // Generate $defs / definitions
    if (Object.keys(defs).length > 0) {
      for (const [name, defSchema] of Object.entries(defs)) {
        const interfaceName = toPascalCase(name);
        lines.push('');

        if (
          (defSchema.type === 'object' || defSchema.properties) &&
          !defSchema.enum
        ) {
          const requiredSet = new Set(defSchema.required ?? []);
          const propLines: string[] = [];

          if (defSchema.properties) {
            for (const [key, propSchema] of Object.entries(defSchema.properties)) {
              const tsType = schemaToType(propSchema, 1, knownRefs);
              const optional = requiredSet.has(key) ? '' : '?';
              const comment = propSchema.description
                ? `  /** ${propSchema.description} */\n`
                : '';
              propLines.push(`${comment}  ${formatKey(key)}${optional}: ${tsType};`);
            }
          }

          if (defSchema.additionalProperties) {
            const valType =
              defSchema.additionalProperties === true
                ? 'unknown'
                : schemaToType(defSchema.additionalProperties as SchemaNode, 1, knownRefs);
            propLines.push(`  [key: string]: ${valType};`);
          }

          lines.push(`export interface ${interfaceName} {`);
          lines.push(...propLines);
          lines.push('}');
        } else {
          const tsType = schemaToType(defSchema, 0, knownRefs);
          lines.push(`export type ${interfaceName} = ${tsType};`);
        }
      }
    }

    return { code: lines.join('\n'), error: null };
  } catch (err) {
    return { code: '', error: `Conversion failed: ${(err as Error).message}` };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function JsonSchemaToTs() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const tsOutput = useMemo(() => {
    const r = convertJsonSchemaToTs(debouncedInput);
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
            aria-label="Load example JSON Schema"
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
              <span className="text-sm font-semibold text-slate-300">JSON Schema Input</span>
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
            placeholder='{ "type": "object", "properties": { ... } }'
            spellCheck={false}
            maxLength={MAX_INPUT_LENGTH + 10_000}
            aria-label="JSON Schema input"
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">TypeScript Output</span>
            </div>
            <CopyButton
              text={tsOutput}
              label="Copy TypeScript"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
              aria-label="Copy generated TypeScript to clipboard"
            />
          </div>
          <pre className="flex-1 overflow-auto p-4 bg-[#020617]">
            <code className="text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {tsOutput}
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
