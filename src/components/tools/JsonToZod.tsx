import React, { useState, useEffect } from 'react';

export default function JsonToZod() {
  const [input, setInput] = useState('{\n  "userId": 1,\n  "username": "ameer_dev",\n  "isAdmin": true,\n  "roles": ["admin", "editor"]\n}');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // The Magic Logic: Infers Zod Schema from JSON
  const inferType = (data: any): string => {
    if (data === null) return "z.null()";
    if (typeof data === "string") return "z.string()";
    if (typeof data === "number") return "z.number()";
    if (typeof data === "boolean") return "z.boolean()";
    
    if (Array.isArray(data)) {
      if (data.length === 0) return "z.array(z.any())";
      return `z.array(${inferType(data[0])})`;
    }

    if (typeof data === "object") {
      const keys = Object.keys(data).map((key) => {
        return `  ${key}: ${inferType(data[key])}`;
      });
      return `z.object({\n${keys.join(",\n")}\n})`;
    }

    return "z.any()";
  };

  useEffect(() => {
    try {
      if (!input.trim()) {
        setOutput('');
        setError('');
        return;
      }
      const parsed = JSON.parse(input);
      const schema = `import { z } from "zod";\n\nconst Schema = ${inferType(parsed)};`;
      setOutput(schema);
      setError('');
    } catch (e) {
      setError('Invalid JSON');
    }
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
      
      {/* LEFT: JSON Input */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-400">INPUT (JSON)</span>
          {error && <span className="text-xs text-red-400 font-mono bg-red-900/20 px-2 py-1 rounded">{error}</span>}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none"
          spellCheck={false}
          placeholder="Paste your JSON here..."
        />
      </div>

      {/* RIGHT: Zod Output */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
          <span className="text-sm font-semibold text-indigo-400">OUTPUT (Zod Schema)</span>
          <button 
            onClick={handleCopy}
            className="text-xs flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors"
          >
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
        <pre className="flex-1 p-4 font-mono text-sm text-blue-300 overflow-auto">
          {output || <span className="text-slate-600">// Waiting for valid JSON...</span>}
        </pre>
      </div>

    </div>
  );
}