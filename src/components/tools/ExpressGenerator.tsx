// src/components/tools/ExpressGenerator.tsx
import React, { useState } from 'react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { generateMockServer } from '../../utils/openapiParser';

export default function ExpressGenerator() {
  const [input, setInput] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const { copiedText, copy } = useCopyToClipboard();

  const handleConvert = () => {
    setError('');
    if (!input.trim()) {
      setError('Please paste an OpenAPI schema first.');
      return;
    }
    const result = generateMockServer(input);
    if (result.startsWith('// Error')) {
      setError('Invalid Schema: Could not parse OpenAPI structure.');
    } else {
      setCode(result);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <textarea
        className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
        rows={10}
        placeholder="Paste OpenAPI JSON or YAML here..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleConvert}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
      >
        Generate Express Server
      </button>

      {error && <p className="text-red-400 bg-red-900/20 p-3 rounded border border-red-800">{error}</p>}

      {code && (
        <div className="relative group">
          <button
            onClick={() => copy(code)}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-1 rounded border border-slate-600 z-10"
          >
            {copiedText === code ? 'Copied!' : 'Copy Code'}
          </button>
          <pre className="p-6 pt-14 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto shadow-2xl">
            <code className="text-blue-300 text-sm">{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}