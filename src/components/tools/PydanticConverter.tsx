'use client';
import React, { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Braces, FileJson, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import CopyButton from '../ui/CopyButton';
import { convertPydanticToZod, MAX_INPUT_CHARS, type JsonSchemaNode } from '../../utils/pydanticToZod';

// ─── Default example ─────────────────────────────────────────────────────────

const DEFAULT_INPUT = `{
  "$defs": {
    "Address": {
      "properties": {
        "street": { "title": "Street", "type": "string" },
        "city":   { "title": "City",   "type": "string" }
      },
      "required": ["street", "city"],
      "title": "Address",
      "type": "object"
    }
  },
  "properties": {
    "name":    { "title": "Name",  "type": "string" },
    "age":     { "title": "Age",   "type": "integer", "minimum": 0 },
    "email":   { "anyOf": [{ "type": "string", "format": "email" }, { "type": "null" }], "default": null },
    "address": { "$ref": "#/$defs/Address" },
    "tags":    { "items": { "type": "string" }, "title": "Tags", "type": "array" }
  },
  "required": ["name", "age"],
  "title": "User",
  "type": "object"
}`;

// ─── Component ───────────────────────────────────────────────────────────────

export default function PydanticConverter() {
  const [input, setInput]     = useState(DEFAULT_INPUT);
  const [output, setOutput]   = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Debounce input to avoid freezing on large schemas
  const debouncedInput = useDebounce(input, 300);

  // ── Chrome Extension / URL param integration ─────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('input');
    if (incoming) {
      setInput(incoming);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // ── Auto-convert whenever debounced input changes ─────────────────────────
  useEffect(() => {
    setWarning(null);

    if (!debouncedInput.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    if (debouncedInput.length > MAX_INPUT_CHARS) {
      setWarning('Input is over 1 MB. Processing may be slow on low-end devices.');
    }

    try {
      const parsed = JSON.parse(debouncedInput) as JsonSchemaNode;
      const { code, warnings } = convertPydanticToZod(parsed);

      if (warnings.length > 0) {
        setWarning(warnings[0]);
      }

      setOutput(code);
      setError(null);
    } catch {
      setError('Invalid JSON — paste the exact output from Model.model_json_schema()');
    }
  }, [debouncedInput]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFormat = () => {
    try {
      setInput(JSON.stringify(JSON.parse(input), null, 2));
    } catch {
      // Ignore if input is not yet valid JSON
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError(null);
    setWarning(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-150">

      {/* ─── LEFT: Input ─────────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-sm relative">
        <div className="bg-slate-900/80 backdrop-blur px-4 py-3 border-b border-slate-800 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-slate-400">
            <FileJson className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Pydantic JSON Schema</span>
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

        {warning && (
          <div className="bg-yellow-900/20 border-b border-yellow-500/50 px-4 py-2 flex items-center gap-2 text-yellow-400 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        <div className="relative flex-1 group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder='Paste model_json_schema() output here…'
            className="absolute inset-0 w-full h-full bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed"
          />

          {error && (
            <div className="absolute bottom-4 right-4 bg-red-900/90 border border-red-500/50 text-red-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 backdrop-blur shadow-lg z-20">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ─── RIGHT: Output ───────────────────────────────────────────────── */}
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
              <p className="text-sm">Waiting for valid Pydantic schema…</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}