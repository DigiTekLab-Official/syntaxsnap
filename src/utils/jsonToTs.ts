// src/utils/jsonToTs.ts
// Infers TypeScript declarations from a parsed JSON value.
// Nested objects become their own named interfaces; arrays of objects are merged
// so keys missing from some items become optional.

export interface JsonToTsOptions {
  rootName?: string;
  style?: 'interface' | 'type';
  optionalNulls?: boolean; // treat `null` values as optional fields
  exportAll?: boolean;
  readonly?: boolean;
}

type Shape =
  | { kind: 'prim'; name: string }
  | { kind: 'array'; item: Shape }
  | { kind: 'object'; fields: Map<string, { shape: Shape; optional: boolean }> }
  | { kind: 'union'; members: Shape[] };

const isIdent = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);

export function pascal(s: string): string {
  const out = s
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  if (!out) return 'Item';
  return /^[0-9]/.test(out) ? `T${out}` : out;
}

function singular(name: string): string {
  if (/ies$/i.test(name)) return name.slice(0, -3) + 'y';
  if (/(ss|us)$/i.test(name)) return name;
  if (/s$/i.test(name) && name.length > 3) return name.slice(0, -1);
  return name + 'Item';
}

function shapeOf(v: unknown): Shape {
  if (v === null) return { kind: 'prim', name: 'null' };
  if (Array.isArray(v)) {
    if (v.length === 0) return { kind: 'array', item: { kind: 'prim', name: 'unknown' } };
    return { kind: 'array', item: v.map(shapeOf).reduce(merge) };
  }
  switch (typeof v) {
    case 'string': return { kind: 'prim', name: 'string' };
    case 'number': return { kind: 'prim', name: 'number' };
    case 'boolean': return { kind: 'prim', name: 'boolean' };
    case 'object': {
      const fields = new Map<string, { shape: Shape; optional: boolean }>();
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        fields.set(k, { shape: shapeOf(val), optional: false });
      }
      return { kind: 'object', fields };
    }
    default: return { kind: 'prim', name: 'unknown' };
  }
}

function key(s: Shape): string {
  switch (s.kind) {
    case 'prim': return s.name;
    case 'array': return `[${key(s.item)}]`;
    case 'object': return `{${[...s.fields.keys()].sort().join(',')}}`;
    case 'union': return s.members.map(key).sort().join('|');
  }
}

function merge(a: Shape, b: Shape): Shape {
  if (a.kind === 'object' && b.kind === 'object') {
    const fields = new Map<string, { shape: Shape; optional: boolean }>();
    for (const [k, fa] of a.fields) {
      const fb = b.fields.get(k);
      fields.set(k, fb ? { shape: merge(fa.shape, fb.shape), optional: fa.optional || fb.optional } : { shape: fa.shape, optional: true });
    }
    for (const [k, fb] of b.fields) if (!a.fields.has(k)) fields.set(k, { shape: fb.shape, optional: true });
    return { kind: 'object', fields };
  }
  if (a.kind === 'array' && b.kind === 'array') return { kind: 'array', item: merge(a.item, b.item) };
  if (a.kind === 'prim' && a.name === 'unknown') return b;
  if (b.kind === 'prim' && b.name === 'unknown') return a;
  const members = [...(a.kind === 'union' ? a.members : [a]), ...(b.kind === 'union' ? b.members : [b])];
  // Merge all objects inside a union into one, keep distinct primitives
  const objs = members.filter((m) => m.kind === 'object');
  const rest = members.filter((m) => m.kind !== 'object');
  const merged: Shape[] = [];
  const seen = new Set<string>();
  for (const m of rest) { const k = key(m); if (!seen.has(k)) { seen.add(k); merged.push(m); } }
  if (objs.length) merged.push(objs.reduce((x, y) => merge(x, y)));
  return merged.length === 1 ? merged[0] : { kind: 'union', members: merged };
}

export function jsonToTs(value: unknown, opts: JsonToTsOptions = {}): string {
  const { rootName = 'Root', style = 'interface', optionalNulls = false, exportAll = true, readonly = false } = opts;
  const decls: string[] = [];
  const used = new Set<string>();
  const byShape = new Map<string, string>();

  const uniqueName = (base: string) => {
    let n = pascal(base), i = 2;
    while (used.has(n)) n = `${pascal(base)}${i++}`;
    used.add(n);
    return n;
  };

  const ex = exportAll ? 'export ' : '';
  const ro = readonly ? 'readonly ' : '';

  function render(s: Shape, hint: string): string {
    switch (s.kind) {
      case 'prim': return s.name;
      case 'array': {
        const inner = render(s.item, singular(hint));
        return /[|&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
      }
      case 'union': return s.members.map((m) => render(m, hint)).join(' | ');
      case 'object': {
        const k = key(s);
        const existing = byShape.get(k);
        if (existing) return existing;
        const name = uniqueName(hint);
        byShape.set(k, name);
        const lines: string[] = [];
        for (const [field, { shape, optional }] of s.fields) {
          let t = render(shape, field);
          let opt = optional;
          if (optionalNulls && shape.kind === 'prim' && shape.name === 'null') { opt = true; t = 'unknown'; }
          const prop = isIdent(field) ? field : JSON.stringify(field);
          lines.push(`  ${ro}${prop}${opt ? '?' : ''}: ${t};`);
        }
        const body = lines.length ? `{\n${lines.join('\n')}\n}` : '{}';
        decls.push(style === 'interface' ? `${ex}interface ${name} ${body}` : `${ex}type ${name} = ${body};`);
        return name;
      }
    }
  }

  const root = shapeOf(value);
  const top = render(root, rootName);
  if (root.kind !== 'object') decls.push(`${ex}type ${uniqueName(rootName === top ? `${rootName}Type` : rootName)} = ${top};`);
  // Children are pushed before parents; show the root first.
  return decls.reverse().join('\n\n') + '\n';
}

/** Compact Zod inference used by the homepage demo. */
export function jsonToZodLite(v: unknown, depth = 0): string {
  const pad = '  '.repeat(depth + 1), close = '  '.repeat(depth);
  if (v === null) return 'z.null()';
  if (Array.isArray(v)) return v.length ? `z.array(${jsonToZodLite(v[0], depth)})` : 'z.array(z.unknown())';
  switch (typeof v) {
    case 'string': return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'z.string().email()' : 'z.string()';
    case 'number': return Number.isInteger(v) ? 'z.number().int()' : 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'object': {
      const e = Object.entries(v as Record<string, unknown>);
      if (!e.length) return 'z.object({})';
      return `z.object({\n${e.map(([k, val]) => `${pad}${isIdent(k) ? k : JSON.stringify(k)}: ${jsonToZodLite(val, depth + 1)}`).join(',\n')}\n${close}})`;
    }
  }
  return 'z.unknown()';
}
