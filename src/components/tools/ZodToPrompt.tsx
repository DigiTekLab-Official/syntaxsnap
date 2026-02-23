// src/components/tools/ZodToPrompt.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum input size to prevent main-thread lockup */
const MAX_INPUT_LENGTH = 200_000;
/** Debounce delay (ms) */
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `const UserSchema = z.object({
  fullName: z.string().min(1).max(100).describe("The user's first and last name"),
  email: z.string().email().describe("A valid email address"),
  age: z.number().int().min(18).max(150).describe("Must be at least 18 years old"),
  role: z.enum(["ADMIN", "USER", "MODERATOR"]).describe("The user's access level"),
  bio: z.string().max(500).optional().describe("A short biography"),
  isActive: z.boolean().optional(),
  tags: z.array(z.string()).describe("List of interest tags"),
});`;

// ─── PARSER ──────────────────────────────────────────────────────────────────

interface ParsedField {
  key: string;
  type: string;
  constraints: string[];
  description: string;
  required: boolean;
}

/**
 * Multi-pass field parser.
 * Pass 1: Extract top-level key-value pairs from the z.object({ ... }) block
 *         using brace-depth tracking (not regex on braces).
 * Pass 2: For each field's chain, extract type, constraints, and .describe().
 *
 * This avoids the single-regex fragility of the original approach while
 * staying 100% client-side with zero AST dependencies.
 */
