// src/components/tools/TrpcToOpenapi.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 300_000;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `import { z } from "zod";
import { router, publicProcedure } from "./trpc";

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { user: ctx.user } });
});

const protectedProcedure = publicProcedure.use(isAuthed);

export const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      return { id: input.id, name: "Alice" };
    }),

  listUsers: publicProcedure
    .query(() => {
      return [{ id: "1", name: "Alice" }];
    }),

  createUser: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
      age: z.number().int().min(18).optional(),
    }))
    .mutation(({ input }) => {
      return { id: "new-id", ...input };
    }),

  deleteUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return { success: true };
    }),
});`;

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ParsedProcedure {
  name: string;
  method: 'query' | 'mutation';
  inputZodRaw: string | null;
}

interface OpenApiProperty {
  type: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: OpenApiProperty;
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
  enum?: string[];
}

interface OpenApiSchema {
  type: string;
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
}

// ─── BALANCED-DELIMITER EXTRACTION ───────────────────────────────────────────

/**
 * Starting at `startIdx` (which should point to an opening delimiter),
 * return the index of the matching closing delimiter, respecting nesting
 * and string literals. Returns -1 if unbalanced.
 */
function findClosingDelimiter(
  src: string,
  startIdx: number,
  open: string,
  close: string,
): number {
  let depth = 0;
  let inString: string | null = null;
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    const prev = i > 0 ? src[i - 1] : '';
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inString === ch) inString = null;
      else if (!inString) inString = ch;
    }
    if (inString) continue;
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// ─── ROUTER PARSER (MULTI-PASS) ─────────────────────────────────────────────

/**
 * Pass 1 — Extract the router({ ... }) body using balanced-brace tracking.
 * Pass 2 — Split into top-level procedure chunks by tracking comma depth.
 * Pass 3 — For each chunk, locate .query / .mutation and .input().
 *
 * This handles:
 * - Middleware chains: publicProcedure.use(isAuthed).input(...).query(...)
 * - Procedures without .input(): publicProcedure.query(...)
 * - Multi-line Zod schemas with nested objects/arrays
 */
function parseProcedures(source: string): ParsedProcedure[] {
  // ── Pass 1: Find router({ ... }) body ─────────────────────────────────
  const routerIdx = source.indexOf('router({');
  if (routerIdx === -1) return [];

  const braceStart = source.indexOf('{', routerIdx + 'router('.length);
  if (braceStart === -1) return [];

  const braceEnd = findClosingDelimiter(source, braceStart, '{', '}');
  if (braceEnd === -1) return [];

  const routerBody = source.slice(braceStart + 1, braceEnd);

  // ── Pass 2: Split into top-level procedure chunks by commas ───────────
  const chunks: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString: string | null = null;

  for (let i = 0; i < routerBody.length; i++) {
    const ch = routerBody[i];
    const prev = i > 0 ? routerBody[i - 1] : '';

    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inString === ch) inString = null;
      else if (!inString) inString = ch;
    }

    if (!inString) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      else if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (
        ch === ',' &&
        parenDepth === 0 &&
        braceDepth === 0 &&
        bracketDepth === 0
      ) {
        if (current.trim()) chunks.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) chunks.push(current.trim());

  // ── Pass 3: Extract name, method, and input from each chunk ───────────
  const procedures: ParsedProcedure[] = [];

  for (const chunk of chunks) {
    // Procedure name is the key before the first `:`
    const nameMatch = chunk.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    // Determine HTTP method: last .query() or .mutation() in the chain
    const isQuery = /\.query\s*\(/.test(chunk);
    const isMutation = /\.mutation\s*\(/.test(chunk);
    if (!isQuery && !isMutation) continue;
    const method: 'query' | 'mutation' = isMutation ? 'mutation' : 'query';

    // Extract .input(...) argument using balanced-paren tracking
    let inputZodRaw: string | null = null;
    const inputIdx = chunk.indexOf('.input(');
    if (inputIdx !== -1) {
      const parenStart = chunk.indexOf('(', inputIdx);
      if (parenStart !== -1) {
        const parenEnd = findClosingDelimiter(chunk, parenStart, '(', ')');
        if (parenEnd !== -1) {
          inputZodRaw = chunk.slice(parenStart + 1, parenEnd).trim();
        }
      }
    }

    procedures.push({ name, method, inputZodRaw });
  }

  return procedures;
}

// ─── ZOD → OPENAPI SCHEMA MAPPER ────────────────────────────────────────────

/**
 * Convert a raw Zod chain string (e.g. "z.string().email().max(50)")
 * into an OpenAPI property object.
 */
function zodChainToProperty(chain: string): OpenApiProperty {
  const typeMatch = chain.match(/^z\.([a-zA-Z]+)/);
  const base = typeMatch?.[1] ?? 'unknown';

  switch (base) {
    case 'string': {
      const prop: OpenApiProperty = { type: 'string' };
      if (/\.email\(\)/.test(chain)) prop.format = 'email';
      if (/\.url\(\)/.test(chain)) prop.format = 'uri';
      if (/\.uuid\(\)/.test(chain)) prop.format = 'uuid';
      if (/\.datetime\(\)/.test(chain)) prop.format = 'date-time';
      if (/\.ip\(\)/.test(chain)) prop.format = 'ipv4';
      const minMatch = chain.match(/\.min\((\d+)\)/);
      if (minMatch) prop.minLength = Number(minMatch[1]);
      const maxMatch = chain.match(/\.max\((\d+)\)/);
      if (maxMatch) prop.maxLength = Number(maxMatch[1]);
      return prop;
    }
    case 'number': {
      const prop: OpenApiProperty = {
        type: /\.int\(\)/.test(chain) ? 'integer' : 'number',
      };
      const minMatch = chain.match(/\.min\((\d+)\)/);
      if (minMatch) prop.minimum = Number(minMatch[1]);
      const maxMatch = chain.match(/\.max\((\d+)\)/);
      if (maxMatch) prop.maximum = Number(maxMatch[1]);
      return prop;
    }
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date-time' };
    case 'enum': {
      const enumMatch = chain.match(/z\.enum\(\[([^\]]*)\]\)/);
      if (enumMatch) {
        const values = enumMatch[1]
          .split(',')
          .map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
        return { type: 'string', enum: values };
      }
      return { type: 'string' };
    }
    case 'literal': {
      const litMatch = chain.match(/z\.literal\(([^)]+)\)/);
      const val = litMatch?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? '';
      return { type: 'string', enum: [val] };
    }
    case 'array': {
      // Extract the inner type: z.array(z.string()) -> z.string()
      const innerStart = chain.indexOf('(', 7); // after "z.array"
      if (innerStart !== -1) {
        const innerEnd = findClosingDelimiter(chain, innerStart, '(', ')');
        if (innerEnd !== -1) {
          const inner = chain.slice(innerStart + 1, innerEnd).trim();
          return { type: 'array', items: zodChainToProperty(inner) };
        }
      }
      return { type: 'array', items: { type: 'string' } };
    }
    case 'object':
      return zodObjectToSchema(chain) as OpenApiProperty;
    case 'any':
    case 'unknown':
      return { type: 'object' };
    default:
      return { type: 'string' };
  }
}

/**
 * Convert a z.object({ ... }) string into an OpenAPI schema with
 * typed properties and a required array.
 */
function zodObjectToSchema(zodStr: string): OpenApiSchema {
  const schema: OpenApiSchema = { type: 'object' };

  const braceStart = zodStr.indexOf('{');
  if (braceStart === -1) return schema;

  const braceEnd = findClosingDelimiter(zodStr, braceStart, '{', '}');
  if (braceEnd === -1) return schema;

  const inner = zodStr.slice(braceStart + 1, braceEnd);

  // Split fields on top-level commas
  const fields: string[] = [];
  let cur = '';
  let pD = 0, bD = 0, brD = 0;
  let inStr: string | null = null;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = i > 0 ? inner[i - 1] : '';
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (inStr === ch) inStr = null;
      else if (!inStr) inStr = ch;
    }
    if (!inStr) {
      if (ch === '(') pD++;
      else if (ch === ')') pD--;
      else if (ch === '{') bD++;
      else if (ch === '}') bD--;
      else if (ch === '[') brD++;
      else if (ch === ']') brD--;
      else if (ch === ',' && pD === 0 && bD === 0 && brD === 0) {
        if (cur.trim()) fields.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) fields.push(cur.trim());

  const properties: Record<string, OpenApiProperty> = {};
  const required: string[] = [];

  for (const field of fields) {
    const keyMatch = field.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*z\./);
    if (!keyMatch) continue;
    const key = keyMatch[1];
    const chain = field.slice(field.indexOf('z.', keyMatch[0].length - 2));

    const isOptional = /\.optional\(\)/.test(chain) || /\.nullable\(\)/.test(chain);
    if (!isOptional) required.push(key);

    properties[key] = zodChainToProperty(chain);
  }

  schema.properties = properties;
  if (required.length > 0) schema.required = required;
  return schema;
}

// ─── OPENAPI SPEC BUILDER ────────────────────────────────────────────────────

interface OpenApiPath {
  summary: string;
  operationId: string;
  tags: string[];
  requestBody?: {
    required: boolean;
    content: { 'application/json': { schema: OpenApiSchema } };
  };
  parameters?: Array<{
    name: string;
    in: string;
    required: boolean;
    schema: OpenApiSchema | OpenApiProperty;
    style?: string;
    explode?: boolean;
  }>;
  responses: Record<string, { description: string }>;
}

function buildOpenApiSpec(
  procedures: ParsedProcedure[],
): Record<string, unknown> {
  const paths: Record<string, Record<string, OpenApiPath>> = {};

  for (const proc of procedures) {
    const httpMethod = proc.method === 'query' ? 'get' : 'post';
    const path = `/trpc/${proc.name}`;

    const inputSchema: OpenApiSchema | null =
      proc.inputZodRaw ? zodObjectToSchema(proc.inputZodRaw) : null;

    const operation: OpenApiPath = {
      summary: formatProcedureName(proc.name),
      operationId: proc.name,
      tags: [proc.method === 'query' ? 'Queries' : 'Mutations'],
      responses: {
        '200': { description: 'Successful response' },
        '400': { description: 'Invalid input' },
      },
    };

    if (httpMethod === 'post' && inputSchema) {
      operation.requestBody = {
        required: true,
        content: { 'application/json': { schema: inputSchema } },
      };
    } else if (httpMethod === 'get' && inputSchema) {
      operation.parameters = [
        {
          name: 'input',
          in: 'query',
          required: true,
          schema: inputSchema,
          style: 'deepObject',
          explode: true,
        },
      ];
    }

    paths[path] = { [httpMethod]: operation };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'tRPC Converted API',
      version: '1.0.0',
      description: 'Auto-generated from tRPC router definition.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local dev server' }],
    tags: [
      { name: 'Queries', description: 'Read operations (HTTP GET)' },
      { name: 'Mutations', description: 'Write operations (HTTP POST)' },
    ],
    paths,
  };
}

/** Convert camelCase procedure names to human-readable summaries */
function formatProcedureName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function TrpcToOpenapiTool() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const openApiOutput = useMemo(() => {
    const trimmed = debouncedInput.trim();
    if (!trimmed) return '// Paste your tRPC router code to begin…';

    if (trimmed.length > MAX_INPUT_LENGTH) {
      return `// Error: Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB. Please reduce the size.`;
    }

    if (!trimmed.includes('router(')) {
      return '// Could not detect a tRPC router definition.\n// Make sure your code contains: router({ ... })';
    }

    try {
      const procedures = parseProcedures(trimmed);

      if (procedures.length === 0) {
        return '// No procedures found inside router({ ... }).\n// Ensure your routes end with .query() or .mutation()';
      }

      return JSON.stringify(buildOpenApiSpec(procedures), null, 2);
    } catch (err) {
      return `// Conversion error: ${(err as Error).message}`;
    }
  }, [debouncedInput]);

  return (
    <div ref={rootRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
      {/* Input Panel */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">tRPC Router Input</span>
          {input.length > MAX_INPUT_LENGTH * 0.8 && (
            <span className="text-xs text-amber-400" role="status">
              {(input.length / 1_000).toFixed(0)} / {(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB
            </span>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste your tRPC router here…"
          aria-label="tRPC router input"
          spellCheck={false}
          maxLength={MAX_INPUT_LENGTH + 1_000}
        />
      </div>

      {/* Output Panel */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">OpenAPI 3.1.0 JSON</span>
          <CopyButton
            text={openApiOutput}
            label="Copy JSON"
            copiedLabel="Copied!"
            variant="primary"
            size="sm"
            className="bg-blue-500 text-white hover:bg-blue-400 font-bold rounded-lg"
          />
        </div>
        <pre className="flex-1 overflow-auto p-4">
          <code className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{openApiOutput}</code>
        </pre>
      </div>
    </div>
  );
}