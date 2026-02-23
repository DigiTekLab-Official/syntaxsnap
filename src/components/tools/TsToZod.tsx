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
  role: "ADMIN" | "USER" | "GUEST";
  tags: string[];
  metadata: Record<string, any>;
  address: {
    street: string;
    city: string;
    zip?: string;
  };
}

type Status = "ACTIVE" | "INACTIVE" | "PENDING";

type Product = {
  productId: string;
  price: number;
  inStock: boolean;
  description?: string;
  categories: string[];
};

interface Post {
  id: number;
  title: string;
  content: string;
  author: User;
  publishedAt: Date | null;
}`;

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface ParsedProperty {
  key: string;
  type: string;
  optional: boolean;
  readonly: boolean;
}

interface ParsedType {
  name: string;
  kind: 'interface' | 'type-object' | 'type-alias';
  properties: ParsedProperty[];
  aliasType?: string;
}

interface ConversionResult {
  code: string;
  error: string | null;
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

/** Split generic arguments at the top-level comma: "string, number" → ["string", "number"] */
function splitGenericArgs(inner: string): [string, string] {
  const parts = smartSplit(inner, ',');
  return [parts[0] ?? '', parts.slice(1).join(', ').trim()];
}

function sanitizeId(n: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(n)
    ? n
    : n.replace(/[^a-zA-Z0-9_$]/g, '_').replace(/^(\d)/, '_$1');
}

function sanitizeKey(k: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
}

// ─── TYPE MAPPER ────────────────────────────────────────────────────────────

function mapTypeToZod(ts: string, known: Set<string>): string {
  const t = ts.trim();

  // Primitives & built-ins
  if (t === 'null') return 'z.null()';
  if (t === 'undefined') return 'z.undefined()';
  if (t === 'any') return 'z.any()';
  if (t === 'unknown') return 'z.unknown()';
  if (t === 'never') return 'z.never()';
  if (t === 'void') return 'z.void()';
  if (t === 'Date') return 'z.date()';
  if (t === 'string') return 'z.string()';
  if (t === 'number') return 'z.number()';
  if (t === 'boolean') return 'z.boolean()';
  if (t === 'bigint') return 'z.bigint()';
  if (t === 'symbol') return 'z.symbol()';

  // Literals (single-value only; strict regex prevents matching "A" | "B" as one literal)
  if (/^"[^"]*"$/.test(t) || /^'[^']*'$/.test(t)) return `z.literal(${t})`;
  if (/^-?\d+(\.\d+)?$/.test(t)) return `z.literal(${t})`;
  if (t === 'true' || t === 'false') return `z.literal(${t})`;

  // Unwrap outer parens: (A | B) → A | B
  if (t.startsWith('(') && t.endsWith(')')) {
    const close = findClosingDelimiter(t, 0);
    if (close === t.length - 1) return mapTypeToZod(t.slice(1, -1), known);
  }

  // Unions (depth-aware split)
  const uParts = smartSplit(t, '|');
  if (uParts.length > 1) {
    const allLit = uParts.every(p => /^["'].*["']$/.test(p.trim()));
    if (allLit) return `z.enum([${uParts.map(p => p.trim()).join(', ')}])`;
    if (uParts.length === 2 && uParts.some(p => p.trim() === 'null')) {
      const nonNull = uParts.find(p => p.trim() !== 'null')!;
      return `${mapTypeToZod(nonNull, known)}.nullable()`;
    }
    const members = uParts.map(p => mapTypeToZod(p.trim(), known));
    return members.length === 1 ? members[0] : `z.union([${members.join(', ')}])`;
  }

  // Intersections (depth-aware split, correct .and() chaining)
  const iParts = smartSplit(t, '&');
  if (iParts.length > 1) {
    return iParts.map(p => mapTypeToZod(p.trim(), known)).reduce((a, b) => `${a}.and(${b})`);
  }

  // Array: T[]
  if (t.endsWith('[]')) return `z.array(${mapTypeToZod(t.slice(0, -2), known)})`;

  // Generic wrappers: Array<T>, Set<T>, Map<K,V>, Record<K,V>, Promise<T>, Partial<T>, etc.
  const genMatch = t.match(/^([A-Za-z_$][A-Za-z0-9_$]*)<(.+)>$/);
  if (genMatch) {
    const [, wrapper, inner] = genMatch;
    if (wrapper === 'Array') return `z.array(${mapTypeToZod(inner, known)})`;
    if (wrapper === 'Set') return `z.set(${mapTypeToZod(inner, known)})`;
    if (wrapper === 'Promise') return `z.promise(${mapTypeToZod(inner, known)})`;
    if (wrapper === 'Map') {
      const [k, v] = splitGenericArgs(inner);
      return `z.map(${mapTypeToZod(k, known)}, ${mapTypeToZod(v, known)})`;
    }
    if (wrapper === 'Record') {
      const [, v] = splitGenericArgs(inner);
      return `z.record(${mapTypeToZod(v, known)})`;
    }
    if (wrapper === 'Partial' && known.has(inner.trim()))
      return `${sanitizeId(inner.trim())}Schema.partial()`;
    if (wrapper === 'Required' && known.has(inner.trim()))
      return `${sanitizeId(inner.trim())}Schema.required()`;
    if (wrapper === 'Pick') {
      const [base, keys] = splitGenericArgs(inner);
      if (known.has(base.trim())) {
        const kl = smartSplit(keys, '|').map(k => k.trim().replace(/^["']|["']$/g, ''));
        return `${sanitizeId(base.trim())}Schema.pick({ ${kl.map(k => `${k}: true`).join(', ')} })`;
      }
    }
    if (wrapper === 'Omit') {
      const [base, keys] = splitGenericArgs(inner);
      if (known.has(base.trim())) {
        const kl = smartSplit(keys, '|').map(k => k.trim().replace(/^["']|["']$/g, ''));
        return `${sanitizeId(base.trim())}Schema.omit({ ${kl.map(k => `${k}: true`).join(', ')} })`;
      }
    }
  }

  // Tuple: [A, B, C]
  if (t.startsWith('[') && t.endsWith(']')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return 'z.tuple([])';
    return `z.tuple([${smartSplit(inner, ',').map(m => mapTypeToZod(m.trim(), known)).join(', ')}])`;
  }

  // Inline object: { key: Type; ... }
  if (t.startsWith('{') && t.endsWith('}')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return 'z.object({})';
    const ps = parseProperties(inner);
    if (ps.length === 0) return 'z.object({})';
    const fields = ps.map(p => {
      let zod = mapTypeToZod(p.type, known);
      if (p.optional) zod += '.optional()';
      return `${sanitizeKey(p.key)}: ${zod}`;
    });
    return `z.object({ ${fields.join(', ')} })`;
  }

  // Known type reference
  if (known.has(t)) return `${sanitizeId(t)}Schema`;

  return 'z.unknown()';
}

// ─── MULTI-PASS PARSER ──────────────────────────────────────────────────────

/**
 * Find the end of a type alias body (everything after `type X = `).
 * Terminates on `;` at depth 0, or a newline followed by a new declaration.
 */
function findAliasEnd(src: string, start: number): number {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === '`') { i = skipString(src, i); continue; }
    if (ch === '>' && i > 0 && src[i - 1] === '=') continue;
    if (OPENERS.has(ch)) depth++;
    if (ch === '}' || ch === ')' || ch === ']' || ch === '>') depth--;
    if (ch === ';' && depth === 0) return i;
    if (ch === '\n' && depth === 0) {
      const rest = src.slice(i + 1).trimStart();
      if (/^(?:export\s+)?(?:interface|type|enum|const|class|function)\s/.test(rest)) return i;
    }
  }
  return src.length;
}

