'use client';
import React, { useState, useCallback, useMemo, useId } from 'react';
import { Copy, Check, Trash2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  isPrimaryKey: boolean;
  isUnique: boolean;
  isAutoIncrement: boolean;
}

// ─── SQL Type Mapping ─────────────────────────────────────────────────────────

const SQL_TYPE_MAP: Record<string, { json: string; zod: string }> = {
  'int': { json: 'integer', zod: 'z.number().int()' },
  'integer': { json: 'integer', zod: 'z.number().int()' },
  'tinyint': { json: 'integer', zod: 'z.number().int()' },
  'smallint': { json: 'integer', zod: 'z.number().int()' },
  'mediumint': { json: 'integer', zod: 'z.number().int()' },
  'bigint': { json: 'integer', zod: 'z.number().int()' },
  'float': { json: 'number', zod: 'z.number()' },
  'double': { json: 'number', zod: 'z.number()' },
  'decimal': { json: 'number', zod: 'z.number()' },
  'numeric': { json: 'number', zod: 'z.number()' },
  'real': { json: 'number', zod: 'z.number()' },
  'varchar': { json: 'string', zod: 'z.string()' },
  'char': { json: 'string', zod: 'z.string()' },
  'text': { json: 'string', zod: 'z.string()' },
  'tinytext': { json: 'string', zod: 'z.string()' },
  'mediumtext': { json: 'string', zod: 'z.string()' },
  'longtext': { json: 'string', zod: 'z.string()' },
  'date': { json: 'string', zod: 'z.string().datetime()' },
  'datetime': { json: 'string', zod: 'z.string().datetime()' },
  'timestamp': { json: 'string', zod: 'z.string().datetime()' },
  'time': { json: 'string', zod: 'z.string()' },
  'year': { json: 'integer', zod: 'z.number().int()' },
  'boolean': { json: 'boolean', zod: 'z.boolean()' },
  'bool': { json: 'boolean', zod: 'z.boolean()' },
  'bit': { json: 'boolean', zod: 'z.boolean()' },
  'blob': { json: 'string', zod: 'z.string()' },
  'binary': { json: 'string', zod: 'z.string()' },
  'varbinary': { json: 'string', zod: 'z.string()' },
  'json': { json: 'object', zod: 'z.record(z.unknown())' },
  'jsonb': { json: 'object', zod: 'z.record(z.unknown())' },
};

// ─── Parser Helpers ───────────────────────────────────────────────────────────

function stripComments(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractTableContent(sql: string): { tableName: string; columns: string } | null {
  const match = sql.match(/CREATE\s+TABLE\s+(\w+)\s*\(([^]*)\)/i);
  if (!match) return null;
  const [, tableName, columnDefs] = match;
  return { tableName, columns: columnDefs };
}

function parseColumn(line: string): ColumnDef | null {
  const trimmed = line.trim();
  if (!trimmed || /^(PRIMARY|FOREIGN|UNIQUE|INDEX|KEY|CONSTRAINT)/i.test(trimmed)) {
    return null;
  }

  const nameMatch = trimmed.match(/^[`'"]?(\w+)[`'"]?\s+(\w+)/);
  if (!nameMatch) return null;

  const [, name, baseType] = nameMatch;
  const lowerLine = trimmed.toLowerCase();
  const lowerType = baseType.toLowerCase();

  let maxLength: number | undefined;
  let precision: number | undefined;
  let scale: number | undefined;
  let enumValues: string[] | undefined;

  const lengthMatch = trimmed.match(/\w+\((\d+)\)/);
  if (lengthMatch && (lowerType === 'varchar' || lowerType === 'char')) {
    maxLength = parseInt(lengthMatch[1], 10);
  }

  const precisionMatch = trimmed.match(/\w+\((\d+),\s*(\d+)\)/);
  if (precisionMatch && (lowerType === 'decimal' || lowerType === 'numeric')) {
    precision = parseInt(precisionMatch[1], 10);
    scale = parseInt(precisionMatch[2], 10);
  }

  if (lowerType === 'enum') {
    const enumMatch = trimmed.match(/enum\s*\(([^)]+)\)/i);
    if (enumMatch) {
      enumValues = enumMatch[1].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
    }
  }

  // Improved Nullable check: catch "NOT NULL" regardless of extra spaces
  const nullable = !/\bnot\s+null\b/i.test(trimmed);
  const isPrimaryKey = /primary\s+key/i.test(trimmed);
  const isUnique = /unique/i.test(trimmed);
  const isAutoIncrement = /auto_increment|autoincrement/i.test(trimmed);

  let defaultValue: string | undefined;
  const defaultMatch = trimmed.match(/DEFAULT\s+['"]?([^'",\s\)]+)['"]?/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1];
  }

  return {
    name,
    type: lowerType,
    nullable,
    defaultValue,
    maxLength,
    precision,
    scale,
    enumValues,
    isPrimaryKey,
    isUnique,
    isAutoIncrement,
  };
}

// ─── Generators ──────────────────────────────────────────────────────────────

function generateJsonSchema(tableName: string, columns: ColumnDef[]): string {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const col of columns) {
    const typeInfo = SQL_TYPE_MAP[col.type] || { json: 'string', zod: 'z.string()' };
    const prop: any = { type: typeInfo.json };

    if (col.enumValues) {
      prop.enum = col.enumValues;
      delete prop.type;
    }

    if (col.maxLength) prop.maxLength = col.maxLength;
    if (col.precision && col.scale) prop.description = `DECIMAL(${col.precision},${col.scale})`;
    if (col.defaultValue) prop.default = col.defaultValue;

    const meta: string[] = [];
    if (col.isPrimaryKey) meta.push('PRIMARY KEY');
    if (col.isUnique) meta.push('UNIQUE');
    if (col.isAutoIncrement) meta.push('AUTO_INCREMENT');
    if (meta.length > 0) {
      prop.description = (prop.description ? prop.description + ' | ' : '') + meta.join(', ');
    }

    properties[col.name] = prop;
    if (!col.nullable) required.push(col.name);
  }

  const schema: any = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: tableName,
    type: 'object',
    properties,
  };

  if (required.length > 0) schema.required = required;
  return JSON.stringify(schema, null, 2);
}

