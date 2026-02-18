'use client';
import React, { useState, useEffect } from 'react';
import { Copy, Check, Trash2, FileJson, AlertCircle, Braces } from 'lucide-react';

// ─── Type Inference Engine ───────────────────────────────────────────────────

function inferZodType(value: unknown, depth = 0): string {
  if (depth > 20) return 'z.any()'; // Prevent stack overflow

  if (value === null) return 'z.null()';
  if (value === undefined) return 'z.undefined()';

  switch (typeof value) {
    case 'string':  return 'z.string()';
    case 'number':  return Number.isInteger(value) ? 'z.number().int()' : 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'bigint':  return 'z.bigint()';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'z.array(z.unknown())';

    // Get unique types from the array
    const itemTypes = [...new Set(value.map((item) => inferZodType(item, depth + 1)))];
    
    // If all items are the same type, return array of that type
    if (itemTypes.length === 1) return `z.array(${itemTypes[0]})`;

    // If mixed types, create a union
    return `z.array(z.union([${itemTypes.join(', ')}]))`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return 'z.object({})';

    const indent = '  '.repeat(depth + 1);
    const closing = '  '.repeat(depth); // Maintain indentation

    const fields = entries.map(([key, val]) => {
      // Handle keys that need quotes (e.g., "my-key" or "123")
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      return `${indent}${safeKey}: ${inferZodType(val, depth + 1)}`;
    });

    return `z.object({\n${fields.join(',\n')}\n${closing}})`;
  }

  return 'z.any()';
}

// ─── Main Component ──────────────────────────────────────────────────────────

const DEFAULT_INPUT = `{
  "userId": 1,
  "username": "ameer_dev",
  "isAdmin": true,
  "roles": ["admin", "editor"],
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}`;

export default function JsonToZod() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ─── Chrome Extension Integration ──────────────────────────────────────────
  // Listens for ?input=... in the URL (sent by the extension)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingText = params.get('input');
    
    if (incomingText) {
      setInput(incomingText);
      // Clean up URL to remove the query param after loading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  // Auto-generate schema when input changes
  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const schemaBody = inferZodType(parsed);
      const fullSchema = `import { z } from "zod";\n\nconst Schema = ${schemaBody};\n\ntype Schema = z.infer<typeof Schema>;`;
      
      setOutput(fullSchema);
      setError(null);
    } catch (err) {
      setError('Invalid JSON');
    }
  }, [input]);

  // Copy Handler
  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format Handler
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {
      // Ignore format errors if JSON is invalid
    }
  };

  // Clear Handler
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-150">
      
      {/* ─── LEFT: Input ───────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <FileJson className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">JSON Input</span>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handleFormat}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Format JSON"
            >
              <Braces className="w-4 h-4" />
            </button>
            <button 
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Clear"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste your JSON here..."
            className="w-full h-full bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed"
          />
          
          {error && (
            <div className="absolute bottom-4 right-4 bg-red-900/90 border border-red-500/50 text-red-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur shadow-lg animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Output ─────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg relative">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2 text-indigo-400">
            <Braces className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Zod Schema</span>
          </div>

          <button
            onClick={handleCopy}
            disabled={!output}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${copied 
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/50' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 shadow-lg'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {copied ? (
              <> <Check className="w-3.5 h-3.5" /> Copied </>
            ) : (
              <> <Copy className="w-3.5 h-3.5" /> Copy Code </>
            )}
          </button>
        </div>

        <div className="flex-1 relative overflow-auto bg-[#0B1120]">
          {output ? (
            <pre className="p-4 font-mono text-sm text-blue-300 leading-relaxed">
              {output}
            </pre>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-3">
              <FileJson className="w-10 h-10 opacity-20" />
              <p className="text-sm">Waiting for valid JSON...</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}