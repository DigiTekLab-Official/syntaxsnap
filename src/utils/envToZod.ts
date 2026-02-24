// src/utils/envToZod.ts
// ─── Env-to-Zod Converter ───────────────────────────────────────────────────
// Converts raw .env file contents into a strict, type-safe Zod validation
// schema. All processing is 100% client-side — no data ever leaves the browser.
//
// Architecture:
//   Step 1 — Lexer:      Splits lines, handles comments, inline-comments,
//                         multi-line quoted values, and `=` inside values.
//   Step 2 — Inference:   Determines the safest Zod type for each value
//                         (booleans, numbers, URLs, emails, secrets, etc.).
//   Step 3 — Generator:   Builds the final TypeScript + Zod source string.
// ─────────────────────────────────────────────────────────────────────────────

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum input size in characters (~500 KB) before we warn about perf */
export const MAX_INPUT_CHARS = 500_000;

/** Keys containing these substrings get a JSDoc secrecy reminder */
const SECRET_INDICATORS = [
  'SECRET', 'PASSWORD', 'PASS', 'TOKEN', 'KEY', 'PRIVATE',
  'CREDENTIAL', 'AUTH', 'SIGNING', 'ENCRYPTION',
] as const;

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface EnvToken {
  key: string;
  value: string;
  zodType: string;
  comment: string | null;
  isSecret: boolean;
}

/** Result returned by the public `generateZodEnvSchema` API */
export interface EnvConversionResult {
  /** Full generated TypeScript + Zod code */
  code: string;
  /** Number of parsed variables */
  count: number;
  /** Non-fatal diagnostic messages */
  warnings: string[];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** True if the property key is a valid bare JS identifier */
function isSafeIdentifier(key: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/** True if the key name suggests a secret/credential */
function isSecretKey(key: string): boolean {
  const upper = key.toUpperCase();
  return SECRET_INDICATORS.some((s) => upper.includes(s));
}

/**
 * Strips *matched* surrounding quotes (single or double).
 * Handles the `/s` dotAll flag for multi-line quoted values.
 */
function stripQuotes(raw: string): string {
  if (raw.length < 2) return raw;
  const first = raw[0];
  const last = raw[raw.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return raw.slice(1, -1);
  }
  return raw;
}

/**
 * Strips an inline comment from a value.
 * Rule: `#` preceded by whitespace and NOT inside quotes is a comment.
 */
function stripInlineComment(raw: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || /\s/.test(raw[i - 1])) {
        return raw.slice(0, i).trimEnd();
      }
    }
  }
  return raw;
}

// ─── STEP 1: LEXER ──────────────────────────────────────────────────────────

/**
 * Parses raw .env text into structured tokens.
 *
 * Handles:
 * - Standard KEY=value pairs
 * - Values containing `=` (connection strings, base64, query params)
 * - Inline comments (`PORT=3000 # server port`)
 * - Multi-line quoted values (PEM keys, JSON blobs)
 * - Matched surrounding quotes (single and double)
 * - Empty values (`SECRET_KEY=`)
 * - Keys with dots/hyphens (quoted in output)
 * - Comment lines (`# ...`) preserved as JSDoc
 */
function parseEnv(rawEnv: string): EnvToken[] {
  const lines = rawEnv.split('\n');
  const tokens: EnvToken[] = [];
  let pendingComment: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // Skip empty lines — reset pending comment
    if (!trimmed) {
      pendingComment = null;
      continue;
    }

    // Capture full-line comments for JSDoc mapping
    if (trimmed.startsWith('#')) {
      pendingComment = trimmed.replace(/^#+\s*/, '');
      continue;
    }

    // Split on FIRST `=` only — everything after is the value
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      pendingComment = null;
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // ── Handle multi-line quoted values (PEM keys, JSON, etc.) ──────────
    if (
      (value.startsWith('"') && !value.endsWith('"')) ||
      (value.startsWith("'") && !value.endsWith("'"))
    ) {
      const quote = value[0];
      while (i + 1 < lines.length && !value.endsWith(quote)) {
        i++;
        value += '\n' + lines[i];
      }
    }

    // Strip inline comment BEFORE stripping quotes
    value = stripInlineComment(value);
    value = value.trim();

    // Strip matched surrounding quotes
    value = stripQuotes(value);

    // ── Type Inference ──────────────────────────────────────────────────────
    const zodType = inferZodType(key, value);

    tokens.push({
      key,
      value,
      zodType,
      comment: pendingComment,
      isSecret: isSecretKey(key),
    });

    pendingComment = null;
  }

  return tokens;
}

