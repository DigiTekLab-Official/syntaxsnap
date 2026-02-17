'use client';
import React, { useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function buildRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function buildCss(cfg: GlassConfig): string {
  const lines: string[] = [
    `background: ${buildRgba(cfg.color, cfg.transparency)};`,
    `backdrop-filter: blur(${cfg.blur}px) saturate(${cfg.saturation}%);`,
    `-webkit-backdrop-filter: blur(${cfg.blur}px) saturate(${cfg.saturation}%);`,
  ];

  if (cfg.outline) {
    lines.push(
      `border: 1px solid rgba(255, 255, 255, ${cfg.borderOpacity});`
    );
  }

  lines.push(`border-radius: ${cfg.borderRadius}px;`);
  lines.push(
    `box-shadow: 0 ${Math.round(cfg.shadowIntensity * 0.4)}px ${cfg.shadowIntensity}px rgba(0, 0, 0, ${(cfg.shadowIntensity / 100).toFixed(2)});`
  );

  if (cfg.noiseTint) {
    lines.push(
      `/* Optional: overlay a subtle noise texture */`,
      `/* background-image: url("data:image/svg+xml,..."); */`
    );
  }

  return lines.join('\n');
}

// ─── Sub-components ───────────────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, unit = '', onChange }: SliderRowProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="text-xs font-mono text-indigo-400 tabular-nums">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      />
    </div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy CSS to clipboard"
      className="text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:scale-95
        bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
    >
      {state === 'copied' ? '✓ Copied!' : state === 'error' ? 'Failed' : 'Copy CSS'}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DEFAULTS: GlassConfig = {
  blur: 16,
  transparency: 0.15,
  color: '#ffffff',
  saturation: 180,
  borderOpacity: 0.3,
  shadowIntensity: 30,
  borderRadius: 16,
  outline: true,
  noiseTint: false,
};

export default function GlassGenerator() {
  const [cfg, setCfg] = useState<GlassConfig>(DEFAULTS);

  const set = useCallback(
    <K extends keyof GlassConfig>(key: K) =>
      (value: GlassConfig[K]) =>
        setCfg((prev) => ({ ...prev, [key]: value })),
    []
  );

  const cssOutput = buildCss(cfg);

  const previewStyle: React.CSSProperties = {
    background: buildRgba(cfg.color, cfg.transparency),
    backdropFilter: `blur(${cfg.blur}px) saturate(${cfg.saturation}%)`,
    WebkitBackdropFilter: `blur(${cfg.blur}px) saturate(${cfg.saturation}%)`,
    border: cfg.outline
      ? `1px solid rgba(255,255,255,${cfg.borderOpacity})`
      : 'none',
    borderRadius: `${cfg.borderRadius}px`,
    boxShadow: `0 ${Math.round(cfg.shadowIntensity * 0.4)}px ${cfg.shadowIntensity}px rgba(0,0,0,${(cfg.shadowIntensity / 100).toFixed(2)})`,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

      {/* ── Controls Panel ─────────────────────────────────────────────── */}
      <div className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <SliderRow
          label="Blur"
          value={cfg.blur}
          min={0}
          max={64}
          unit="px"
          onChange={set('blur')}
        />

        <SliderRow
          label="Transparency"
          value={Math.round(cfg.transparency * 100)}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set('transparency')(v / 100)}
        />

        <SliderRow
          label="Saturation"
          value={cfg.saturation}
          min={0}
          max={300}
          unit="%"
          onChange={set('saturation')}
        />

        <SliderRow
          label="Border Opacity"
          value={Math.round(cfg.borderOpacity * 100)}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set('borderOpacity')(v / 100)}
        />

        <SliderRow
          label="Shadow Intensity"
          value={cfg.shadowIntensity}
          min={0}
          max={100}
          unit="px"
          onChange={set('shadowIntensity')}
        />

        <SliderRow
          label="Border Radius"
          value={cfg.borderRadius}
          min={0}
          max={64}
          unit="px"
          onChange={set('borderRadius')}
        />

        {/* Color Picker */}
        <div>
          <label className="block text-sm font-medium mb-2 text-slate-300">
            Base Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={cfg.color}
              onChange={(e) => set('color')(e.target.value)}
              aria-label="Base color picker"
              className="h-10 w-14 rounded-lg bg-transparent border border-slate-700 cursor-pointer p-0.5"
            />
            <span className="text-slate-400 font-mono text-sm">{cfg.color}</span>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          {(
            [
              { key: 'outline', label: 'Show border' },
              { key: 'noiseTint', label: 'Include noise texture comment' },
            ] as const
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer select-none group">
              <div
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  cfg[key] ? 'bg-indigo-600' : 'bg-slate-700'
                } group-focus-within:ring-2 group-focus-within:ring-indigo-500`}
              >
                <input
                  type="checkbox"
                  checked={cfg[key] as boolean}
                  onChange={(e) => set(key)(e.target.checked as GlassConfig[typeof key])}
                  className="sr-only"
                />
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                    cfg[key] ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-slate-300">{label}</span>
            </label>
          ))}
        </div>

        {/* CSS Output */}
        <div className="mt-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              CSS Output
            </span>
            <CopyButton text={cssOutput} />
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 font-mono overflow-x-auto border border-slate-800 whitespace-pre-wrap leading-relaxed">
            {cssOutput}
          </pre>
        </div>
      </div>

      {/* ── Live Preview ────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center min-h-[480px] rounded-2xl overflow-hidden"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1200&auto=format&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-label="Glass effect live preview"
        role="img"
      >
        {/* Darkening overlay so lighter glass is still visible */}
        <div className="absolute inset-0 bg-black/20" aria-hidden />

        {/* The glass card */}
        <div
          className="relative z-10 w-72 p-8 flex flex-col items-center gap-4 text-white"
          style={previewStyle}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl" aria-hidden>
            ✦
          </div>
          <p className="text-base font-semibold tracking-wide">Glass Preview</p>
          <p className="text-xs text-white/70 text-center leading-relaxed">
            Resize sliders to see blur, transparency and border in real-time.
          </p>
          <div className="w-full h-px bg-white/20 my-1" aria-hidden />
          <div className="flex gap-3 text-xs text-white/60">
            <span>blur: {cfg.blur}px</span>
            <span>·</span>
            <span>alpha: {Math.round(cfg.transparency * 100)}%</span>
          </div>
        </div>
      </div>

    </div>
  );
}