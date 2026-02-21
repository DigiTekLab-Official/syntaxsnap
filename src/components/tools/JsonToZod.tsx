import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Copy, Check, Trash2, FileJson, AlertCircle, Braces, AlertTriangle } from 'lucide-react';
import CopyButton from '../ui/CopyButton';

// ─── Type Inference Engine ───────────────────────────────────────────────────

function inferZodType(value: unknown, depth = 0): { typeString: string; hitDepthLimit: boolean } {
  if (depth > 20) return { typeString: 'z.any()', hitDepthLimit: true }; // Prevent stack overflow

  if (value === null) return { typeString: 'z.null()', hitDepthLimit: false };
  if (value === undefined) return { typeString: 'z.undefined()', hitDepthLimit: false };

  switch (typeof value) {
    case 'string':  return { typeString: 'z.string()', hitDepthLimit: false };
    case 'number':  
      // Handle BigInt edge case implicitly by checking safe integer bounds
      if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        return { typeString: 'z.number({ message: "Unsafe integer range" })', hitDepthLimit: false };
      }
      return { typeString: Number.isInteger(value) ? 'z.number().int()' : 'z.number()', hitDepthLimit: false };
    case 'boolean': return { typeString: 'z.boolean()', hitDepthLimit: false };
    case 'bigint':  return { typeString: 'z.bigint()', hitDepthLimit: false };
  }

  let hitLimit = false;

  if (Array.isArray(value)) {
    if (value.length === 0) return { typeString: 'z.array(z.unknown())', hitDepthLimit: false };

    const itemResults = value.map((item) => inferZodType(item, depth + 1));
    hitLimit = itemResults.some(r => r.hitDepthLimit);
    
    // Get unique types from the array
    const itemTypes = [...new Set(itemResults.map(r => r.typeString))];
    
    // If all items are the same type, return array of that type
    if (itemTypes.length === 1) return { typeString: `z.array(${itemTypes[0]})`, hitDepthLimit: hitLimit };

    // If mixed types, create a union
    return { typeString: `z.array(z.union([${itemTypes.join(', ')}]))`, hitDepthLimit: hitLimit };
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return { typeString: 'z.object({})', hitDepthLimit: false };

    const indent = '  '.repeat(depth + 1);
    const closing = '  '.repeat(depth);

    const fields = entries.map(([key, val]) => {
      const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
      const result = inferZodType(val, depth + 1);
      if (result.hitDepthLimit) hitLimit = true;
      return `${indent}${safeKey}: ${result.typeString}`;
    });

    return { typeString: `z.object({\n${fields.join(',\n')}\n${closing}})`, hitDepthLimit: hitLimit };
  }

  return { typeString: 'z.any()', hitDepthLimit: false };
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
  const [warning, setWarning] = useState<string | null>(null);

  // Apply 300ms debounce to prevent freezing on large JSON files
  const debouncedInput = useDebounce(input, 300);

  // ─── Chrome Extension Integration ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingText = params.get('input');
    
    if (incomingText) {
      setInput(incomingText);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  // Auto-generate schema when debounced input changes
  useEffect(() => {
    setWarning(null); // Clear previous warnings
    
    if (!debouncedInput.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    // Large File Warning (1MB = ~1,000,000 characters)
    if (debouncedInput.length > 1000000) {
      setWarning('File is over 1MB. Processing may slow down your device.');
    }

    try {
      const parsed = JSON.parse(debouncedInput);
      const { typeString, hitDepthLimit } = inferZodType(parsed);
      
      if (hitDepthLimit) {
        setWarning('JSON is nested over 20 levels deep. Deeper objects inferred as z.any().');
      }

      const fullSchema = `import { z } from "zod";\n\nconst Schema = ${typeString};\n\ntype Schema = z.infer<typeof Schema>;`;
      
      setOutput(fullSchema);
      setError(null);
    } catch (err) {
      setError('Invalid JSON');
    }
  }, [debouncedInput]);

  // Copy handled by shared `CopyButton` component

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
    setWarning(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-150">
      
      {/* ─── LEFT: Input ───────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-sm relative">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center z-10">
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

        {/* System Warnings */}
        {warning && (
          <div className="bg-yellow-900/20 border-b border-yellow-500/50 px-4 py-2 flex items-center gap-2 text-yellow-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div className="relative flex-1 group">
          <label htmlFor="jsonInputTextarea" className="sr-only">JSON Input</label>
          <textarea
            id="jsonInputTextarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder="Paste your JSON here..."
            className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed"
          />
          {error && (
            <div className="absolute bottom-4 right-4 bg-red-900/90 border border-red-500/50 text-red-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur shadow-lg animate-in fade-in slide-in-from-bottom-2 z-20">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Output ─────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg relative">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-indigo-400">
            <Braces className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Zod Schema</span>
          </div>

          <CopyButton text={output} label="Copy Code" />
        </div>

        <div className="flex-1 relative overflow-auto bg-[#0B1120]">
          {output ? (
            <pre className="absolute inset-0 p-4 font-mono text-sm text-blue-300 leading-relaxed overflow-auto">
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