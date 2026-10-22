// src/utils/sqlToDrizzle.ts
// Converts SQL CREATE TABLE statements into a Drizzle ORM schema for
// PostgreSQL (pg-core), MySQL (mysql-core) or SQLite (sqlite-core).

export type Dialect = 'pg' | 'mysql' | 'sqlite';

interface Ref { table: string; column: string; onDelete?: string; onUpdate?: string }
interface Column {
  name: string; type: string; args: string[];
  notNull: boolean; primaryKey: boolean; unique: boolean; autoIncrement: boolean; identity: boolean;
  withTimezone: boolean; defaultRaw: string | null; ref?: Ref;
}
interface Table { name: string; columns: Column[]; pk: string[]; uniques: string[][]; fks: { cols: string[]; ref: Ref }[] }

export interface DrizzleResult { code: string; tables: number; warnings: string[]; dialect: Dialect }

const unquote = (s: string) => s.trim().replace(/^[`"[]|[`"\]]$/g, '');
const lastPart = (s: string) => unquote(s.split('.').pop() ?? s);

function camel(s: string): string {
  const parts = s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/);
  const out = parts.map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join('');
  return /^[0-9]/.test(out) ? `_${out}` : out || 'col';
}

function splitTopLevel(body: string): string[] {
  const out: string[] = []; let depth = 0, cur = '', q: string | null = null;
  for (const ch of body) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const cols = (list: string) => list.split(',').map((c) => lastPart(c));

function parseRef(rest: string): Ref | undefined {
  const m = rest.match(/REFERENCES\s+([`"[\]\w.]+)\s*(?:\(\s*([^)]+)\))?/i);
  if (!m) return undefined;
  const onDelete = rest.match(/ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i)?.[1];
  const onUpdate = rest.match(/ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)/i)?.[1];
  const norm = (a?: string) => a?.toLowerCase().replace(/\s+/g, ' ');
  return { table: lastPart(m[1]), column: m[2] ? lastPart(m[2].split(',')[0]) : 'id', onDelete: norm(onDelete), onUpdate: norm(onUpdate) };
}

function parseColumn(def: string): Column | null {
  const m = def.match(/^([`"[]?[\w$]+[`"\]]?)\s+([A-Za-z_][\w ]*?)(\s*\(([^)]*)\))?(?=\s|$|\[)/);
  if (!m) return null;
  let type = m[2].trim().toLowerCase();
  // Multi-word types the regex may over- or under-capture
  const rest0 = def.slice(m[0].length);
  if (/^double$/.test(type) && /^\s*precision/i.test(rest0)) type = 'double precision';
  type = type.replace(/\s+(not|null|primary|default|unique|references|generated|auto_increment|autoincrement|check|constraint|unsigned).*$/, '');
  const rest = def.slice(m[1].length);
  const dm = rest.match(/\bDEFAULT\s+('(?:[^']|'')*'|\([^)]*\)|[\w.:]+\s*\(\s*\)|[^\s,]+)/i);
  return {
    name: unquote(m[1]),
    type,
    args: m[4] ? m[4].split(',').map((a) => a.trim()) : [],
    notNull: /\bNOT\s+NULL\b/i.test(rest),
    primaryKey: /\bPRIMARY\s+KEY\b/i.test(rest),
    unique: /\bUNIQUE\b/i.test(rest),
    autoIncrement: /\bAUTO_?INCREMENT\b/i.test(rest),
    identity: /\bGENERATED\s+(ALWAYS|BY\s+DEFAULT)\s+AS\s+IDENTITY\b/i.test(rest),
    withTimezone: /with\s+time\s+zone/i.test(rest) || type === 'timestamptz',
    defaultRaw: dm ? dm[1] : null,
    ref: parseRef(rest),
  };
}

export function parseSql(sql: string): Table[] {
  const clean = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const tables: Table[] = [];
  const re = /CREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"[\]\w.]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    let depth = 1, i = m.index + m[0].length;
    const start = i;
    while (i < clean.length && depth) { if (clean[i] === '(') depth++; else if (clean[i] === ')') depth--; i++; }
    if (depth) continue;
    const t: Table = { name: lastPart(m[1]), columns: [], pk: [], uniques: [], fks: [] };
    for (const part of splitTopLevel(clean.slice(start, i - 1))) {
      const p = part.replace(/^CONSTRAINT\s+[`"[\]\w]+\s+/i, '');
      let mm;
      if ((mm = p.match(/^PRIMARY\s+KEY\s*\(([^)]+)\)/i))) { t.pk = cols(mm[1]); continue; }
      if ((mm = p.match(/^UNIQUE(?:\s+(?:KEY|INDEX))?\s*(?:[`"\w]+\s*)?\(([^)]+)\)/i))) { t.uniques.push(cols(mm[1])); continue; }
      if ((mm = p.match(/^FOREIGN\s+KEY\s*\(([^)]+)\)\s*(REFERENCES[\s\S]*)$/i))) { const ref = parseRef(mm[2]); if (ref) t.fks.push({ cols: cols(mm[1]), ref }); continue; }
      if (/^(KEY|INDEX|CHECK|FULLTEXT|SPATIAL)\b/i.test(p)) continue;
      const c = parseColumn(p);
      if (c) t.columns.push(c);
    }
    // Single-column table-level constraints become column modifiers
    if (t.pk.length === 1) { const c = t.columns.find((x) => x.name === t.pk[0]); if (c) { c.primaryKey = true; t.pk = []; } }
    t.uniques = t.uniques.filter((u) => { if (u.length !== 1) return true; const c = t.columns.find((x) => x.name === u[0]); if (c) c.unique = true; return !c; });
    t.fks = t.fks.filter((fk) => { if (fk.cols.length !== 1) return true; const c = t.columns.find((x) => x.name === fk.cols[0]); if (c) c.ref = fk.ref; return !c; });
    tables.push(t);
  }
  return tables;
}

export function detectDialect(sql: string): Dialect {
  if (/\bAUTOINCREMENT\b/i.test(sql) && !/\bAUTO_INCREMENT\b/i.test(sql)) return 'sqlite';
  if (/`|\bAUTO_INCREMENT\b|\bENGINE\s*=|\bUNSIGNED\b|\bTINYINT\b|\bDATETIME\b|\bLONGTEXT\b/i.test(sql)) return 'mysql';
  return 'pg';
}

// ─── Column rendering ────────────────────────────────────────────────────────

function builder(c: Column, d: Dialect, warn: (s: string) => void): { fn: string; call: string; isTimestamp: boolean; isBool: boolean; isUuid: boolean } {
  const n = `'${c.name}'`;
  const t = c.type.replace(/\s+/g, ' ');
  const len = c.args[0];
  const num = (fn: string, call?: string) => ({ fn, call: call ?? `${fn}(${n})`, isTimestamp: false, isBool: false, isUuid: false });
  const opts = (o: Record<string, string | number | boolean | undefined>) => {
    const e = Object.entries(o).filter(([, v]) => v !== undefined);
    return e.length ? `, { ${e.map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v}`).join(', ')} }` : '';
  };

  if (d === 'sqlite') {
    if (/int|serial/.test(t)) {
      if (t === 'tinyint' && len === '1') return { ...num('integer', `integer(${n}, { mode: 'boolean' })`), isBool: true };
      return num('integer');
    }
    if (/bool/.test(t)) return { ...num('integer', `integer(${n}, { mode: 'boolean' })`), isBool: true };
    if (/real|float|double/.test(t)) return num('real');
    if (/numeric|decimal/.test(t)) return num('numeric');
    if (/blob|binary|bytea/.test(t)) return num('blob');
    if (/timestamp|datetime|date|time/.test(t)) return { ...num('text'), isTimestamp: true };
    if (/json/.test(t)) return num('text', `text(${n}, { mode: 'json' })`);
    return num('text');
  }

  if (d === 'pg') {
    switch (t) {
      case 'serial': case 'serial4': return num('serial');
      case 'bigserial': case 'serial8': return num('bigserial', `bigserial(${n}, { mode: 'number' })`);
      case 'smallserial': return num('smallserial');
      case 'int': case 'integer': case 'int4': case 'mediumint': return num('integer');
      case 'smallint': case 'int2': case 'tinyint': return num('smallint');
      case 'bigint': case 'int8': return num('bigint', `bigint(${n}, { mode: 'number' })`);
      case 'real': case 'float4': return num('real');
      case 'float': case 'float8': case 'double': case 'double precision': return num('doublePrecision');
      case 'numeric': case 'decimal': return num('numeric', `numeric(${n}${opts({ precision: len ? Number(len) : undefined, scale: c.args[1] ? Number(c.args[1]) : undefined })})`);
      case 'varchar': case 'character varying': return num('varchar', `varchar(${n}${opts({ length: len ? Number(len) : undefined })})`);
      case 'char': case 'character': return num('char', `char(${n}${opts({ length: len ? Number(len) : undefined })})`);
      case 'text': case 'citext': case 'tinytext': case 'mediumtext': case 'longtext': return num('text');
      case 'boolean': case 'bool': return { ...num('boolean'), isBool: true };
      case 'uuid': return { ...num('uuid'), isUuid: true };
      case 'json': return num('json');
      case 'jsonb': return num('jsonb');
      case 'date': return num('date');
      case 'time': case 'timetz': return num('time');
      case 'interval': return num('interval');
      case 'inet': return num('inet');
      case 'timestamp': case 'timestamptz': case 'datetime': case 'timestamp without time zone': case 'timestamp with time zone':
        return { ...num('timestamp', `timestamp(${n}${opts({ withTimezone: c.withTimezone || undefined })})`), isTimestamp: true };
      case 'bytea': warn(`${c.name}: bytea has no built-in Drizzle builder; mapped to text. Use customType for binary data.`); return num('text');
    }
    warn(`${c.name}: unknown type "${c.type}", mapped to text.`);
    return num('text');
  }

  // mysql
  switch (t) {
    case 'serial': return num('serial');
    case 'int': case 'integer': return num('int');
    case 'tinyint': return len === '1' ? { ...num('boolean'), isBool: true } : num('tinyint');
    case 'smallint': return num('smallint');
    case 'mediumint': return num('mediumint');
    case 'bigint': return num('bigint', `bigint(${n}, { mode: 'number' })`);
    case 'float': case 'real': return num('float');
    case 'double': case 'double precision': return num('double');
    case 'decimal': case 'numeric': return num('decimal', `decimal(${n}${opts({ precision: len ? Number(len) : undefined, scale: c.args[1] ? Number(c.args[1]) : undefined })})`);
    case 'varchar': case 'character varying': return num('varchar', `varchar(${n}, { length: ${len ?? 255} })`);
    case 'char': case 'character': return num('char', `char(${n}${opts({ length: len ? Number(len) : undefined })})`);
    case 'text': return num('text');
    case 'tinytext': return num('tinytext');
    case 'mediumtext': return num('mediumtext');
    case 'longtext': return num('longtext');
    case 'boolean': case 'bool': return { ...num('boolean'), isBool: true };
    case 'json': case 'jsonb': return num('json');
    case 'date': return num('date');
    case 'time': return num('time');
    case 'year': return num('year');
    case 'datetime': return { ...num('datetime'), isTimestamp: true };
    case 'timestamp': case 'timestamptz': return { ...num('timestamp'), isTimestamp: true };
    case 'binary': return num('binary');
    case 'varbinary': return num('varbinary', `varbinary(${n}, { length: ${len ?? 255} })`);
    case 'uuid': return num('varchar', `varchar(${n}, { length: 36 })`);
  }
  if (/^enum$/.test(t)) {
    const vals = c.args.map((a) => a.replace(/^'|'$/g, '')).map((v) => `'${v}'`).join(', ');
    return num('mysqlEnum', `mysqlEnum(${n}, [${vals}])`);
  }
  warn(`${c.name}: unknown type "${c.type}", mapped to text.`);
  return num('text');
}

function renderDefault(c: Column, b: ReturnType<typeof builder>, d: Dialect, useSql: () => void): string {
  if (c.defaultRaw === null) return '';
  const raw = c.defaultRaw.trim();
  const low = raw.toLowerCase().replace(/^\((.*)\)$/, '$1');
  if (/^(now\(\)|current_timestamp(\(\))?|localtimestamp)$/.test(low)) {
    // mysql-core's datetime() has no defaultNow(); pg timestamp and mysql timestamp do
    if (b.isTimestamp && (d === 'pg' || b.fn === 'timestamp')) return '.defaultNow()';
    useSql(); return '.default(sql`CURRENT_TIMESTAMP`)';
  }
  if (/^(gen_random_uuid|uuid_generate_v4)\(\)$/.test(low) && d === 'pg') return '.defaultRandom()';
  if (b.isBool && /^(true|false|1|0)$/.test(low)) return `.default(${low === 'true' || low === '1'})`;
  const quote = (v: string) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const isDecimal = b.fn === 'numeric' || b.fn === 'decimal'; // Drizzle types these as strings
  if (/^-?\d+(\.\d+)?$/.test(raw)) return isDecimal ? `.default(${quote(raw)})` : `.default(${raw})`;
  if (/^'.*'(::[\w ]+)?$/.test(raw)) {
    const v = raw.replace(/::[\w ]+$/, '').slice(1, -1).replace(/''/g, "'");
    if (!isDecimal && b.fn !== 'text' && /^-?\d+(\.\d+)?$/.test(v) && !/char|text|enum/i.test(b.fn)) return `.default(${v})`;
    return `.default(${quote(v)})`;
  }
  if (/^null$/i.test(raw)) return '';
  useSql();
  return `.default(sql\`${raw.replace(/`/g, '\\`')}\`)`;
}

