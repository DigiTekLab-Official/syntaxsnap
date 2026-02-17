import React, { useState } from 'react';

export default function MeshGradient() {
  // State for the 4 mesh points + background
  const [c1, setC1] = useState('#ff0080'); // Pink
  const [c2, setC2] = useState('#7928ca'); // Purple
  const [c3, setC3] = useState('#4299e1'); // Blue
  const [c4, setC4] = useState('#ffffff'); // White accent
  const [bg, setBg] = useState('#1a202c'); // Dark base

  // The CSS Generator Logic
  const generateCSS = () => {
    return `background-color: ${bg};
background-image: 
  radial-gradient(at 0% 0%, ${c1} 0px, transparent 50%),
  radial-gradient(at 100% 0%, ${c2} 0px, transparent 50%),
  radial-gradient(at 100% 100%, ${c3} 0px, transparent 50%),
  radial-gradient(at 0% 100%, ${c4} 0px, transparent 50%);`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCSS());
    alert("CSS Copied!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
      
      {/* LEFT: Controls */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
        <h3 className="text-slate-300 font-semibold mb-4">Customize Colors</h3>
        
        {/* Color Pickers Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase">Top Left</label>
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
              <input type="color" value={c1} onChange={(e) => setC1(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
              <span className="text-xs font-mono text-slate-400">{c1}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase">Top Right</label>
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
              <input type="color" value={c2} onChange={(e) => setC2(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
              <span className="text-xs font-mono text-slate-400">{c2}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase">Bottom Right</label>
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
              <input type="color" value={c3} onChange={(e) => setC3(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
              <span className="text-xs font-mono text-slate-400">{c3}</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500 uppercase">Bottom Left</label>
            <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
              <input type="color" value={c4} onChange={(e) => setC4(e.target.value)} className="w-8 h-8 bg-transparent border-none cursor-pointer"/>
              <span className="text-xs font-mono text-slate-400">{c4}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t border-slate-800">
          <label className="text-xs text-slate-500 uppercase">Base Background</label>
          <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-full h-8 bg-transparent border-none cursor-pointer"/>
          </div>
        </div>

        {/* Code Output */}
        <div className="pt-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">CSS Output</span>
                <button onClick={copyToClipboard} className="text-xs text-indigo-400 hover:text-indigo-300">Copy CSS</button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800 whitespace-pre-wrap">
                {generateCSS()}
            </pre>
        </div>
      </div>

      {/* RIGHT: Preview */}
      <div 
        className="rounded-2xl shadow-2xl border border-slate-700/50 w-full h-full min-h-[400px] flex items-center justify-center relative overflow-hidden group"
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
        <span className="bg-black/20 backdrop-blur-md text-white px-6 py-3 rounded-full font-medium border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            Beautiful, isn't it?
        </span>
      </div>

    </div>
  );
}