import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_INPUT_LENGTH = 500_000;
const DEBOUNCE_MS = 300;

const DEFAULT_INPUT = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  bio TEXT,
  age INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  avatar_url TEXT,
  login_count INT NOT NULL DEFAULT 0,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  content TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  view_count INT NOT NULL DEFAULT 0,
  author_id INT NOT NULL,
  category_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  parent_id INT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

// ─── SQL TYPE → PRISMA TYPE MAP ─────────────────────────────────────────────

const SQL_TO_PRISMA: Record<string, string> = {
  // Integers
  int: 'Int',
  integer: 'Int',
  tinyint: 'Int',
  smallint: 'Int',
  mediumint: 'Int',
  bigint: 'BigInt',
  serial: 'Int',
  bigserial: 'BigInt',
  // Floats
  float: 'Float',
  double: 'Float',
  'double precision': 'Float',
  real: 'Float',
  decimal: 'Decimal',
  numeric: 'Decimal',
  // Strings
  varchar: 'String',
  char: 'String',
  character: 'String',
  'character varying': 'String',
  text: 'String',
  tinytext: 'String',
  mediumtext: 'String',
  longtext: 'String',
  uuid: 'String',
  // Boolean
  boolean: 'Boolean',
  bool: 'Boolean',
  // Date/Time
  timestamp: 'DateTime',
  'timestamp without time zone': 'DateTime',
  'timestamp with time zone': 'DateTime',
  timestamptz: 'DateTime',
  datetime: 'DateTime',
  date: 'DateTime',
  time: 'DateTime',
  // JSON
  json: 'Json',
  jsonb: 'Json',
  // Binary
  blob: 'Bytes',
  bytea: 'Bytes',
  binary: 'Bytes',
  varbinary: 'Bytes',
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Convert snake_case to PascalCase for model names.
 * e.g. "user_profiles" → "UserProfile" (singularized naively)
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, '');
}

function singularize(name: string): string {
  if (name.endsWith('ies')) return name.slice(0, -3) + 'y';
  if (name.endsWith('ses') || name.endsWith('xes')) return name.slice(0, -2);
  if (name.endsWith('s') && !name.endsWith('ss') && !name.endsWith('us')) return name.slice(0, -1);
  return name;
}

