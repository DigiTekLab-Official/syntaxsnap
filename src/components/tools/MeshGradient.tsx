'use client';
import React, { useState } from 'react';
import { Shuffle, Copy, Check, Palette, RotateCcw, Sparkles } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getRandomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

const PRESETS = {
  'Neon Night':  ['#ff0080', '#7928ca', '#4299e1', '#ffffff', '#1a202c'],
  'Sunset':      ['#ff4d4d', '#f9cb28', '#ff9a9e', '#fad0c4', '#4a192c'],
  'Oceanic':     ['#00c6ff', '#0072ff', '#00c6ff', '#2a5298', '#0f172a'],
  'Deep Space':  ['#8ec5fc', '#e0c3fc', '#4338ca', '#818cf8', '#0f172a'],
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MeshGradient() {
  // State: 4 corners + background
  const [colors, setColors] = useState<string[]>(PRESETS['Neon Night']);
  const [copied, setCopied] = useState(false);

  const [c1, c2, c3, c4, bg] = colors;

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = value;
    setColors(newColors);
  };

  const handleRandomize = () => {
    setColors([getRandomColor(), getRandomColor(), getRandomColor(), getRandomColor(), getRandomColor()]);
  };

  const cssOutput = `background-color: ${bg};
background-image: 
  radial-gradient(at 0% 0%, ${c1} 0px, transparent 50%),
  radial-gradient(at 100% 0%, ${c2} 0px, transparent 50%),
  radial-gradient(at 100% 100%, ${c3} 0px, transparent 50%),
  radial-gradient(at 0% 100%, ${c4} 0px, transparent 50%);`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[550px]">
      
      {/* ─── LEFT: Controls ────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Palette className="w-4 h-4 text-indigo-400" /> Colors
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setColors(PRESETS['Neon Night'])}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={handleRandomize}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Shuffle className="w-3.5 h-3.5" /> Randomize
            </button>
          </div>
        </div>

        {/* Color Grid */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Top Left', idx: 0 },
            { label: 'Top Right', idx: 1 },
            { label: 'Bottom Right', idx: 2 },
            { label: 'Bottom Left', idx: 3 },
          ].map(({ label, idx }) => (
            <div key={idx} className="group">
              <label className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1.5 block group-hover:text-indigo-400 transition-colors">{label}</label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-lg group-focus-within:border-indigo-500/50 transition-colors">
                <input 
                  type="color" 
                  value={colors[idx]} 
                  onChange={(e) => handleColorChange(idx, e.target.value)} 
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0"
                />
                <span className="text-xs font-mono text-slate-400 uppercase">{colors[idx]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Background Color */}
        <div className="pt-4 border-t border-slate-800">
          <label className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2 block">Base Background</label>
          <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 p-2 rounded-lg">
            <input 
              type="color" 
              value={bg} 
              onChange={(e) => handleColorChange(4, e.target.value)} 
              className="w-full h-8 rounded cursor-pointer bg-transparent border-none p-0"
            />
          </div>
        </div>

        {/* Presets */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-2 block">Quick Presets</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(PRESETS).map(([name, vals]) => (
              <button
                key={name}
                onClick={() => setColors(vals)}
                className="h-8 rounded-md border border-slate-700 hover:border-white/50 transition-all relative overflow-hidden group"
                title={name}
              >
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(to bottom right, ${vals[0]}, ${vals[2]})`
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="mt-auto pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">CSS Output</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${copied ? 'text-emerald-400' : 'text-indigo-400 hover:text-indigo-300'}`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy CSS</>}
            </button>
          </div>
          <pre className="bg-slate-950 p-3 rounded-lg text-[10px] text-slate-400 font-mono overflow-x-auto border border-slate-800 whitespace-pre">
            {cssOutput}
          </pre>
        </div>
      </div>

      {/* ─── RIGHT: Preview ────────────────────────────────────────────── */}
      <div 
        className="rounded-2xl shadow-2xl border border-slate-800 w-full h-full min-h-[400px] flex items-center justify-center relative overflow-hidden transition-all duration-500"
        style={{
          backgroundColor: bg,
          backgroundImage: `
            radial-gradient(at 0% 0%, ${c1} 0px, transparent 50%),
            radial-gradient(at 100% 0%, ${c2} 0px, transparent 50%),
            radial-gradient(at 100% 100%, ${c3} 0px, transparent 50%),
            radial-gradient(at 0% 100%, ${c4} 0px, transparent 50%)
          `
        }}
      >
        <div className="text-center space-y-2 mix-blend-overlay opacity-90">
           <Sparkles className="w-12 h-12 text-white mx-auto" />
           <p className="text-white text-lg font-bold tracking-tight">Mesh Gradient</p>
        </div>
        
        {/* Floating noise texture hint */}
        <div className="absolute bottom-4 right-4 text-[10px] text-white/40 font-mono">
          pro tip: add noise for texture
        </div>
      </div>

    </div>
  );
}