// src/components/tools/AuroraGenerator.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';

const BLOB_CONFIGS = [
  { id: 'blob-1', label: 'Top Left',     css: "top-[-10%] left-[-10%] w-1/2 h-1/2 rounded-full",           delay: "0s"  },
  { id: 'blob-2', label: 'Middle Right', css: "top-[40%] right-[-20%] w-[60%] h-[60%] rounded-[40%]",      delay: "2s"  },
  { id: 'blob-3', label: 'Bottom Left',  css: "bottom-[-20%] left-[20%] w-1/2 h-[60%] rounded-[60%]",      delay: "4s"  },
  { id: 'blob-4', label: 'Top Right',    css: "top-[10%] right-[20%] w-[40%] h-[40%] rounded-full",        delay: "1s"  },
];

// Injected once — keyframes for the live preview animation
const AURORA_KEYFRAMES = `
@keyframes aurora-float {
  0%   { transform: scale(1)    translate(0px,   0px);   }
  33%  { transform: scale(1.1)  translate(30px, -50px);  }
  66%  { transform: scale(0.9)  translate(-20px, 20px);  }
  100% { transform: scale(1.05) translate(40px,  40px);  }
}
@media (prefers-reduced-motion: reduce) {
  .aurora-blob-preview { animation: none !important; }
}
`;