function generateZodSchema(tableName: string, columns: ColumnDef[]): string {
  const pascalCase = tableName.charAt(0).toUpperCase() + tableName.slice(1);
  let code = `import { z } from "zod";\n\nexport const ${pascalCase}Schema = z.object({\n`;

  for (const col of columns) {
    const typeInfo = SQL_TYPE_MAP[col.type] || { json: 'string', zod: 'z.string()' };
    let zodType = typeInfo.zod;

    if (col.enumValues) {
      const values = col.enumValues.map((v) => `"${v}"`).join(', ');
      zodType = `z.enum([${values}])`;
    }

    // FIX 1: Correctly replace the closing parenthesis for z.string()
    if (col.maxLength && zodType.includes('z.string()')) {
      zodType = zodType.replace('z.string()', `z.string().max(${col.maxLength})`);
    }

    if (col.defaultValue) {
      const quoteDefault = ['string', 'varchar', 'char', 'text'].includes(col.type);
      const defaultStr = quoteDefault ? `"${col.defaultValue}"` : col.defaultValue;
      zodType += `.default(${defaultStr})`;
    }

    // FIX 2: Only add .optional() if nullable is true
    if (col.nullable) {
      zodType += '.optional()';
    }

    code += `  ${col.name}: ${zodType},\n`;
  }

  code += '});\n\n';
  code += `export type ${pascalCase} = z.infer<typeof ${pascalCase}Schema>;`;
  return code;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SAMPLE_SQL = `CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  age INT CHECK (age >= 18),
  status ENUM('active', 'pending', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

export default function SqlToJson() {
  const [sql, setSql] = useState(SAMPLE_SQL);
  const [activeTab, setActiveTab] = useState<'json' | 'zod'>('json');
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const textareaId = useId();
  const debouncedSql = useDebounce(sql, 300);

  const { jsonSchema, zodSchema, error } = useMemo(() => {
    if (!debouncedSql.trim()) {
      return {
        jsonSchema: '{}',
        zodSchema: 'import { z } from "zod";\n\nexport const Schema = z.object({});',
        error: null,
      };
    }

    try {
      const cleaned = stripComments(debouncedSql);
      const extracted = extractTableContent(cleaned);

      if (!extracted) {
        return {
          jsonSchema: '{}',
          zodSchema: 'import { z } from "zod";\n\nexport const Schema = z.object({});',
          error: 'No valid CREATE TABLE statement found.',
        };
      }

      // Split by comma but handle commas inside parentheses (like DECIMAL(10,2))
      const lines = extracted.columns.split(/,(?![^\(]*\))/).filter((l) => l.trim());
      const columns: ColumnDef[] = lines.map(parseColumn).filter((c): c is ColumnDef => c !== null);

      if (columns.length === 0) {
        return {
          jsonSchema: '{}',
          zodSchema: 'import { z } from "zod";\n\nexport const Schema = z.object({});',
          error: 'No columns found in CREATE TABLE definition.',
        };
      }

      return {
        jsonSchema: generateJsonSchema(extracted.tableName, columns),
        zodSchema: generateZodSchema(extracted.tableName, columns),
        error: null,
      };
    } catch (err) {
      return {
        jsonSchema: '{}',
        zodSchema: 'import { z } from "zod";\n\nexport const Schema = z.object({});',
        error: err instanceof Error ? err.message : 'Unknown parsing error.',
      };
    }
  }, [debouncedSql]);

  const handleCopy = useCallback(async () => {
    const textToCopy = activeTab === 'json' ? jsonSchema : zodSchema;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopyState('success');
    } catch {
      setCopyState('error');
    } finally {
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [activeTab, jsonSchema, zodSchema]);

  const currentOutput = activeTab === 'json' ? jsonSchema : zodSchema;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor={textareaId} className="text-sm font-medium text-slate-400">SQL Input</label>
            <button
              type="button"
              onClick={() => setSql('')}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors rounded px-2 py-1"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden /> Clear
            </button>
          </div>
          <textarea
            id={textareaId}
            className="w-full h-[450px] p-4 bg-slate-900 border border-slate-800 rounded-xl font-mono text-sm text-indigo-300 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <div role="tablist" className="flex gap-2">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'json'}
                onClick={() => setActiveTab('json')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'json' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                JSON Schema
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'zod'}
                onClick={() => setActiveTab('zod')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'zod' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Zod Schema
              </button>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!currentOutput || currentOutput === '{}'}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 px-3 py-1.5 rounded transition-colors"
            >
              {copyState === 'success' ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : 
               copyState === 'error' ? <><Copy className="w-3.5 h-3.5 text-red-400" /> Failed</> : 
               <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>

          {error && (
            <div role="alert" className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200 mb-2">
              {error}
            </div>
          )}

          <pre id="output-panel" role="tabpanel" className="w-full h-[415px] p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-emerald-400 overflow-auto leading-relaxed">
            {currentOutput}
          </pre>
        </div>
      </div>
    </div>
  );
}