function parseZodFields(source: string): ParsedField[] {
  // ── Pass 1: Find the z.object({ ... }) block and split into field chunks ──
  const objectStart = source.indexOf('z.object({');
  if (objectStart === -1) return [];

  // Walk from the opening `{` after z.object(, tracking brace depth
  const braceStart = source.indexOf('{', objectStart + 'z.object('.length);
  if (braceStart === -1) return [];

  let depth = 0;
  let braceEnd = -1;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) { braceEnd = i; break; }
    }
  }
  if (braceEnd === -1) return [];

  const innerBlock = source.slice(braceStart + 1, braceEnd);

  // Split on top-level commas (depth 0 relative to inner braces/parens)
  const fieldChunks: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inString: string | null = null;

  for (let i = 0; i < innerBlock.length; i++) {
    const ch = innerBlock[i];
    const prev = i > 0 ? innerBlock[i - 1] : '';

    // Track string boundaries (skip escaped quotes)
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
      else if (ch === ',' && parenDepth === 0 && braceDepth === 0 && bracketDepth === 0) {
        fieldChunks.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) fieldChunks.push(current.trim());

  // ── Pass 2: Parse each field chunk ──────────────────────────────────────
  const fields: ParsedField[] = [];

  for (const chunk of fieldChunks) {
    // Extract key: z.___
    const keyMatch = chunk.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*z\./);
    if (!keyMatch) continue;

    const key = keyMatch[1];
    const chain = chunk.slice(keyMatch[0].length - 2); // keep "z." prefix

    // Extract base type: z.string, z.number, z.boolean, z.enum, z.array, z.object, z.literal, z.union, z.date, z.any, z.unknown, z.record
    const typeMatch = chain.match(/^z\.([a-zA-Z]+)/);
    if (!typeMatch) continue;
    const baseType = typeMatch[1];

    // Special handling: z.enum(["A", "B"]) — extract values
    let typeDisplay = baseType;
    if (baseType === 'enum') {
      const enumMatch = chain.match(/z\.enum\(\[([^\]]*)\]\)/);
      if (enumMatch) {
        typeDisplay = `enum [${enumMatch[1].replace(/"/g, '').replace(/'/g, '')}]`;
      }
    } else if (baseType === 'literal') {
      const litMatch = chain.match(/z\.literal\(([^)]+)\)/);
      if (litMatch) typeDisplay = `literal ${litMatch[1]}`;
    } else if (baseType === 'array') {
      const innerTypeMatch = chain.match(/z\.array\(z\.([a-zA-Z]+)/);
      if (innerTypeMatch) typeDisplay = `array of ${innerTypeMatch[1]}`;
      else typeDisplay = 'array';
    } else if (baseType === 'object') {
      typeDisplay = 'nested object';
    } else if (baseType === 'union') {
      typeDisplay = 'union';
    } else if (baseType === 'record') {
      typeDisplay = 'record (key-value map)';
    }

    // Extract constraints from chained methods
    const constraints: string[] = [];
    const constraintPatterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
      [/\.min\((\d+)\)/, (m) => `min: ${m[1]}`],
      [/\.max\((\d+)\)/, (m) => `max: ${m[1]}`],
      [/\.length\((\d+)\)/, (m) => `exact length: ${m[1]}`],
      [/\.email\(\)/, () => 'must be a valid email'],
      [/\.url\(\)/, () => 'must be a valid URL'],
      [/\.uuid\(\)/, () => 'must be a valid UUID'],
      [/\.cuid\(\)/, () => 'must be a valid CUID'],
      [/\.regex\(([^)]+)\)/, (m) => `pattern: ${m[1]}`],
      [/\.int\(\)/, () => 'must be an integer'],
      [/\.positive\(\)/, () => 'must be positive'],
      [/\.negative\(\)/, () => 'must be negative'],
      [/\.nonnegative\(\)/, () => 'must be non-negative'],
      [/\.finite\(\)/, () => 'must be finite'],
      [/\.nonempty\(\)/, () => 'must not be empty'],
      [/\.trim\(\)/, () => 'whitespace trimmed'],
      [/\.toLowerCase\(\)/, () => 'lowercase'],
      [/\.toUpperCase\(\)/, () => 'uppercase'],
      [/\.startsWith\(['"]([^'"]+)['"]\)/, (m) => `starts with "${m[1]}"`],
      [/\.endsWith\(['"]([^'"]+)['"]\)/, (m) => `ends with "${m[1]}"`],
      [/\.includes\(['"]([^'"]+)['"]\)/, (m) => `contains "${m[1]}"`],
      [/\.datetime\(\)/, () => 'ISO 8601 datetime'],
      [/\.ip\(\)/, () => 'must be a valid IP address'],
      [/\.default\(([^)]+)\)/, (m) => `default: ${m[1]}`],
      [/\.nullable\(\)/, () => 'nullable'],
    ];

    for (const [pattern, formatter] of constraintPatterns) {
      const m = chain.match(pattern);
      if (m) constraints.push(formatter(m));
    }

    // Extract .describe() — supports single quotes, double quotes, and backticks
    let description = 'No description provided.';
    const descMatch = chain.match(/\.describe\((['"`])([\s\S]*?)\1\)/);
    if (descMatch) description = descMatch[2];

    // Check optional
    const isOptional = /\.optional\(\)/.test(chain) || /\.nullable\(\)/.test(chain);

    fields.push({
      key,
      type: typeDisplay,
      constraints,
      description,
      required: !isOptional,
    });
  }

  return fields;
}

/**
 * Generate a 2026-standard XML-tagged system prompt.
 * Models (Claude 3.5+, Gemini 2.0+, GPT-4o) achieve measurably higher
 * instruction-following rates with XML section markers vs flat markdown.
 */
function generatePrompt(fields: ParsedField[]): string {
  const schemaLines = fields.map((f) => {
    const req = f.required ? 'REQUIRED' : 'OPTIONAL';
    const constraintStr = f.constraints.length > 0
      ? ` | Constraints: ${f.constraints.join(', ')}`
      : '';
    return `  - "${f.key}": [${f.type}] (${req}) — ${f.description}${constraintStr}`;
  });

  const exampleObj: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.type.startsWith('enum')) {
      const first = f.type.match(/\[([^\]]*)\]/)?.[1]?.split(',')[0]?.trim();
      exampleObj[f.key] = first || 'VALUE';
    } else if (f.type === 'string' || f.type === 'nested object' || f.type === 'record (key-value map)') {
      exampleObj[f.key] = `<${f.key}>`;
    } else if (f.type === 'number' || f.type === 'integer') {
      exampleObj[f.key] = 0;
    } else if (f.type === 'boolean') {
      exampleObj[f.key] = false;
    } else if (f.type === 'date') {
      exampleObj[f.key] = '2026-01-01T00:00:00Z';
    } else if (f.type.startsWith('array')) {
      exampleObj[f.key] = [];
    } else {
      exampleObj[f.key] = `<${f.key}>`;
    }
  }

  return `<system>
<role>
You are a structured data extraction system. Your sole purpose is to analyze the user's input and return a single, valid JSON object that conforms exactly to the schema below.
</role>

<instructions>
1. Return ONLY raw JSON. No markdown code fences, no commentary, no explanations.
2. Every field marked REQUIRED must be present. Omit OPTIONAL fields only if the data is genuinely absent.
3. Data types must match exactly: strings as strings, numbers as numbers, booleans as true/false.
4. Do NOT invent, hallucinate, or assume values not present in the user's input. Use null for missing optional fields.
5. Respect all constraints (min, max, format, enum values) listed in the schema.
</instructions>

<json_schema>
${schemaLines.join('\n')}
</json_schema>

<example_output>
${JSON.stringify(exampleObj, null, 2)}
</example_output>

<constraints>
- Output must be parseable by JSON.parse() with zero modifications.
- Do not wrap in markdown. Do not add trailing commas.
- If a field is an enum, use ONLY the listed values.
- If the user's input is ambiguous for a field, prefer null over guessing.
</constraints>
</system>`;
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ZodToPromptTool() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  // Hydration signal for E2E tests
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const generatedPrompt = useMemo(() => {
    const trimmed = debouncedInput.trim();
    if (!trimmed) return '// Paste your Zod schema to begin…';

    // Guard: input size
    if (trimmed.length > MAX_INPUT_LENGTH) {
      return `// Error: Input exceeds ${(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB. Please reduce the schema size.`;
    }

    // Guard: must contain z.object
    if (!trimmed.includes('z.object(')) {
      return '// No z.object() found. Paste a Zod schema containing z.object({ ... }) to generate a prompt.';
    }

    const fields = parseZodFields(trimmed);

    if (fields.length === 0) {
      return '// Could not detect any fields inside z.object({ ... }).\n// Ensure your schema uses standard Zod field syntax like: name: z.string()';
    }

    return generatePrompt(fields);
  }, [debouncedInput]);

  return (
    <div ref={rootRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
      {/* Input Panel */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">Zod Schema Input</span>
          {input.length > MAX_INPUT_LENGTH * 0.8 && (
            <span className="text-xs text-amber-400" role="status">
              {(input.length / 1_000).toFixed(0)} / {(MAX_INPUT_LENGTH / 1_000).toFixed(0)} KB
            </span>
          )}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Paste your Zod schema here…"
          aria-label="Zod Schema input"
          spellCheck={false}
          maxLength={MAX_INPUT_LENGTH + 1_000}
        />
      </div>

      {/* Output Panel */}
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-300">LLM System Prompt</span>
          <CopyButton
            text={generatedPrompt}
            label="Copy Prompt"
            copiedLabel="Copied!"
            variant="primary"
            size="sm"
            className="bg-emerald-500 text-white hover:bg-emerald-400 font-bold rounded-lg"
          />
        </div>
        <pre className="flex-1 overflow-auto p-4">
          <code className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">{generatedPrompt}</code>
        </pre>
      </div>
    </div>
  );
}