// ─── STEP 2: TYPE INFERENCE ──────────────────────────────────────────────────

/**
 * Determines the correct Zod type for a given key/value pair.
 *
 * Priority (highest first):
 *   1. Boolean — strict preprocess + enum + transform (case-insensitive)
 *   2. Integer — whole numbers (including negative)
 *   3. Float — decimal numbers
 *   4. URL — http:// or https:// prefix
 *   5. Email — key name heuristic
 *   6. Empty — allow empty string (no .min(1))
 *   7. Default — z.string().min(1)
 */
function inferZodType(key: string, value: string): string {
  // ── Boolean (case-insensitive) ────────────────────────────────────────────
  // z.coerce.boolean() is DANGEROUS for env vars:
  //   Boolean("false") === true in JS!
  // We preprocess to lowercase then match strict enum literals.
  if (/^(true|false)$/i.test(value)) {
    return [
      'z.preprocess(',
      "    (v) => String(v).toLowerCase(),",
      "    z.enum(['true', 'false'])",
      "  ).transform((v) => v === 'true')",
    ].join('\n');
  }

  // ── Integer (whole numbers including negative) ────────────────────────────
  if (/^-?\d+$/.test(value)) {
    return 'z.coerce.number().int()';
  }

  // ── Float (decimal numbers) ───────────────────────────────────────────────
  if (/^-?\d+\.\d+$/.test(value)) {
    return 'z.coerce.number()';
  }

  // ── URL ───────────────────────────────────────────────────────────────────
  if (/^https?:\/\//.test(value)) {
    return 'z.string().url()';
  }

  // ── Email (key-name heuristic) ────────────────────────────────────────────
  if (key.toUpperCase().includes('EMAIL')) {
    return 'z.string().email()';
  }

  // ── Empty value — allow empty string ──────────────────────────────────────
  if (value === '') {
    return 'z.string()';
  }

  // ── Default — non-empty string ────────────────────────────────────────────
  return 'z.string().min(1)';
}

// ─── STEP 3: GENERATOR ──────────────────────────────────────────────────────

/**
 * Converts raw .env text into a complete TypeScript file with Zod schema,
 * inferred type, and runtime validation.
 */
export function generateZodEnvSchema(rawEnv: string): EnvConversionResult {
  const warnings: string[] = [];

  if (rawEnv.length > MAX_INPUT_CHARS) {
    warnings.push(`Input is over ${(MAX_INPUT_CHARS / 1_000).toFixed(0)} KB — processing may be slow.`);
  }

  const tokens = parseEnv(rawEnv);

  if (tokens.length === 0) {
    return {
      code: '// No valid environment variables found.\n// Paste your .env file contents on the left.',
      count: 0,
      warnings,
    };
  }

  // Build schema fields
  let schemaFields = '';

  for (const token of tokens) {
    if (token.comment) {
      schemaFields += `  /** ${token.comment} */\n`;
    }
    if (token.isSecret) {
      schemaFields += `  /** ⚠️ Sensitive — never log or expose to the client */\n`;
    }

    // Quote keys that aren't valid JS identifiers (dots, hyphens)
    const safeKey = isSafeIdentifier(token.key) ? token.key : `"${token.key}"`;
    schemaFields += `  ${safeKey}: ${token.zodType},\n`;
  }

  const code = `import { z } from "zod";

/**
 * Generated by SyntaxSnap (https://syntaxsnap.com)
 * 100% Client-Side · Zero Server Round-Trips
 */

export const envSchema = z.object({
${schemaFields}});

// Infer the TypeScript type from the Zod schema
export type Env = z.infer<typeof envSchema>;

/**
 * Validate process.env against the schema.
 * In a Next.js or Node.js environment, this ensures
 * your app fails fast if configuration is missing.
 */
export const env = envSchema.parse(process.env);

// To ensure type-safety across your app, import \`env\` from this file
// instead of using \`process.env\` directly.
`;

  return { code, count: tokens.length, warnings };
}