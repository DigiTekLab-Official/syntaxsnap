import React, { useState, useMemo } from 'react';

export default function RegexTester() {
  const [pattern, setPattern] = useState(String.raw`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`);
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Contact us at support@syntaxsnap.com or admin@test.org for help.");

  // The Match Logic
  const highlightedText = useMemo(() => {
    if (!pattern || !text) return text;
    try {
      const regex = new RegExp(pattern, flags);
      const parts = text.split(regex);
      const matches = text.match(regex);
      
      if (!matches) return text;

      // Reconstruct string with highlights
      return parts.reduce((acc, part, i) => {
        if (i === parts.length - 1) return acc + part;
        return acc + part + `<mark class="bg-indigo-500/50 text-white rounded px-0.5">${matches[i] || ''}</mark>`;
      }, "");
    } catch (e) {
      return text; // Return plain text if regex is invalid
    }
  }, [pattern, flags, text]);

  return (
    <div className="grid grid-cols-1 gap-6">
      
      {/* Controls */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div>
            <label className="text-xs text-slate-500 uppercase font-semibold">Regex Pattern</label>
            <div className="flex gap-2 mt-2">
                <span className="flex items-center text-slate-500 font-mono text-lg">/</span>
                <input 
                    type="text" 
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 font-mono text-indigo-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="flex items-center text-slate-500 font-mono text-lg">/</span>
                <input 
                    type="text" 
                    value={flags}
                    onChange={(e) => setFlags(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 font-mono text-slate-400 focus:outline-none focus:border-indigo-500"
                    placeholder="g"
                />
            </div>
        </div>
      </div>

      {/* Test Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
        
        {/* Input Text */}
        <div className="flex flex-col">
            <label className="text-xs text-slate-500 uppercase font-semibold mb-2">Test String</label>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none"
                placeholder="Paste your text here..."
            />
        </div>

        {/* Output Highlights */}
        <div className="flex flex-col">
            <label className="text-xs text-slate-500 uppercase font-semibold mb-2">Match Results</label>
            <div 
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-400 overflow-auto whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightedText }}
            />
        </div>

      </div>

    </div>
  );
}