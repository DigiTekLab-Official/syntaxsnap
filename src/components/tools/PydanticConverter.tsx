"use client";
import { useState } from 'react';
import { pydanticToZod } from '../../utils/pydanticToZod';

export default function PydanticConverter() {
  const [inputJson, setInputJson] = useState('');
  const [outputZod, setOutputZod] = useState('// Your Zod schema will appear here');
  const [error, setError] = useState('');

  const handleConvert = () => {
    setError('');
    try {
      if (!inputJson.trim()) {
        setOutputZod('// Please paste a valid Pydantic JSON schema');
        return;
      }
      const parsedJson = JSON.parse(inputJson);
      
      // Auto-wrap the result with the Zod import
      const zodCode = `import { z } from "zod";\n\nconst Schema = ${pydanticToZod(parsedJson)};\n\nexport type SchemaType = z.infer<typeof Schema>;`;
      
      setOutputZod(zodCode);
    } catch (err) {
      setError('Invalid JSON. Please ensure you copied the exact output from model_json_schema()');
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-6xl mx-auto mt-8">
      {/* Input Panel */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-300">FastAPI / Pydantic JSON Output</label>
        <textarea
          className="w-full h-[500px] p-4 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg font-mono text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
          placeholder='{"type": "object", "properties": {...}}'
          value={inputJson}
          onChange={(e) => setInputJson(e.target.value)}
          spellCheck={false}
        />
        <button
          onClick={handleConvert}
          className="mt-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors"
        >
          Convert to Zod
        </button>
        {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      </div>

      {/* Output Panel */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-300">Zod + TypeScript Output</label>
        <textarea
          className="w-full h-[500px] p-4 bg-slate-900 text-cyan-300 border border-slate-700 rounded-lg font-mono text-sm outline-none"
          value={outputZod}
          readOnly
          spellCheck={false}
        />
      </div>
    </div>
  );
}