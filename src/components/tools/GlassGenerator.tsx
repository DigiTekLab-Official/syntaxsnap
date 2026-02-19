'use client';
import React, { useState, useCallback } from 'react';
import { Copy, Check, RotateCcw, Layers, Image as ImageIcon, Sparkles, Box } from 'lucide-react';

// ─── Types & Defaults ────────────────────────────────────────────────────────
interface GlassConfig {
  blur: number;
  transparency: number;
  color: string;
  saturation: number;
  borderOpacity: number;
  shadowIntensity: number;
  borderRadius: number;
  outline: boolean;
  noiseTint: boolean;
}

const DEFAULTS: GlassConfig = {
  blur: 16,
  transparency: 0.25,
  color: '#ffffff',
  saturation: 180,
  borderOpacity: 0.3,
  shadowIntensity: 20,
  borderRadius: 24,
  outline: true,
  noiseTint: false,
};

const PRESETS = {
  frosted: { ...DEFAULTS, blur: 16, transparency: 0.25, saturation: 180 },
  crystal: { ...DEFAULTS, blur: 4, transparency: 0.1, borderOpacity: 0.6, saturation: 110 },
  liquid:  { ...DEFAULTS, blur: 40, transparency: 0.6, borderRadius: 32, saturation: 200, borderOpacity: 0.1 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function buildRgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255, 255, 255, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function buildCss(cfg: GlassConfig) {
  const lines = [
    `/* Glassmorphism Effect */`,
    `background: ${buildRgba(cfg.color, cfg.transparency)};`,
    `backdrop-filter: blur(${cfg.blur}px) saturate(${cfg.saturation}%);`,
    `-webkit-backdrop-filter: blur(${cfg.blur}px) saturate(${cfg.saturation}%);`,
  ];

  if (cfg.outline) {
    lines.push(`border: 1px solid rgba(255, 255, 255, ${cfg.borderOpacity});`);
  } else {
    lines.push(`border: none;`);
  }

  lines.push(`border-radius: ${cfg.borderRadius}px;`);
  
  if (cfg.shadowIntensity > 0) {
    lines.push(`box-shadow: 0 ${Math.round(cfg.shadowIntensity * 0.4)}px ${cfg.shadowIntensity}px rgba(0, 0, 0, ${(cfg.shadowIntensity / 100).toFixed(2)});`);
  }

  return lines.join('\n');
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, unit = '', onChange }: any) {
  return (
    <div className="group">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-medium text-slate-400 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">{label}</label>
        <span className="text-xs font-mono text-slate-500 tabular-nums bg-slate-800 px-1.5 py-0.5 rounded">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function GlassGenerator() {
  const [cfg, setCfg] = useState<GlassConfig>(DEFAULTS);
  const [bgIndex, setBgIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Background options for testing - Replaced Unsplash URLs with local CSS gradients for Privacy
  const backgrounds = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
    'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)'
  ];

  const update = (key: keyof GlassConfig) => (val: any) => setCfg(p => ({ ...p, [key]: val }));

  const cssOutput = buildCss(cfg);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-150">

      {/* ─── LEFT PANEL: Controls (5 Cols) ──────────────────────────────── */}
      <div className="lg:col-span-5 space-y-8 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-fit">
        
        {/* Header & Presets */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Presets
            </h3>
            <button 
              onClick={() => setCfg(DEFAULTS)}
              className="text-xs text-slate-500 hover:text-white flex items-center gap-1 transition-colors"
              title="Reset to default"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(PRESETS).map(([name, config]) => (
              <button
                key={name}
                onClick={() => setCfg(config)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-xs font-medium text-slate-300 capitalize transition-all"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Group 1: Material */}
        <div className="space-y-5">
          <SliderRow label="Blur" value={cfg.blur} min={0} max={64} unit="px" onChange={update('blur')} />
          <SliderRow label="Transparency" value={Math.round(cfg.transparency * 100)} min={0} max={100} unit="%" onChange={(v: number) => update('transparency')(v / 100)} />
          <SliderRow label="Saturation" value={cfg.saturation} min={0} max={200} unit="%" onChange={update('saturation')} />
        </div>

        <div className="border-t border-slate-800 pt-6 space-y-5">
          <SliderRow label="Border Radius" value={cfg.borderRadius} min={0} max={50} unit="px" onChange={update('borderRadius')} />
          <SliderRow label="Shadow" value={cfg.shadowIntensity} min={0} max={100} unit="%" onChange={update('shadowIntensity')} />
          
          <div className="flex items-center justify-between">
             <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Border Outline</label>
             <input 
               type="checkbox" 
               checked={cfg.outline}
               onChange={(e) => update('outline')(e.target.checked)}
               className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
             />
          </div>
        </div>

        {/* CSS Output Block */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-900/50 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs font-medium text-indigo-400">CSS Code</span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${copied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            >
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-blue-300 whitespace-pre overflow-x-auto">
            {cssOutput}
          </pre>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Preview (7 Cols) ──────────────────────────────── */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        
        {/* Preview Container */}
        <div 
          className="relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500 flex items-center justify-center p-8"
          style={{ 
            background: backgrounds[bgIndex], // Using background property and correct state variable
          }}
        >
      
          {/* Dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/10" />

          {/* The Glass Element */}
          <div 
            className="relative z-10 p-8 w-80 text-white flex flex-col items-center gap-4 transition-all duration-200"
            style={{
              background: buildRgba(cfg.color, cfg.transparency),
              backdropFilter: `blur(${cfg.blur}px) saturate(${cfg.saturation}%)`,
              WebkitBackdropFilter: `blur(${cfg.blur}px) saturate(${cfg.saturation}%)`,
              border: cfg.outline ? `1px solid rgba(255, 255, 255, ${cfg.borderOpacity})` : 'none',
              borderRadius: `${cfg.borderRadius}px`,
              boxShadow: `0 ${Math.round(cfg.shadowIntensity * 0.4)}px ${cfg.shadowIntensity}px rgba(0,0,0,${(cfg.shadowIntensity/100).toFixed(2)})`
            }}
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
              <Box className="w-6 h-6 text-white" />
            </div>
            
            <div className="text-center">
              <h4 className="text-lg font-bold mb-1">Glass Card</h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Adjust the sliders to change this element's blur, opacity, and saturation in real-time.
              </p>
            </div>

            <div className="w-full h-px bg-linear-to-r from-transparent via-white/30 to-transparent my-2" />
            
            <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-medium transition-colors w-full">
              Button Action
            </button>
          </div>

          {/* Background Switcher (Floating) */}
          <div className="absolute bottom-6 right-6 flex gap-2 p-1.5 bg-slate-900/80 backdrop-blur rounded-full border border-slate-700">
            {backgrounds.map((bg, i) => (
              <button
                key={i}
                onClick={() => setBgIndex(i)}
                className={`w-8 h-8 rounded-full border-2 transition-all overflow-hidden ${bgIndex === i ? 'border-indigo-500 scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                style={{ background: bg }} // Fixed to render CSS gradient instead of <img> tag
              />
            ))}
          </div>

        </div>
        
        <p className="text-center text-xs text-slate-500">
          <ImageIcon className="w-3 h-3 inline mr-1" />
          Try different backgrounds to ensure text readability.
        </p>
      </div>

    </div>
  );
}