export default function AuroraGenerator() {
  const [colors,        setColors]        = useState(['#8b5cf6','#3b82f6','#10b981','#f43f5e']);
  const [blur,          setBlur]          = useState(120);
  const [opacity,       setOpacity]       = useState(50);
  const [copiedCSS,     setCopiedCSS]     = useState(false);
  const [copiedTailwind,setCopiedTailwind]= useState(false);
  // FIX: track hydration so we can show a loading skeleton before React mounts
  const [hydrated,      setHydrated]      = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  const sanitizeHex = (value: string) => {
    let s = value.replace(/[^#0-9a-fA-F]/g, '');
    if (!s.startsWith('#') && s.length > 0) s = '#' + s;
    return s.slice(0, 7);
  };

  const handleColorChange = (index: number, value: string) => {
    const newColors = [...colors];
    newColors[index] = sanitizeHex(value);
    setColors(newColors);
  };

  const cssCode = useMemo(() => `/* CSS Aurora Background */
.aurora-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #0f172a;
  overflow: hidden;
}
.aurora-blob {
  position: absolute;
  filter: blur(${blur}px);
  opacity: ${opacity / 100};
  animation: aurora-float 10s infinite alternate ease-in-out;
  will-change: transform, opacity, filter;
}
.aurora-blob:nth-child(1) { top: -10%; left: -10%; width: 50%; height: 50%; background: ${colors[0]}; border-radius: 50%; animation-delay: 0s; }
.aurora-blob:nth-child(2) { top: 40%; right: -20%; width: 60%; height: 60%; background: ${colors[1]}; border-radius: 40%; animation-delay: -2s; }
.aurora-blob:nth-child(3) { bottom: -20%; left: 20%; width: 50%; height: 60%; background: ${colors[2]}; border-radius: 60%; animation-delay: -4s; }
.aurora-blob:nth-child(4) { top: 10%; right: 20%; width: 40%; height: 40%; background: ${colors[3]}; border-radius: 50%; animation-delay: -6s; }

@keyframes aurora-float {
  0%   { transform: scale(1)    translate(0px,   0px);  }
  33%  { transform: scale(1.1)  translate(30px, -50px); }
  66%  { transform: scale(0.9)  translate(-20px, 20px); }
  100% { transform: scale(1.05) translate(40px,  40px); }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-blob { animation: none; }
}`, [blur, opacity, colors]);

  // FIX: opacity-${opacity} produces non-standard Tailwind classes that get purged.
  // Use inline style for opacity instead of a dynamic utility class.
  const tailwindCode = useMemo(() => `<div class="relative w-full h-screen bg-slate-950 overflow-hidden">
  <div class="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 rounded-full mix-blend-screen blur-[${blur}px] bg-[${colors[0]}] animate-pulse will-change-[transform,opacity,filter]" style="opacity:${opacity / 100}; animation-delay:0s;"></div>
  <div class="absolute top-[40%] right-[-20%] w-[60%] h-[60%] rounded-[40%] mix-blend-screen blur-[${blur}px] bg-[${colors[1]}] animate-pulse will-change-[transform,opacity,filter]" style="opacity:${opacity / 100}; animation-delay:2s;"></div>
  <div class="absolute bottom-[-20%] left-[20%] w-1/2 h-[60%] rounded-[60%] mix-blend-screen blur-[${blur}px] bg-[${colors[2]}] animate-pulse will-change-[transform,opacity,filter]" style="opacity:${opacity / 100}; animation-delay:4s;"></div>
  <div class="absolute top-[10%] right-[20%] w-[40%] h-[40%] rounded-full mix-blend-screen blur-[${blur}px] bg-[${colors[3]}] animate-pulse will-change-[transform,opacity,filter]" style="opacity:${opacity / 100}; animation-delay:1s;"></div>
  <div class="relative z-10 flex items-center justify-center w-full h-full">
    <h1 class="text-white text-5xl font-bold">Hello Aurora</h1>
  </div>
</div>`, [blur, opacity, colors]);

  const copyToClipboard = async (text: string, type: 'css' | 'tailwind') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'css') {
        setCopiedCSS(true);
        setTimeout(() => setCopiedCSS(false), 2000);
      } else {
        setCopiedTailwind(true);
        setTimeout(() => setCopiedTailwind(false), 2000);
      }
    } catch (err) {
      console.error('Clipboard write failed:', err);
      alert('Failed to copy. Please select and copy manually.');
    }
  };

  // FIX: Show a clear loading skeleton while hydrating so users know
  // the tool isn't ready yet — eliminates "dead click" confusion entirely.
  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" aria-busy="true" aria-label="Loading Aurora Generator">
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 h-80 animate-pulse">
          <div className="h-4 bg-slate-800 rounded w-1/2 mb-6" />
          <div className="grid grid-cols-2 gap-4">
            {[0,1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-lg" />)}
          </div>
          <div className="mt-6 h-4 bg-slate-800 rounded w-3/4" />
          <div className="mt-3 h-3 bg-slate-800 rounded w-full" />
        </div>
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl h-80 animate-pulse flex items-center justify-center">
          <p className="text-slate-600 text-sm">Initialising editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* FIX: inject keyframes for the live preview animation */}
      <style dangerouslySetInnerHTML={{ __html: AURORA_KEYFRAMES }} />

      {/* Controls */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
        <h3 className="text-white font-semibold mb-6 text-lg">Configuration</h3>
        <div className="space-y-6">
          <fieldset>
            <legend className="block text-sm font-medium text-slate-400 mb-3">Color Palette</legend>
            <div className="grid grid-cols-2 gap-4">
              {colors.map((color, index) => (
                <div key={BLOB_CONFIGS[index].id} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 focus-within:border-fuchsia-500/50 transition-colors">
                  <input
                    type="color"
                    aria-label={`${BLOB_CONFIGS[index].label} blob color`}
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    aria-label={`${BLOB_CONFIGS[index].label} hex value`}
                    value={color.toUpperCase()}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="bg-transparent w-full text-sm text-slate-300 font-mono focus:outline-none uppercase"
                    maxLength={7}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="blur-slider" className="text-sm font-medium text-slate-400">Blur Intensity</label>
              <span className="text-xs text-fuchsia-400 font-mono bg-fuchsia-500/10 px-2 py-0.5 rounded" aria-live="polite">{blur}px</span>
            </div>
            <input id="blur-slider" type="range" min="0" max="200" value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
              aria-valuemin={0} aria-valuemax={200} aria-valuenow={blur}
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label htmlFor="opacity-slider" className="text-sm font-medium text-slate-400">Opacity</label>
              <span className="text-xs text-fuchsia-400 font-mono bg-fuchsia-500/10 px-2 py-0.5 rounded" aria-live="polite">{opacity}%</span>
            </div>
            <input id="opacity-slider" type="range" min="10" max="100" value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-fuchsia-500"
              aria-valuemin={10} aria-valuemax={100} aria-valuenow={opacity}
            />
          </div>
        </div>
      </div>

      {/* Preview & Output */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700">
            <span className="text-sm font-medium text-slate-300">Live Preview</span>
          </div>
          <div
            className="relative w-full h-100 bg-slate-950 overflow-hidden flex items-center justify-center"
            role="img"
            aria-label="Interactive aurora gradient preview"
          >
            {/* FIX: add animationName + animationDuration + animationDelay so the
                preview actually matches the exported animation */}
            {BLOB_CONFIGS.map((blob, index) => (
              <div
                key={blob.id}
                className={`aurora-blob-preview absolute ${blob.css} mix-blend-screen`}
                style={{
                  backgroundColor: colors[index],
                  filter: `blur(${blur}px)`,
                  opacity: opacity / 100,
                  willChange: 'transform, opacity, filter',
                  animationName: 'aurora-float',
                  animationDuration: '10s',
                  animationDelay: blob.delay,
                  animationIterationCount: 'infinite',
                  animationDirection: 'alternate',
                  animationTimingFunction: 'ease-in-out',
                }}
              />
            ))}
            <div className="relative z-10 text-white/90 font-bold text-4xl tracking-tight mix-blend-overlay" aria-hidden="true">
              SyntaxSnap
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-72">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">CSS Output</span>
              <button
                onClick={() => copyToClipboard(cssCode, 'css')}
                className="text-xs bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-3 py-1 rounded hover:bg-fuchsia-500/20 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                aria-live="polite"
              >
                {copiedCSS ? 'Copied!' : 'Copy CSS'}
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4"><code className="text-emerald-400 font-mono text-xs whitespace-pre-wrap">{cssCode}</code></pre>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-72">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-300">Tailwind HTML</span>
              <button
                onClick={() => copyToClipboard(tailwindCode, 'tailwind')}
                className="text-xs bg-[#27b4f2]/10 text-[#27b4f2] border border-[#27b4f2]/20 px-3 py-1 rounded hover:bg-[#27b4f2]/20 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-[#27b4f2]"
                aria-live="polite"
              >
                {copiedTailwind ? 'Copied!' : 'Copy Tailwind'}
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4"><code className="text-blue-400 font-mono text-xs whitespace-pre-wrap">{tailwindCode}</code></pre>
          </div>
        </div>
      </div>
    </div>
  );
}