function toModelName(tableName: string): string {
  return singularize(toPascalCase(tableName));
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripQuotes(name: string): string {
  return name.replace(/^[`"'\[\]]+|[`"'\[\]]+$/g, '');
}

// ─── PARSER TYPES ───────────────────────────────────────────────────────────

interface ParsedColumn {
  name: string;
  sqlType: string;
  prismaType: string;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue: string | null;
}

interface ParsedTable {
  tableName: string;
  modelName: string;
  columns: ParsedColumn[];
}

// ─── CORE PARSER ────────────────────────────────────────────────────────────

function mapSqlTypeToPrisma(rawType: string): string {
  const lower = rawType.toLowerCase().trim();

  // Handle TINYINT(1) → Boolean
  if (/^tinyint\s*\(\s*1\s*\)$/i.test(rawType.trim())) {
    return 'Boolean';
  }

  // Strip parenthesized length/precision for lookup: VARCHAR(255) → varchar
  const base = lower.replace(/\s*\([^)]*\)/, '').trim();

  return SQL_TO_PRISMA[base] || 'String';
}

function parseDefaultValue(defVal: string, prismaType: string): string {
  const lower = defVal.toLowerCase().trim();

  // Timestamps
  if (
    lower === 'current_timestamp' ||
    lower === 'now()' ||
    lower === 'current_timestamp()' ||
    lower === "current_timestamp::timestamp"
  ) {
    return '@default(now())';
  }

  // UUID generation
  if (lower === 'gen_random_uuid()' || lower === 'uuid_generate_v4()') {
    return '@default(uuid())';
  }

  // cuid
  if (lower === 'cuid()') {
    return '@default(cuid())';
  }

  // Booleans
  if (prismaType === 'Boolean') {
    if (lower === 'true' || lower === '1') return '@default(true)';
    if (lower === 'false' || lower === '0') return '@default(false)';
  }

  // Numeric
  if (prismaType === 'Int' || prismaType === 'BigInt' || prismaType === 'Float' || prismaType === 'Decimal') {
    const num = Number(defVal);
    if (!isNaN(num)) return `@default(${num})`;
  }

  // String defaults
  if (prismaType === 'String') {
    const stripped = defVal.replace(/^['"]|['"]$/g, '');
    return `@default("${stripped}")`;
  }

  return `@default(${defVal})`;
}

function parseColumnLine(line: string): ParsedColumn | null {
  const trimmed = line.trim().replace(/,\s*$/, '');
  if (!trimmed) return null;

  // Skip table-level constraints
  if (/^\s*(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT|CHECK)\b/i.test(trimmed)) {
    return null;
  }

  // Match: column_name TYPE[(size)] [constraints...]
  const colMatch = trimmed.match(
    /^[`"'\[\]]?(\w+)[`"'\[\]]?\s+(\w+(?:\s*\([^)]*\))?(?:\s+(?:without|with)\s+time\s+zone)?)/i
  );
  if (!colMatch) return null;

  const [, rawName, rawType] = colMatch;
  const name = stripQuotes(rawName);
  const rest = trimmed.slice(colMatch[0].length);

  const prismaType = mapSqlTypeToPrisma(rawType);

  // Detect features from the rest of the line
  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest) || /\bPRIMARY\s+KEY\b/i.test(rawType);
  const isAutoIncrement = /\bAUTO_INCREMENT\b/i.test(rest) || /\bSERIAL\b/i.test(rawType) || /\bAUTOINCREMENT\b/i.test(rest);
  const isNotNull = /\bNOT\s+NULL\b/i.test(rest);
  const isUnique = /\bUNIQUE\b/i.test(rest);

  // SERIAL types imply NOT NULL + auto-increment
  const isSerial = /^(big)?serial$/i.test(rawType.trim());

  // Extract default value
  let defaultValue: string | null = null;
  const defMatch = rest.match(/\bDEFAULT\s+('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\S+)/i);
  if (defMatch) {
    defaultValue = defMatch[1].replace(/^['"]|['"]$/g, '');
  }

  return {
    name,
    sqlType: rawType.trim(),
    prismaType,
    isPrimaryKey: isPrimaryKey || isSerial,
    isAutoIncrement: isAutoIncrement || isSerial,
    isNotNull: isNotNull || isPrimaryKey || isSerial,
    isUnique,
    defaultValue,
  };
}

function extractTables(sql: string): ParsedTable[] {
  const clean = stripComments(sql);
  const tables: ParsedTable[] = [];

  // Find each CREATE TABLE header; then use depth-counting to find the matching ')'
  const headerRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"'\[\]]?(\w+)[`"'\[\]]?\s*\(/gi;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(clean)) !== null) {
    const rawTableName = stripQuotes(match[1]);
    const modelName = toModelName(rawTableName);

    // Balanced-paren scan starting right after the opening '('
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let pos = bodyStart;
    while (pos < clean.length && depth > 0) {
      if (clean[pos] === '(') depth++;
      else if (clean[pos] === ')') depth--;
      pos++;
    }
    if (depth !== 0) continue; // unbalanced — skip

    const body = clean.substring(bodyStart, pos - 1);

    // Split column definitions — handle commas not inside parentheses
    const lines: string[] = [];
    let parenDepth = 0;
    let current = '';
    for (const ch of body) {
      if (ch === '(') parenDepth++;
      else if (ch === ')') parenDepth--;
      else if (ch === ',' && parenDepth === 0) {
        lines.push(current);
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) lines.push(current);

    // Also detect table-level PRIMARY KEY(col)
    let tablePkCols: string[] = [];
    for (const line of lines) {
      const pkMatch = line.trim().match(/^\s*PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        tablePkCols = pkMatch[1].split(',').map((c) => stripQuotes(c.trim()));
      }
    }

    const columns: ParsedColumn[] = [];
    for (const line of lines) {
      const col = parseColumnLine(line);
      if (col) {
        // Mark columns that appear in table-level PRIMARY KEY
        if (tablePkCols.includes(col.name)) {
          col.isPrimaryKey = true;
          col.isNotNull = true;
        }
        columns.push(col);
      }
    }

    tables.push({ tableName: rawTableName, modelName, columns });
  }

  return tables;
}

function generatePrismaSchema(tables: ParsedTable[]): string {
  const lines: string[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    if (i > 0) lines.push('');
    lines.push(`model ${table.modelName} {`);

    for (const col of table.columns) {
      const parts: string[] = [];
      const fieldName = toCamelCase(col.name);

      // Type with optional nullable marker
      let typeStr = col.prismaType;
      if (!col.isNotNull && !col.isPrimaryKey) {
        typeStr += '?';
      }

      parts.push(`  ${fieldName}`);
      parts.push(typeStr);

      // Decorators
      if (col.isPrimaryKey) {
        parts.push('@id');
      }

      if (col.isAutoIncrement) {
        parts.push('@default(autoincrement())');
      } else if (col.defaultValue !== null) {
        parts.push(parseDefaultValue(col.defaultValue, col.prismaType));
      }

      if (col.isUnique) {
        parts.push('@unique');
      }

      // Map column name if it differs from field name
      if (fieldName !== col.name) {
        parts.push(`@map("${col.name}")`);
      }

      lines.push(parts.join('  '));
    }

    // @@map if model name differs from table name
    if (table.modelName.toLowerCase() !== table.tableName.toLowerCase()) {
      lines.push('');
      lines.push(`  @@map("${table.tableName}")`);
    }

    lines.push('}');
  }

  return lines.join('\n');
}

// ─── MAIN CONVERT FUNCTION ──────────────────────────────────────────────────

function convertSqlToPrisma(input: string): { code: string; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { code: '', error: null };

  if (trimmed.length > MAX_INPUT_LENGTH) {
    return { code: '', error: `Input exceeds ${(MAX_INPUT_LENGTH / 1000).toFixed(0)}KB limit.` };
  }

  // Basic validation: must contain CREATE TABLE
  if (!/CREATE\s+TABLE/i.test(trimmed)) {
    return { code: '', error: 'No CREATE TABLE statements found. Paste valid SQL DDL.' };
  }

  try {
    const tables = extractTables(trimmed);
    if (tables.length === 0) {
      return { code: '', error: 'Could not parse any CREATE TABLE statements.' };
    }

    const code = generatePrismaSchema(tables);
    return { code, error: null };
  } catch (e) {
    return { code: '', error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function SqlToPrisma() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [error, setError] = useState<string | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const rootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const prismaOutput = useMemo(() => {
    const r = convertSqlToPrisma(debouncedInput);
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
            aria-label="Load example SQL"
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
              <span className="text-sm font-semibold text-slate-300">SQL Input</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {(input.length / 1_000).toFixed(1)}KB
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-[#020617] text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-inset"
            placeholder="CREATE TABLE users ( id SERIAL PRIMARY KEY, ... );"
            spellCheck={false}
            maxLength={MAX_INPUT_LENGTH + 10_000}
            aria-label="SQL input"
          />
        </div>

        {/* Output Panel */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">Prisma Schema Output</span>
            </div>
            <CopyButton
              text={prismaOutput}
              label="Copy Prisma"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
            />
          </div>
          <pre className="flex-1 overflow-auto p-4 bg-[#020617]">
            <code className="text-emerald-300 font-mono text-sm whitespace-pre-wrap leading-relaxed">
              {prismaOutput}
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
