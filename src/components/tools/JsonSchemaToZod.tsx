import React, { useState, useMemo, useEffect, useRef } from 'react';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum input size in characters to prevent browser tab DoS */
const MAX_INPUT_LENGTH = 500_000; // ~500 KB
/** Maximum JSON nesting depth to prevent stack overflow in the converter */
const MAX_NESTING_DEPTH = 64;
/** Debounce delay (ms) — balances responsiveness with conversion cost */
const DEBOUNCE_MS = 300;

const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer", "minimum": 0 }
  },
  "required": ["name"]
}`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Cheap depth check — walks the parsed JSON tree iteratively to avoid
 * a recursive stack-overflow when measuring depth itself.
 */
function measureDepth(obj: unknown, limit: number): boolean {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: obj, depth: 0 }];

  while (stack.length > 0) {
    const { value, depth } = stack.pop()!;
    if (depth > limit) return false; // exceeds
    if (value !== null && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        stack.push({ value: v, depth: depth + 1 });
      }
    }
  }
  return true; // within limit
}

/**
 * Lightweight heuristic: does this look like a JSON Schema?
 * Avoids confusing output when someone pastes a package.json.
 */
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

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function JsonSchemaToZodTool() {
  const [input, setInput] = useState(DEFAULT_SCHEMA);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  // Hydration signal for E2E tests — set after React mounts on the client
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  // ── Conversion (runs on the debounced value only) ────────────────────────

  const zodCode = useMemo(() => {
    const trimmed = debouncedInput.trim();
    if (!trimmed) return '// Paste a JSON Schema to begin…';

    // Guard: input size
    if (trimmed.length > MAX_INPUT_LENGTH) {
      return `// Error: Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB limit. Please reduce the schema size.`;
    }

    let schema: unknown;
    try {
      schema = JSON.parse(trimmed);
    } catch {
      return '// Invalid JSON — check for syntax errors above.';
    }

    // Guard: schema shape
    if (!looksLikeJsonSchema(schema)) {
      return '// This doesn\u2019t appear to be a JSON Schema.\n// Expected top-level "type", "properties", "$ref", etc.';
    }

    // Guard: nesting depth
    if (!measureDepth(schema, MAX_NESTING_DEPTH)) {
      return `// Error: Schema nesting exceeds ${MAX_NESTING_DEPTH} levels.\n// Flatten or split your schema to convert it safely.`;
    }

    try {
      return jsonSchemaToZod(schema as Record<string, unknown>);
    } catch (err) {
      // Intentionally vague — don't leak internal library stack traces
      const brief = err instanceof Error ? err.message.slice(0, 120) : 'Unknown error';
      return `// Conversion failed: ${brief}`;
    }
  }, [debouncedInput]);

  return (
    <div ref={rootRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-150">
      {/* ── Input Panel ──────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">JSON Schema Input</span>
          {input.length > MAX_INPUT_LENGTH * 0.8 && (
            <span className="text-xs text-amber-400" role="status">
              {(input.length / 1_000).toFixed(0)} / {(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB
            </span>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="Paste your JSON Schema here…"
          aria-label="JSON Schema input"
          spellCheck={false}
          maxLength={MAX_INPUT_LENGTH + 1_000} // soft limit with headroom
        />
      </div>

      {/* ── Output Panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">Zod Schema Output</span>
          <CopyButton
            text={zodCode}
            label="Copy Zod"
            copiedLabel="Copied!"
            variant="primary"
            size="sm"
            className="bg-orange-500 text-white hover:bg-orange-400 font-bold rounded-lg"
          />
        </div>
        <pre className="flex-1 overflow-auto p-4">
          <code className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{zodCode}</code>
        </pre>
      </div>
    </div>
  );
}