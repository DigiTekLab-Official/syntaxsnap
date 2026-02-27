import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500_000;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `type User {
  id: ID!
  name: String!
  email: String
  age: Int
  isActive: Boolean!
  role: Role!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  viewCount: Int
  tags: [String!]
}

input CreateUserInput {
  name: String!
  email: String!
  age: Int
  role: Role
}

enum Role {
  ADMIN
  EDITOR
  VIEWER
}

enum Status {
  DRAFT
  PUBLISHED
  ARCHIVED
}`;

// ─── SCALAR MAP ─────────────────────────────────────────────────────────────

const SCALAR_MAP: Record<string, string> = {
  String: 'z.string()',
  Int: 'z.number()',
  Float: 'z.number()',
  Boolean: 'z.boolean()',
  ID: 'z.string()',
};

// ─── PARSER TYPES ───────────────────────────────────────────────────────────

interface ParsedField {
  name: string;
  typeExpr: string;
}

interface ParsedTypeBlock {
  kind: 'type' | 'input';
  name: string;
  fields: ParsedField[];
}

interface ParsedEnumBlock {
  kind: 'enum';
  name: string;
  values: string[];
}

type ParsedBlock = ParsedTypeBlock | ParsedEnumBlock;

// ─── COMMENT STRIPPING ─────────────────────────────────────────────────────

function stripComments(gql: string): string {
  // Remove triple-quoted docstrings, then single-line # comments
  return gql
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/#[^\n]*/g, '');
}

// ─── RECURSIVE TYPE EXPRESSION PARSER ───────────────────────────────────────

/**
 * Recursively converts a GraphQL type expression to its Zod equivalent.
 *
 * Examples:
 *   String!        → z.string()
 *   String         → z.string().optional()
 *   [String!]!     → z.array(z.string())
 *   [String!]      → z.array(z.string()).optional()
 *   [String]!      → z.array(z.string().optional())
 *   Role!          → RoleSchema
 *   Role           → RoleSchema.optional()
 */
function parseTypeExpr(typeStr: string, knownEnums: Set<string>): string {
  typeStr = typeStr.trim();

  // Check if the outermost level is non-null (required)
  const isRequired = typeStr.endsWith('!');
  if (isRequired) typeStr = typeStr.slice(0, -1);

  let zodType: string;

  if (typeStr.startsWith('[') && typeStr.endsWith(']')) {
    // Array type — recurse on inner type
    const inner = typeStr.slice(1, -1).trim();
    zodType = `z.array(${parseTypeExpr(inner, knownEnums)})`;
  } else if (SCALAR_MAP[typeStr]) {
    // Built-in scalar
    zodType = SCALAR_MAP[typeStr];
  } else if (knownEnums.has(typeStr)) {
    // Known enum reference
    zodType = `${typeStr}Schema`;
  } else {
    // Custom object type reference
    zodType = `${typeStr}Schema`;
  }

  return isRequired ? zodType : `${zodType}.optional()`;
}

// ─── BLOCK EXTRACTOR ────────────────────────────────────────────────────────

/**
 * Extracts top-level type, input, and enum blocks from GraphQL SDL using
 * balanced-brace scanning (not regex-only) to handle nested braces safely.
 */
