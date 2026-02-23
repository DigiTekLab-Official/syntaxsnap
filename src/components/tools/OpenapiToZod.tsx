// src/components/tools/OpenapiToZod.tsx
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500_000;
const MAX_SCHEMA_DEPTH = 64;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `{
  "openapi": "3.1.0",
  "info": { "title": "Sample API", "version": "1.0.0" },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "required": ["id", "email", "role"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "email": { "type": "string", "format": "email" },
          "name": { "type": "string", "minLength": 1, "maxLength": 100 },
          "age": { "type": "integer", "minimum": 18, "maximum": 120 },
          "role": { "type": "string", "enum": ["ADMIN", "USER", "GUEST"] },
          "tags": { "type": "array", "items": { "type": "string" } },
          "metadata": { "type": "object", "additionalProperties": true }
        }
      },
      "Post": {
        "type": "object",
        "required": ["id", "title", "author"],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "title": { "type": "string", "minLength": 1 },
          "content": { "type": "string", "nullable": true },
          "author": { "$ref": "#/components/schemas/User" },
          "publishedAt": { "type": "string", "format": "date-time" }
        }
      }
    }
  }
}`;

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface OpenAPISchema {
  type?: string;
  format?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: (string | number | boolean)[];
  $ref?: string;
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  nullable?: boolean;
  description?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: unknown;
  additionalProperties?: boolean | OpenAPISchema;
}

interface OpenAPISpec {
  openapi?: string;
  info?: { title?: string; version?: string };
  components?: { schemas?: Record<string, OpenAPISchema> };
}

/** Result of conversion — either success with code, or an error message */
interface ConversionResult {
  code: string;
  error: string | null;
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

function sanitizeSchemaName(name: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)
    ? name
    : name.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^(\d)/, '_$1');
}

function sanitizePropertyKey(key: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

// ─── RECURSIVE SCHEMA MAPPER ────────────────────────────────────────────────

/**
 * Recursively maps an OpenAPI schema node to a Zod expression string.
 *
 * Circular-reference safety:
 * - `ancestorRefs` tracks $ref paths currently on the recursion stack.
 * - When we encounter a $ref we've already entered, emit `z.lazy(() => …Schema)`
 *   instead of recursing, preventing infinite loops.
 * - `depth` counter prevents runaway recursion on deeply nested schemas.
 */
function mapSchemaToZod(
  schema: OpenAPISchema | undefined,
  allSchemas: Record<string, OpenAPISchema>,
  indent = '',
  ancestorRefs = new Set<string>(),
  depth = 0,
): string {
  if (!schema) return 'z.unknown()';
  if (depth > MAX_SCHEMA_DEPTH) return `z.unknown() /* max depth exceeded */`;

  // ── Handle $ref ───────────────────────────────────────────────────────
  if (schema.$ref) {
    const refPath = schema.$ref;
    const schemaName = sanitizeSchemaName(refPath.split('/').pop()!);

    // Circular reference detected — emit z.lazy()
    if (ancestorRefs.has(refPath)) {
      return `z.lazy(() => ${schemaName}Schema)`;
    }

    // If the referenced schema exists, inline-resolve it.
    // Add this ref to ancestor tracking before recursing.
    const resolved = allSchemas[refPath.split('/').pop()!];
    if (resolved) {
      const nextAncestors = new Set(ancestorRefs);
      nextAncestors.add(refPath);
      return mapSchemaToZod(resolved, allSchemas, indent, nextAncestors, depth + 1);
    }

    // Fallback: reference target not found, emit named reference
    return `${schemaName}Schema`;
  }

  // ── Handle allOf (intersection) ───────────────────────────────────────
  if (schema.allOf && schema.allOf.length > 0) {
    const mapped = schema.allOf.map((s) =>
      mapSchemaToZod(s, allSchemas, indent, ancestorRefs, depth + 1),
    );
    if (mapped.length === 1) return mapped[0];
    // A.and(B).and(C) — chain correctly
    return mapped.reduce((acc, cur) => `${acc}.and(${cur})`);
  }

  // ── Handle oneOf / anyOf (unions) ─────────────────────────────────────
  if (schema.oneOf || schema.anyOf) {
    const list = (schema.oneOf || schema.anyOf)!;
    const mapped = list.map((s) =>
      mapSchemaToZod(s, allSchemas, indent, ancestorRefs, depth + 1),
    );
    // z.union requires ≥ 2 members; unwrap if only 1
    if (mapped.length === 0) return 'z.unknown()';
    if (mapped.length === 1) return mapped[0];
    return `z.union([${mapped.join(', ')}])`;
  }

  // ── Handle enums BEFORE type switch ───────────────────────────────────
  // z.enum() only accepts string tuples. Numeric or mixed enums need z.union([z.literal(…)])
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    const allStrings = schema.enum.every((v) => typeof v === 'string');
    if (allStrings) {
      const vals = schema.enum.map((e) => JSON.stringify(e)).join(', ');
      let zodStr = `z.enum([${vals}])`;
      if (schema.nullable) zodStr += '.nullable()';
      return zodStr;
    }
    // Numeric or mixed enums → z.union([z.literal(…), …])
    const literals = schema.enum.map((e) => `z.literal(${JSON.stringify(e)})`);
    let zodStr =
      literals.length === 1 ? literals[0] : `z.union([${literals.join(', ')}])`;
    if (schema.nullable) zodStr += '.nullable()';
    return zodStr;
  }

  const type = schema.type || (schema.properties ? 'object' : undefined);
  let zodStr = 'z.unknown()';

  switch (type) {
    case 'string': {
      zodStr = 'z.string()';
      if (schema.format === 'email') zodStr += '.email()';
      else if (schema.format === 'uuid') zodStr += '.uuid()';
      else if (schema.format === 'date-time') zodStr += '.datetime()';
      else if (schema.format === 'uri' || schema.format === 'url') zodStr += '.url()';
      else if (schema.format === 'ipv4' || schema.format === 'ipv6') zodStr += '.ip()';
      if (schema.minLength !== undefined) zodStr += `.min(${schema.minLength})`;
      if (schema.maxLength !== undefined) zodStr += `.max(${schema.maxLength})`;
      if (schema.pattern) {
        const escaped = schema.pattern.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        zodStr += `.regex(/${escaped}/)`;
      }
      break;
    }

    case 'integer':
      zodStr = 'z.number().int()';
      if (schema.minimum !== undefined) zodStr += `.min(${schema.minimum})`;
      if (schema.maximum !== undefined) zodStr += `.max(${schema.maximum})`;
      break;

    case 'number':
      zodStr = 'z.number()';
      if (schema.minimum !== undefined) zodStr += `.min(${schema.minimum})`;
      if (schema.maximum !== undefined) zodStr += `.max(${schema.maximum})`;
      break;

    case 'boolean':
      zodStr = 'z.boolean()';
      break;

    case 'array': {
      const items = mapSchemaToZod(schema.items, allSchemas, indent, ancestorRefs, depth + 1);
      zodStr = `z.array(${items})`;
      break;
    }

    case 'object': {
      const props = schema.properties || {};
      const requiredKeys = schema.required || [];
      const lines: string[] = [];

      for (const [key, val] of Object.entries(props)) {
        let fieldZod = mapSchemaToZod(val, allSchemas, indent + '  ', ancestorRefs, depth + 1);
        const isRequired = requiredKeys.includes(key);

        if (!isRequired) fieldZod += '.optional()';
        if (val.nullable) fieldZod += '.nullable()';
        if (val.description) {
          const escaped = val.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          fieldZod += `.describe("${escaped}")`;
        }

        lines.push(`${indent}  ${sanitizePropertyKey(key)}: ${fieldZod},`);
      }

      zodStr =
        lines.length === 0
          ? 'z.object({})'
          : `z.object({\n${lines.join('\n')}\n${indent}})`;

      if (schema.additionalProperties === true) {
        zodStr += '.passthrough()';
      } else if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === 'object'
      ) {
        const addSchema = mapSchemaToZod(
          schema.additionalProperties,
          allSchemas,
          indent,
          ancestorRefs,
          depth + 1,
        );
        zodStr += `.catchall(${addSchema})`;
      } else {
        zodStr += '.strict()';
      }
      break;
    }
  }

  if (schema.nullable) zodStr += '.nullable()';

  return zodStr;
}

