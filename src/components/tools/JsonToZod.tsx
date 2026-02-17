'use client';
import React, { useState, useEffect, useCallback } from 'react';

// ─── Type inference ───────────────────────────────────────────────────────────

/**
 * Recursively infer a Zod schema string from any JSON-deserialized value.
 * The `depth` guard prevents stack-overflows on pathologically deep inputs.
 */
function inferZodType(value: unknown, depth = 0): string {
  if (depth > 30) return 'z.any()';

  if (value === null) return 'z.null()';
  if (value === undefined) return 'z.undefined()';

  switch (typeof value) {
    case 'string':  return 'z.string()';
    case 'number':  return Number.isInteger(value) ? 'z.number().int()' : 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'bigint':  return 'z.bigint()';
    default:        break;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'z.array(z.unknown())';

    // Collect unique types across all items and union them if they differ
    const itemTypes = [...new Set(value.map((item) => inferZodType(item, depth + 1)))];
    const inner =
      itemTypes.length === 1
        ? itemTypes[0]
        : `z.union([${itemTypes.join(', ')}])`;

    return `z.array(${inner})`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);

    if (entries.length === 0) return 'z.object({})';

    const indent = '  '.repeat(depth + 1);
    const closing = '  '.repeat(depth);

    const fields = entries.map(([key, val]) => {
      // Quote keys that aren't valid JS identifiers
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
      return `${indent}${safeKey}: ${inferZodType(val, depth + 1)}`;
    });

    return `z.object({\n${fields.join(',\n')}\n${closing}})`;
  }

  return 'z.any()';
}

function buildSchema(input: string): { schema: string; error: string | null } {
  if (!input.trim()) return { schema: '', error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(input);
  } catch {
    return { schema: '', error: 'Invalid JSON — check for missing quotes or trailing commas.' };
  }

  const body = inferZodType(parsed);
  const schema = `import { z } from "zod";\n\nconst Schema = ${body};\n\ntype Schema = z.infer<typeof Schema>;`;

  return { schema, error: null };
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('err');
    } finally {
      setTimeout(() => setState('idle'), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={copy}
      disabled={disabled || !text}
      aria-label="Copy Zod schema to clipboard"
      className="text-xs flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      {state === 'ok' ? '✓ Copied!' : state === 'err' ? '✗ Failed' : 'Copy Code'}
    </button>
  );
}

// ─── Default sample ───────────────────────────────────────────────────────────
const DEFAULT_INPUT = `{
  "userId": 1,
  "username": "ameer_dev",
  "isAdmin": true,
  "score": 98.6,
  "roles": ["admin", "editor"],
  "address": {
    "street": "123 Main St",
    "zip": "10001"
  },
  "metadata": null
}`;

// ─── Main component ───────────────────────────────────────────────────────────
export default function JsonToZod() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { schema, error } = buildSchema(input);
    setOutput(schema);
    setError(error);
  }, [input]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '520px' }}>

      {/* ── JSON Input ───────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center min-h-[48px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Input — JSON
          </span>
          {error && (
            <span
              role="alert"
              aria-live="polite"
              className="text-xs text-red-400 font-mono bg-red-900/20 border border-red-800/40 px-2 py-1 rounded"
            >
              {error}
            </span>
          )}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="JSON input"
          placeholder="Paste your JSON here…"
          className="flex-1 bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed min-h-[460px]"
        />
      </div>

      {/* ── Zod Output ──────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center min-h-[48px]">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            Output — Zod Schema
          </span>
          <CopyButton text={output} disabled={!!error || !output} />
        </div>

        <pre
          aria-label="Generated Zod schema"
          aria-live="polite"
          className="flex-1 p-4 font-mono text-sm text-blue-300 overflow-auto whitespace-pre leading-relaxed"
        >
          {output
            ? output
            : <span className="text-slate-600">{`// Paste valid JSON on the left to generate a schema…`}</span>
          }
        </pre>
      </div>

    </div>
  );
}