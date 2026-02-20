// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum recursion depth to prevent stack overflow on deeply nested schemas */
const MAX_DEPTH = 20;

/** Maximum input size in characters (~1 MB) before a warning is emitted */
export const MAX_INPUT_CHARS = 1_000_000;

// ─── TYPES ───────────────────────────────────────────────────────────────────

/**
 * Represents a single JSON Schema node as emitted by Pydantic's
 * `model.model_json_schema()` (v1 and v2 compatible).
 */
export type JsonSchemaNode = {
  $ref?: string;
  $defs?: Record<string, JsonSchemaNode>;
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaNode;
  items?: JsonSchemaNode;
  prefixItems?: JsonSchemaNode[];
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
  // String constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  // Number constraints
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  // Array constraints
  minItems?: number;
  maxItems?: number;
};

/** Result returned by the public `convertPydanticToZod` API */
export interface ConversionResult {
  /** Full generated TypeScript + Zod code */
  code: string;
  /** Non-fatal diagnostic messages (depth limit hit, unsupported keywords, etc.) */
  warnings: string[];
}

// ─── INTERNAL CONTEXT ────────────────────────────────────────────────────────

interface ConversionContext {
  defs: Record<string, JsonSchemaNode>;
  warnings: Set<string>;
  depth: number;
}

// ─── HELPER BUILDERS ─────────────────────────────────────────────────────────

/** Extracts the model name from a $ref string like "#/$defs/Address" */
function refToName(ref: string): string {
  return ref.split('/').pop() ?? 'Unknown';
}

/**
 * Builds a z.string() expression with format and constraint chaining.
 * Note: `.date()` and `.time()` require Zod ≥ 3.22. A warning is emitted
 * into `ctx` when these formats are encountered so users are informed.
 */
function buildStringZod(node: JsonSchemaNode, ctx: ConversionContext): string {
  let zod = 'z.string()';
  if (node.format === 'email')          zod += '.email()';
  else if (node.format === 'date-time') zod += '.datetime()';
  else if (node.format === 'date') {
    zod += '.date()';
    ctx.warnings.add('Format "date" uses z.string().date() which requires Zod ≥ 3.22.');
  } else if (node.format === 'time') {
    zod += '.time()';
    ctx.warnings.add('Format "time" uses z.string().time() which requires Zod ≥ 3.22.');
  } else if (node.format === 'uuid')    zod += '.uuid()';
  else if (node.format === 'uri' || node.format === 'url') zod += '.url()';
  else if (node.format === 'ip')        zod += '.ip()';
  if (node.minLength !== undefined) zod += `.min(${node.minLength})`;
  if (node.maxLength !== undefined) zod += `.max(${node.maxLength})`;
  if (node.pattern   !== undefined) zod += `.regex(/${node.pattern}/)`;
  return zod;
}

/** Builds a z.number() / z.number().int() expression with constraint chaining */
function buildNumberZod(node: JsonSchemaNode, isInt: boolean): string {
  let zod = isInt ? 'z.number().int()' : 'z.number()';
  if (node.minimum          !== undefined) zod += `.min(${node.minimum})`;
  if (node.maximum          !== undefined) zod += `.max(${node.maximum})`;
  if (node.exclusiveMinimum !== undefined) zod += `.gt(${node.exclusiveMinimum})`;
  if (node.exclusiveMaximum !== undefined) zod += `.lt(${node.exclusiveMaximum})`;
  if (node.multipleOf       !== undefined) zod += `.multipleOf(${node.multipleOf})`;
  return zod;
}

/**
 * Splits a list of union variants into nullable and non-null parts, then
 * returns a Zod expression and a flag indicating null presence.
 */
function buildUnionZod(
  variants: JsonSchemaNode[],
  ctx: ConversionContext,
): { zod: string; hasNull: boolean } {
  const hasNull = variants.some(v => v.type === 'null');
  const nonNull = variants.filter(v => v.type !== 'null');

  if (nonNull.length === 0) return { zod: 'z.null()', hasNull: false };
  if (nonNull.length === 1) return { zod: nodeToZod(nonNull[0], ctx), hasNull };

  const parts = nonNull.map(v => nodeToZod(v, ctx));
  return { zod: `z.union([${parts.join(', ')}])`, hasNull };
}

/** Builds a z.object({...}) expression from a node with `properties` */
function buildObjectZod(node: JsonSchemaNode, ctx: ConversionContext): string {
  const props = node.properties ?? {};
  const required = new Set(node.required ?? []);

  const lines = Object.entries(props).map(([key, val]) => {
    const fieldZod   = nodeToZod(val, ctx);
    const isRequired = required.has(key);
    const optional   = !isRequired && !fieldZod.endsWith('.optional()') ? '.optional()' : '';
    const safeKey    = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
    return `  ${safeKey}: ${fieldZod}${optional},`;
  });

  return `z.object({\n${lines.join('\n')}\n})`;
}