/** Extract all interface / type declarations via multi-pass brace-depth tokenizer. */
function parseTypeScriptCode(code: string): ParsedType[] {
  const types: ParsedType[] = [];
  const declRe = /(?:export\s+)?(?:(interface)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s+extends\s+[a-zA-Z0-9_$,\s<>]+)?\s*\{|(type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*)/g;

  let m: RegExpExecArray | null;
  while ((m = declRe.exec(code)) !== null) {
    const isInterface = m[1] === 'interface';
    const name = isInterface ? m[2] : m[4];
    const matchEnd = m.index + m[0].length;

    if (isInterface) {
      const braceOpen = matchEnd - 1;
      const braceClose = findClosingDelimiter(code, braceOpen);
      if (braceClose === -1) continue;
      types.push({ name, kind: 'interface', properties: parseProperties(code.slice(braceOpen + 1, braceClose)) });
      declRe.lastIndex = braceClose + 1;
    } else {
      const rest = code.slice(matchEnd).trimStart();
      if (rest.startsWith('{')) {
        const braceOpen = code.indexOf('{', matchEnd);
        const braceClose = findClosingDelimiter(code, braceOpen);
        if (braceClose === -1) continue;
        types.push({ name, kind: 'type-object', properties: parseProperties(code.slice(braceOpen + 1, braceClose)) });
        declRe.lastIndex = braceClose + 1;
      } else {
        const aliasEnd = findAliasEnd(code, matchEnd);
        const body = code.slice(matchEnd, aliasEnd).trim();
        if (body) types.push({ name, kind: 'type-alias', properties: [], aliasType: body });
        declRe.lastIndex = aliasEnd + 1;
      }
    }
  }
  return types;
}

/** Depth-aware property splitter: splits on `;` or `\n` only at depth 0. */
function depthAwareSplit(body: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(body, i);
      cur += body.slice(i, end + 1);
      i = end;
      continue;
    }
    if (ch === '>' && i > 0 && body[i - 1] === '=') { cur += ch; continue; }
    if (OPENERS.has(ch)) depth++;
    if (ch === '}' || ch === ')' || ch === ']' || ch === '>') depth--;
    if (depth === 0 && (ch === ';' || ch === '\n')) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function parseProperties(body: string): ParsedProperty[] {
  const props: ParsedProperty[] = [];
  for (const line of depthAwareSplit(body)) {
    if (line.startsWith('//') || line.startsWith('/*')) continue;
    const pm = line.match(/^(readonly\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)(\?)?:\s*(.+)$/s);
    if (!pm) continue;
    props.push({
      key: pm[2],
      type: pm[4].replace(/[,;]\s*$/, '').trim(),
      optional: !!pm[3],
      readonly: !!pm[1],
    });
  }
  return props;
}

// ─── CONVERTER ──────────────────────────────────────────────────────────────

function convertToZod(input: string): ConversionResult {
  const trimmed = input.trim();
  if (!trimmed) return { code: '// 📝 Paste your TypeScript interfaces or types here…', error: null };

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { code: '', error: `Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)}KB limit.` };
  }

  try {
    const parsed = parseTypeScriptCode(trimmed);

    if (parsed.length === 0) {
      return {
        code: '// ⚠️  No valid TypeScript interfaces or types detected.\n// Expected format:\n//   interface User { name: string; }\n//   type Product = { id: number; }\n//   type Status = "ACTIVE" | "INACTIVE";',
        error: null,
      };
    }

    const known = new Set(parsed.map(t => t.name));
    const lines: string[] = [
      'import { z } from "zod";',
      '',
      '// Generated from TypeScript definitions',
      `// Total types converted: ${parsed.length}`,
      '',
    ];

    for (const type of parsed) {
      const safe = sanitizeId(type.name);

      if (type.kind === 'type-alias' && type.aliasType) {
        lines.push(`export const ${safe}Schema = ${mapTypeToZod(type.aliasType, known)};`);
      } else {
        const fields = type.properties.map(p => {
          let zod = mapTypeToZod(p.type, known);
          if (p.optional) zod += '.optional()';
          return `  ${sanitizeKey(p.key)}: ${zod},`;
        });
        lines.push(
          fields.length === 0
            ? `export const ${safe}Schema = z.object({});`
            : `export const ${safe}Schema = z.object({\n${fields.join('\n')}\n});`,
        );
      }
      lines.push(`export type ${safe} = z.infer<typeof ${safe}Schema>;`);
      lines.push('');
    }

    lines.push(`// ✅ Successfully converted ${parsed.length} type${parsed.length !== 1 ? 's' : ''}`);
    return { code: lines.join('\n'), error: null };
  } catch (err) {
    return { code: '', error: `Conversion failed: ${(err as Error).message}` };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function TsToZodTool() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const zodCode = useMemo(() => {
    const r = convertToZod(debouncedInput);
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
            className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
            placeholder='interface User { id: string; name: string; }'
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
              <span className="text-sm font-semibold text-slate-300">Zod Schema Output</span>
            </div>
            <CopyButton
              text={zodCode}
              label="Copy"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
              aria-label="Copy generated Zod schema to clipboard"
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