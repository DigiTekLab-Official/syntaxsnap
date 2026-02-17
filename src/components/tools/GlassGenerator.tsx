import React, { useState } from 'react';

export default function GlassGenerator() {
  // 1. The State (The Logic)
  const [blur, setBlur] = useState(16);
  const [transparency, setTransparency] = useState(0.6);
  const [color, setColor] = useState('#ffffff');
  const [outline, setOutline] = useState(true);

  // 2. The CSS Calculator
  const rgbaColor = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const cssOutput = `background: ${rgbaColor(color, transparency)};
backdrop-filter: blur(${blur}px);
-webkit-backdrop-filter: blur(${blur}px);
${outline ? 'border: 1px solid rgba(255, 255, 255, 0.3);' : ''}
border-radius: 16px;
box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      
      {/* LEFT: Controls */}
      <div className="space-y-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Blur ({blur}px)</label>
          <input 
            type="range" min="0" max="40" value={blur} 
            onChange={(e) => setBlur(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Transparency ({Math.round(transparency * 100)}%)</label>
          <input 
            type="range" min="0" max="1" step="0.01" value={transparency} 
            onChange={(e) => setTransparency(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">Base Color</label>
          <div className="flex items-center gap-4">
            <input 
              type="color" value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20 bg-transparent border-none cursor-pointer"
            />
            <span className="text-slate-400 font-mono">{color}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" id="outline" checked={outline} 
            onChange={(e) => setOutline(e.target.checked)}
            className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="outline" className="text-sm font-medium text-slate-300">Add Light Border</label>
        </div>

        {/* Code Output */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CSS Code</span>
            <button 
              onClick={() => navigator.clipboard.writeText(cssOutput)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800">
            {cssOutput}
          </pre>
        </div>
      </div>

      {/* RIGHT: Live Preview */}
      <div className="relative flex items-center justify-center min-h-[400px] rounded-2xl overflow-hidden bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center">
        {/* The Glass Element */}
        <div 
          className="w-64 h-64 flex items-center justify-center text-white font-bold text-lg"
          style={{
            background: rgbaColor(color, transparency),
            backdropFilter: `blur(${blur}px)`,
            WebkitBackdropFilter: `blur(${blur}px)`,
            border: outline ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
            borderRadius: '16px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          }}
        >
          Glass Preview
        </div>
      </div>

    </div>
  );
}