// ─── CORE RECURSIVE CONVERTER ────────────────────────────────────────────────

/**
 * Recursively converts a single JSON Schema node into a Zod expression string.
 * All logic is pure (no side-effects except appending to `ctx.warnings`).
 */
function nodeToZod(node: JsonSchemaNode, ctx: ConversionContext): string {
  if (ctx.depth > MAX_DEPTH) {
    ctx.warnings.add(
      `Schema exceeds ${MAX_DEPTH} levels of nesting. Deeper nodes are typed as z.unknown().`,
    );
    return 'z.unknown()';
  }

  const child: ConversionContext = { ...ctx, depth: ctx.depth + 1 };

  // ── $ref ───────────────────────────────────────────────────────────────────
  if (node.$ref) return refToName(node.$ref);

  // ── const (literal) ────────────────────────────────────────────────────────
  if (node.const !== undefined) return `z.literal(${JSON.stringify(node.const)})`;

  // ── enum ───────────────────────────────────────────────────────────────────
  if (node.enum !== undefined) {
    if (node.enum.every(v => typeof v === 'string')) {
      return `z.enum([${node.enum.map(v => JSON.stringify(v)).join(', ')}])`;
    }
    // Mixed / numeric enum — emit as a union of literals
    return `z.union([${node.enum.map(v => `z.literal(${JSON.stringify(v)})`).join(', ')}])`;
  }

  // ── anyOf / oneOf ──────────────────────────────────────────────────────────
  if (node.anyOf || node.oneOf) {
    const variants = node.anyOf ?? node.oneOf ?? [];
    const { zod, hasNull } = buildUnionZod(variants, child);
    return hasNull ? `${zod}.nullable()` : zod;
  }

  // ── allOf (Pydantic inheritance / single-element wrapper) ──────────────────
  if (node.allOf) {
    if (node.allOf.length === 1) return nodeToZod(node.allOf[0], child);
    // True intersection — chain with .and()
    return node.allOf.map(v => nodeToZod(v, child)).reduce((acc, part) => `${acc}.and(${part})`);
  }

  // ── null ───────────────────────────────────────────────────────────────────
  if (node.type === 'null') return 'z.null()';

  // ── string ─────────────────────────────────────────────────────────────────
  if (node.type === 'string') return buildStringZod(node, ctx);

  // ── integer ────────────────────────────────────────────────────────────────
  if (node.type === 'integer') return buildNumberZod(node, true);

  // ── number ─────────────────────────────────────────────────────────────────
  if (node.type === 'number') return buildNumberZod(node, false);

  // ── boolean ────────────────────────────────────────────────────────────────
  if (node.type === 'boolean') return 'z.boolean()';

  // ── array ──────────────────────────────────────────────────────────────────
  if (node.type === 'array') {
    const itemZod = node.items ? nodeToZod(node.items, child) : 'z.unknown()';
    let zod = `z.array(${itemZod})`;
    if (node.minItems !== undefined) zod += `.min(${node.minItems})`;
    if (node.maxItems !== undefined) zod += `.max(${node.maxItems})`;
    return zod;
  }

  // ── object ─────────────────────────────────────────────────────────────────
  if (node.type === 'object' || node.properties) return buildObjectZod(node, child);

  return 'z.unknown()';
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

/**
 * Converts a Pydantic JSON schema (from `Model.model_json_schema()`) into
 * TypeScript source code that declares equivalent Zod schemas.
 *
 * All `$defs` (referenced sub-models) are emitted as named `const` declarations
 * before the root schema, so references resolve correctly at runtime.
 *
 * @example
 * ```ts
 * const result = convertPydanticToZod(JSON.parse(rawSchema));
 * console.log(result.code);     // import { z } from "zod"; ...
 * console.log(result.warnings); // ["Schema exceeds 20 levels..."]
 * ```
 */
export function convertPydanticToZod(schema: JsonSchemaNode): ConversionResult {
  const warnings = new Set<string>();
  const defs = schema.$defs ?? {};
  const ctx: ConversionContext = { defs, warnings, depth: 0 };

  const lines: string[] = ['import { z } from "zod";', ''];

  // Emit named sub-models from $defs first so $ref names resolve
  for (const [name, defSchema] of Object.entries(defs)) {
    lines.push(`const ${name} = ${nodeToZod(defSchema, ctx)};`);
    lines.push(`export type ${name}Type = z.infer<typeof ${name}>;`);
    lines.push('');
  }

  // Emit the root schema
  const rootName = schema.title ?? 'Schema';
  lines.push(`const ${rootName} = ${nodeToZod(schema, ctx)};`);
  lines.push(`export type ${rootName}Type = z.infer<typeof ${rootName}>;`);

  return { code: lines.join('\n'), warnings: [...warnings] };
}