// ─── CONVERSION FUNCTION ────────────────────────────────────────────────────

/**
 * Returns both the generated code AND a separate error string.
 * This lets the component populate the red alert box for real errors
 * while still returning a clean fallback for the code panel.
 */
function convertOpenAPIToZod(input: string): ConversionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { code: '// Paste an OpenAPI 3.x JSON specification to begin…', error: null };
  }

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return {
      code: '// Input too large — please reduce the size.',
      error: `Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB limit.`,
    };
  }

  let parsedSpec: OpenAPISpec;
  try {
    parsedSpec = JSON.parse(trimmed) as OpenAPISpec;
  } catch (err) {
    return {
      code: '// Invalid JSON — check the syntax and try again.',
      error: `Invalid JSON: ${(err as Error).message}`,
    };
  }

  if (!parsedSpec.components?.schemas) {
    return {
      code: '// No components.schemas found.\n// Expected: { "components": { "schemas": { ... } } }',
      error: 'No components.schemas block found in the provided OpenAPI document.',
    };
  }

  try {
    const schemas = parsedSpec.components.schemas;
    const schemaCount = Object.keys(schemas).length;

    let output = `import { z } from "zod";\n\n`;
    output += `// Generated from OpenAPI ${parsedSpec.openapi || '3.x'}\n`;
    output += `// ${parsedSpec.info?.title || 'API'} v${parsedSpec.info?.version || '1.0.0'}\n\n`;

    for (const [schemaName, schemaDefinition] of Object.entries(schemas)) {
      const safeName = sanitizeSchemaName(schemaName);
      const zodDefinition = mapSchemaToZod(schemaDefinition, schemas);

      output += `export const ${safeName}Schema = ${zodDefinition};\n`;
      output += `export type ${safeName} = z.infer<typeof ${safeName}Schema>;\n\n`;
    }

    output += `// Successfully converted ${schemaCount} schema${schemaCount !== 1 ? 's' : ''}`;
    return { code: output.trim(), error: null };
  } catch (err) {
    return {
      code: '// Conversion failed — see error below.',
      error: `Conversion failed: ${(err as Error).message}`,
    };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function OpenapiToZodTool() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const zodCode = useMemo(() => {
    const result = convertOpenAPIToZod(debouncedInput);
    // Defer error state update to avoid setState-during-render
    queueMicrotask(() => setError(result.error));
    return result.code;
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
            aria-label="Load example OpenAPI specification"
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
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">OpenAPI JSON</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {(input.length / 1_000).toFixed(1)}KB
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-inset"
            placeholder='{ "openapi": "3.1.0", "components": { "schemas": { ... } } }'
            spellCheck={false}
            maxLength={MAX_INPUT_LENGTH + 10_000}
            aria-label="OpenAPI JSON input"
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-sm font-semibold text-slate-300">Zod Schema Output</span>
            </div>
            <CopyButton
              text={zodCode}
              label="Copy"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
            />
          </div>
          <pre className="flex-1 overflow-auto p-4 bg-slate-950/30">
            <code className="text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {zodCode}
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
