import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { CopyButton } from '../ui/CopyButton';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

/** Maximum number of shadow layers to prevent performance degradation */
const MAX_LAYERS = 8;

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ShadowLayer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

/** Validate a 7-char hex colour; returns fallback on invalid input */
const sanitizeHex = (hex: string): string => {
  if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  return '#000000';
};

const hexToRgba = (hex: string, opacity: number): string => {
  const safe = sanitizeHex(hex);
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  // Round to 2 decimal places to avoid floating-point noise in class names
  const a = Math.round((Math.min(100, Math.max(0, opacity)) / 100) * 100) / 100;
  return `rgba(${r},${g},${b},${a})`;
};

const generateCssShadow = (layers: ShadowLayer[]): string => {
  if (layers.length === 0) return 'none';
  return layers
    .map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${hexToRgba(l.color, l.opacity)}`)
    .join(', ');
};

const generateTailwindClass = (layers: ShadowLayer[]): string => {
  if (layers.length === 0) return 'shadow-none';
  const twValue = layers
    .map((l) => `${l.inset ? 'inset_' : ''}${l.x}px_${l.y}px_${l.blur}px_${l.spread}px_${hexToRgba(l.color, l.opacity)}`)
    .join(',');
  return `shadow-[${twValue}]`;
};

/** Generate a short random ID safe for React keys */
const uid = (): string => Math.random().toString(36).substring(2, 11);

// ─── SLIDER CONFIG ───────────────────────────────────────────────────────────

const SLIDER_CONFIG = [
  { label: 'X Offset', key: 'x' as const, min: -100, max: 100, unit: 'px' },
  { label: 'Y Offset', key: 'y' as const, min: -100, max: 100, unit: 'px' },
  { label: 'Blur', key: 'blur' as const, min: 0, max: 150, unit: 'px' },
  { label: 'Spread', key: 'spread' as const, min: -50, max: 100, unit: 'px' },
  { label: 'Opacity', key: 'opacity' as const, min: 0, max: 100, unit: '%' },
] as const;

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function TailwindShadowGenerator() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Mark component as hydrated for E2E selectors
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  // Default to a modern "Neon Glow" stacked shadow
  const [layers, setLayers] = useState<ShadowLayer[]>([
    { id: '1', x: 0, y: 0, blur: 40, spread: 5, color: '#3b82f6', opacity: 40, inset: false },
    { id: '2', x: 0, y: 10, blur: 15, spread: -3, color: '#000000', opacity: 50, inset: false },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('1');

  const activeLayer = layers.find((l) => l.id === activeLayerId) ?? layers[0];

  const updateLayer = useCallback((id: string, updates: Partial<ShadowLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  }, []);

  const addLayer = useCallback(() => {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      const newId = uid();
      // We need to set active ID after state is updated
      setTimeout(() => setActiveLayerId(newId), 0);
      return [...prev, { id: newId, x: 0, y: 10, blur: 20, spread: 0, color: '#000000', opacity: 30, inset: false }];
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((l) => l.id !== id);
      // If we're removing the active layer, switch to the first remaining
      setActiveLayerId((currentActive) => (currentActive === id ? next[0].id : currentActive));
      return next;
    });
  }, []);

  const cssShadow = useMemo(() => generateCssShadow(layers), [layers]);
  const tailwindClass = useMemo(() => generateTailwindClass(layers), [layers]);

  return (
    <div ref={rootRef} className="flex flex-col gap-6">
      {/* ── Output Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm" data-output-bar>
        <code className="text-emerald-400 font-mono text-sm break-all pr-4" data-tailwind-class>{tailwindClass}</code>
        <CopyButton
          text={tailwindClass}
          label="Copy Class"
          copiedLabel="Copied!"
          variant="primary"
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0"
          aria-label="Copy Tailwind shadow class to clipboard"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Live Preview Canvas ───────────────────────────────────────── */}
        <div className="bg-[#0f172a] rounded-2xl border border-slate-800 flex items-center justify-center min-h-100 relative overflow-hidden" data-preview-canvas>
          <div
            className="w-48 h-48 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center transition-shadow duration-200"
            style={{ boxShadow: cssShadow }}
            data-preview-box
          >
            <span className="text-slate-400 font-semibold tracking-wide">Preview</span>
          </div>
        </div>

        {/* ── Controls Pane ─────────────────────────────────────────────── */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6" data-controls-pane>

          {/* Layer Management */}
          <div className="flex flex-wrap gap-2 mb-2" role="tablist" aria-label="Shadow layers">
            {layers.map((layer, idx) => (
              <button
                key={layer.id}
                role="tab"
                aria-selected={activeLayerId === layer.id}
                aria-label={`Layer ${idx + 1}`}
                onClick={() => setActiveLayerId(layer.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  activeLayerId === layer.id
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Layer {idx + 1}
              </button>
            ))}
            {layers.length < MAX_LAYERS && (
              <button
                onClick={addLayer}
                aria-label="Add shadow layer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <span>+ Add</span>
              </button>
            )}
          </div>

          {/* Active Layer Controls */}
          <div className="space-y-5" role="tabpanel" aria-label="Layer properties">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-semibold">Layer Properties</h3>
              {layers.length > 1 && (
                <button
                  onClick={() => removeLayer(activeLayer.id)}
                  aria-label={`Delete layer`}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Delete Layer
                </button>
              )}
            </div>

            {/* Sliders */}
            {SLIDER_CONFIG.map(({ label, key, min, max, unit }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-2">
                  <label htmlFor={`slider-${key}`} className="text-slate-400 font-medium">{label}</label>
                  <span className="text-slate-300 font-mono" data-value={key}>
                    {activeLayer[key]}{unit}
                  </span>
                </div>
                <input
                  id={`slider-${key}`}
                  type="range"
                  min={min}
                  max={max}
                  value={activeLayer[key]}
                  onChange={(e) => updateLayer(activeLayer.id, { [key]: parseInt(e.target.value, 10) })}
                  aria-label={label}
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={activeLayer[key]}
                  className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                />
              </div>
            ))}

            {/* Color & Inset */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <label htmlFor="shadow-color" className="text-slate-400 text-xs font-medium">Color</label>
                <input
                  id="shadow-color"
                  type="color"
                  value={activeLayer.color}
                  onChange={(e) => updateLayer(activeLayer.id, { color: e.target.value })}
                  aria-label="Shadow color"
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-slate-400 text-xs font-medium">Inset Shadow</span>
                <input
                  type="checkbox"
                  checked={activeLayer.inset}
                  onChange={(e) => updateLayer(activeLayer.id, { inset: e.target.checked })}
                  aria-label="Toggle inset shadow"
                  className="w-4 h-4 accent-indigo-500 rounded bg-slate-800 border-slate-700 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}