export function sqlToDrizzle(sql: string, dialect: Dialect, opts: { relations?: boolean } = {}): DrizzleResult {
  const tables = parseSql(sql);
  const warnings: string[] = [];
  if (!tables.length) return { code: '', tables: 0, warnings: ['No CREATE TABLE statements found.'], dialect };

  const core = dialect === 'pg' ? 'pg-core' : dialect === 'mysql' ? 'mysql-core' : 'sqlite-core';
  const tableFn = dialect === 'pg' ? 'pgTable' : dialect === 'mysql' ? 'mysqlTable' : 'sqliteTable';
  const imports = new Set<string>([tableFn]);
  let needSql = false;
  const varName = new Map(tables.map((t) => [t.name, camel(t.name)]));
  const colKey = (t: Table, col: string) => camel(col);
  const blocks: string[] = [];

  for (const t of tables) {
    const lines: string[] = [];
    for (const c of t.columns) {
      const b = builder(c, dialect, (w) => warnings.push(`${t.name}.${w}`));
      imports.add(b.fn);
      let chain = b.call;
      const isSerial = /serial/.test(b.fn);
      if (c.primaryKey) {
        chain += dialect === 'sqlite' && c.autoIncrement ? '.primaryKey({ autoIncrement: true })' : '.primaryKey()';
      }
      if (c.identity && dialect === 'pg') chain += '.generatedAlwaysAsIdentity()';
      if (c.autoIncrement && dialect === 'mysql') chain += '.autoincrement()';
      if (c.notNull && !c.primaryKey && !isSerial) chain += '.notNull()';
      if (c.unique && !c.primaryKey) chain += '.unique()';
      chain += renderDefault(c, b, dialect, () => { needSql = true; });
      if (c.ref) {
        const target = varName.get(c.ref.table);
        if (target) {
          const o: string[] = [];
          if (c.ref.onDelete) o.push(`onDelete: '${c.ref.onDelete}'`);
          if (c.ref.onUpdate) o.push(`onUpdate: '${c.ref.onUpdate}'`);
          chain += `.references(() => ${target}.${camel(c.ref.column)}${o.length ? `, { ${o.join(', ')} }` : ''})`;
        } else {
          warnings.push(`${t.name}.${c.name}: references "${c.ref.table}", which is not in the input; the reference was left out.`);
        }
      }
      lines.push(`  ${colKey(t, c.name)}: ${chain},`);
    }

    const extras: string[] = [];
    if (t.pk.length > 1) { imports.add('primaryKey'); extras.push(`primaryKey({ columns: [${t.pk.map((c) => `t.${camel(c)}`).join(', ')}] })`); }
    for (const u of t.uniques) { imports.add('unique'); extras.push(`unique().on(${u.map((c) => `t.${camel(c)}`).join(', ')})`); }
    for (const fk of t.fks) {
      const target = varName.get(fk.ref.table);
      if (!target) { warnings.push(`${t.name}: composite foreign key to "${fk.ref.table}" left out (table not in input).`); continue; }
      imports.add('foreignKey');
      extras.push(`foreignKey({ columns: [${fk.cols.map((c) => `t.${camel(c)}`).join(', ')}], foreignColumns: [${target}.${camel(fk.ref.column)}] })`);
    }
    const third = extras.length ? `, (t) => [\n  ${extras.join(',\n  ')},\n]` : '';
    blocks.push(`export const ${varName.get(t.name)} = ${tableFn}('${t.name}', {\n${lines.join('\n')}\n}${third});`);
  }

  // Relations (relational query API), from single-column foreign keys
  const rel: string[] = [];
  if (opts.relations) {
    const many = new Map<string, string[]>();
    const one = new Map<string, string[]>();
    for (const t of tables) for (const c of t.columns) {
      if (!c.ref || !varName.has(c.ref.table)) continue;
      const parent = varName.get(c.ref.table)!, child = varName.get(t.name)!;
      const fieldName = camel(c.name.replace(/_?id$/i, '')) || parent;
      one.set(child, [...(one.get(child) ?? []), `  ${fieldName}: one(${parent}, { fields: [${child}.${camel(c.name)}], references: [${parent}.${camel(c.ref.column)}] }),`]);
      many.set(parent, [...(many.get(parent) ?? []), `  ${child}: many(${child}),`]);
    }
    for (const t of tables) {
      const v = varName.get(t.name)!;
      const body = [...(one.get(v) ?? []), ...(many.get(v) ?? [])];
      if (!body.length) continue;
      const args = [one.get(v) ? 'one' : '', many.get(v) ? 'many' : ''].filter(Boolean).join(', ');
      rel.push(`export const ${v}Relations = relations(${v}, ({ ${args} }) => ({\n${[...new Set(body)].join('\n')}\n}));`);
    }
  }

  const head = [
    `import { ${[...imports].sort().join(', ')} } from 'drizzle-orm/${core}';`,
    needSql || rel.length ? `import { ${[needSql ? 'sql' : '', rel.length ? 'relations' : ''].filter(Boolean).join(', ')} } from 'drizzle-orm';` : '',
  ].filter(Boolean).join('\n');

  return { code: `${head}\n\n${blocks.join('\n\n')}${rel.length ? `\n\n${rel.join('\n\n')}` : ''}\n`, tables: tables.length, warnings, dialect };
}
