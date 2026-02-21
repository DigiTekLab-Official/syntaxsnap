// src/components/tools/AiMockGenerator.tsx
import React, { useState } from 'react';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { parseOpenAPI } from '../../utils/openapiParser';

export default function AiMockGenerator() {
  const [mode, setMode] = useState<'prompt' | 'openapi'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [openApiInput, setOpenApiInput] = useState('');
  const [rowCount, setRowCount] = useState(5);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { copiedText, copy } = useCopyToClipboard();

  const handleGenerate = async () => {
    setError('');
    setResult('');
    setLoading(true);

    try {
      let finalPrompt = prompt;

      // Handle OpenAPI parsing if in OpenAPI mode
      if (mode === 'openapi') {
        if (!openApiInput.trim()) throw new Error('Please paste an OpenAPI schema.');
        const parsedSchema = parseOpenAPI(openApiInput);
        finalPrompt = `Based on this OpenAPI schema, generate strictly typed mock data: ${parsedSchema}`;
      } else {
        if (!prompt.trim()) throw new Error('Please enter a description of the data you need.');
      }

      // Call your Astro Hybrid API Route
      const response = await fetch('/api/generate-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, rowCount })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate data from API.');
      }

      // Format the successful JSON response
      setResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Mode Toggle */}
      <div className="flex bg-slate-900 p-1 rounded-lg w-fit border border-slate-800">
        <button
          onClick={() => setMode('prompt')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'prompt' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Natural Language
        </button>
        <button
          onClick={() => setMode('openapi')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'openapi' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          OpenAPI Schema
        </button>
      </div>

      {/* Input Area */}
      {mode === 'prompt' ? (
        <textarea
          className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
          rows={5}
          placeholder="e.g., Generate a list of users with id, firstName, lastName, email, and isActive status."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      ) : (
        <textarea
          className="w-full p-4 bg-slate-900 border border-slate-700 rounded-lg font-mono text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
          rows={8}
          placeholder="Paste your OpenAPI v3 JSON or YAML here..."
          value={openApiInput}
          onChange={(e) => setOpenApiInput(e.target.value)}
        />
      )}

      {/* Controls & Generate Button */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex items-center gap-3 w-full sm:w-auto bg-slate-900 border border-slate-700 rounded-lg px-4 py-2">
          <label className="text-sm text-slate-400 whitespace-nowrap">Row Count:</label>
          <input
            type="number"
            min="1"
            max="100"
            className="bg-transparent text-white w-16 outline-none font-mono"
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-3 px-6 rounded-lg transition-colors flex justify-center items-center gap-2"
        >
          {loading ? (
            <span className="animate-pulse">Generating Data...</span>
          ) : (
            'Generate Data'
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="relative group mt-4">
          <button
            onClick={() => copy(result)}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-xs text-white px-3 py-1.5 rounded border border-slate-600 z-10 transition-colors"
          >
            {copiedText === result ? 'Copied!' : 'Copy JSON'}
          </button>
          <pre className="p-6 pt-14 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto shadow-2xl max-h-[500px] overflow-y-auto">
            <code className="text-emerald-300 text-sm font-mono">{result}</code>
          </pre>
        </div>
      )}
    </div>
  );
}