function extractBlocks(gql: string): ParsedBlock[] {
  const stripped = stripComments(gql);
  const blocks: ParsedBlock[] = [];

  // Match the opening of each block (supports `implements` for types)
  const blockPattern =
    /\b(type|input|enum)\s+(\w+)(?:\s+implements\s+[\w&\s,]+)?\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(stripped)) !== null) {
    const kind = match[1] as 'type' | 'input' | 'enum';
    const name = match[2];
    const openBraceIdx = match.index + match[0].length - 1;

    // Balanced-brace scan to find the closing }
    let depth = 1;
    let pos = openBraceIdx + 1;
    while (pos < stripped.length && depth > 0) {
      if (stripped[pos] === '{') depth++;
      else if (stripped[pos] === '}') depth--;
      pos++;
    }

    const body = stripped.slice(openBraceIdx + 1, pos - 1).trim();

    if (kind === 'enum') {
      const values = body
        .split(/[\n,]+/)
        .map((v) => v.trim())
        .filter((v) => v && !v.startsWith('#'));
      blocks.push({ kind: 'enum', name, values });
    } else {
      // Parse fields for type / input blocks
      const fields: ParsedField[] = [];
      const lines = body.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        // fieldName(args): ReturnType  — arguments discarded
        const fieldMatch = trimmed.match(
          /^(\w+)\s*(?:\([^)]*\)\s*)?:\s*(.+)$/,
        );
        if (fieldMatch) {
          fields.push({
            name: fieldMatch[1],
            typeExpr: fieldMatch[2].trim(),
          });
        }
      }

      blocks.push({ kind, name, fields });
    }
  }

  return blocks;
}

// ─── CODE GENERATOR ─────────────────────────────────────────────────────────

function generateZodSchemas(input: string): {
  code: string;
  error: string | null;
} {
  const trimmed = input.trim();
  if (!trimmed) return { code: '', error: null };

  // Quick validation — must contain at least one definition keyword
  if (!/\b(type|input|enum)\s+\w+/i.test(trimmed)) {
    return {
      code: '',
      error: 'No GraphQL type, input, or enum definitions found.',
    };
  }

  try {
    const blocks = extractBlocks(trimmed);
    if (blocks.length === 0) {
      return { code: '', error: 'Could not parse any GraphQL definitions.' };
    }

    // Collect known enum names so parseTypeExpr can reference them
    const knownEnums = new Set<string>();
    for (const block of blocks) {
      if (block.kind === 'enum') knownEnums.add(block.name);
    }

    const parts: string[] = ["import { z } from 'zod';"];

    // Enums first (they're referenced by types / inputs)
    for (const block of blocks) {
      if (block.kind !== 'enum') continue;
      const enumBlock = block as ParsedEnumBlock;
      const values = enumBlock.values.map((v) => `"${v}"`).join(', ');
      parts.push(
        `\nexport const ${enumBlock.name}Schema = z.enum([${values}]);`,
      );
    }

    // Types and inputs
    for (const block of blocks) {
      if (block.kind === 'enum') continue;
      const typeBlock = block as ParsedTypeBlock;

      const fields = typeBlock.fields.map((f) => {
        const zodExpr = parseTypeExpr(f.typeExpr, knownEnums);
        return `  ${f.name}: ${zodExpr},`;
      });

      parts.push(
        `\nexport const ${typeBlock.name}Schema = z.object({\n${fields.join('\n')}\n});`,
      );
    }

    return { code: parts.join('\n'), error: null };
  } catch (e) {
    return {
      code: '',
      error: `Parse error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function GraphqlToZod() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const zodOutput = useMemo(() => {
    const r = generateZodSchemas(debouncedInput);
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
            className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            aria-label="Load example GraphQL"
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
          <div
            className="flex items-center gap-2 text-xs text-amber-400"
            role="status"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
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
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              <span className="text-sm font-semibold text-slate-300">
                GraphQL Input
              </span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {(input.length / 1_000).toFixed(1)}KB
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-[#020617] text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:ring-inset"
            placeholder="type User { id: ID! name: String! ... }"
            spellCheck={false}
            maxLength={MAX_INPUT_LENGTH + 10_000}
            aria-label="GraphQL input"
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">
                Zod Schema Output
              </span>
            </div>
            <CopyButton
              text={zodOutput}
              label="Copy Zod"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-pink-600 hover:bg-pink-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
            />
          </div>
          <pre className="flex-1 overflow-auto p-4 bg-[#020617]">
            <code className="text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {zodOutput}
            </code>
          </pre>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm"
          role="alert"
        >
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}
    </div>
  );
}
