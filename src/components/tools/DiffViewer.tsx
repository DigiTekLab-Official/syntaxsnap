import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Diff from 'diff';
import {
  Split,
  Files,
  Trash2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Lock,
  FileText,
  AlertCircle,
  ArrowRightLeft
} from 'lucide-react';
import CopyButton from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';

// ─── Types ────────────────────────────────────────────────────────────────────

type DiffMode = 'split' | 'unified';
type DiffGranularity = 'lines' | 'words';

interface DiffStats {
  added:     number;
  removed:   number;
  unchanged: number;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function calculateStats(diffs: Diff.Change[]): DiffStats {
  let added = 0, removed = 0, unchanged = 0;
  for (const part of diffs) {
    const lines = part.value.split('\n').length - 1 || 1;
    if      (part.added)   added     += lines;
    else if (part.removed) removed   += lines;
    else                   unchanged += lines;
  }
  return { added, removed, unchanged };
}

/** Generate a stable key for diff parts to avoid React reconciliation bugs. */
function getDiffKey(part: Diff.Change, index: number): string {
  const snippet = part.value.slice(0, 20).replace(/\s/g, '_');
  const flag = part.added ? 'a' : part.removed ? 'r' : 'u';
  return `${index}-${flag}-${snippet}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// using shared CopyButton from ui

function DiffStats({ stats }: { stats: DiffStats }) {
  return (
    <div className="flex items-center gap-4 text-[12px] font-mono tabular-nums text-slate-500">
      <span className="flex items-center gap-1">
        <span className="text-emerald-400">+{stats.added}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-red-400">−{stats.removed}</span>
      </span>
      <span className="text-slate-600">{stats.unchanged} unchanged</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const SAMPLE_OLD = `function greet(name) {
  console.log("Hello, " + name);
  return "Welcome!";
}`;

const SAMPLE_NEW = `function greet(name, title = "Guest") {
  console.log(\`Hello, \${title} \${name}!\`);
  return \`Welcome, \${title} \${name}!\`;
}`;

export default function DiffViewer() {
  const [oldText, setOldText] = useState(SAMPLE_OLD);
  const [newText, setNewText] = useState(SAMPLE_NEW);
  const [mode, setMode] = useState<DiffMode>('split');
  const [granularity, setGranularity] = useState<DiffGranularity>('lines');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── CHROME EXTENSION LISTENER ──────────────────────────────────────────
  // Listens for ?input=... in the URL (sent by the extension)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingText = params.get('input');
    
    if (incomingText) {
      setOldText(incomingText);
      setNewText(''); // Clear "New" so user can paste comparison
      // Clean up URL to remove the query param after loading
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  // FIX: Debounce text values to prevent diff calculation on every keystroke.
  // For large files (10k+ lines), computing diffs on every keystroke freezes the UI.
  const debouncedOld = useDebounce(oldText, 400);
  const debouncedNew = useDebounce(newText, 400);

  // FIX: useMemo instead of useEffect — diff calculation is pure and synchronous
  const diffs = useMemo(() => {
    if (!debouncedOld && !debouncedNew) return [];
    return granularity === 'lines'
      ? Diff.diffLines(debouncedOld, debouncedNew)
      : Diff.diffWords(debouncedOld, debouncedNew);
  }, [debouncedOld, debouncedNew, granularity]);

  const stats = useMemo(() => calculateStats(diffs), [diffs]);

  // FIX: Synced scrolling for split view — professional diff tools keep left/right in sync.
  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const syncingRef    = useRef(false);

  const syncScroll = useCallback((source: HTMLDivElement, target: HTMLDivElement) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    target.scrollTop = source.scrollTop;
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  // FIX: Real Fullscreen API instead of CSS fixed positioning.
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        // Fallback: older browsers might not support it
        setIsFullscreen(!isFullscreen);
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const handleClear = useCallback(() => {
    setOldText('');
    setNewText('');
  }, []);

  return (
    <div className={`space-y-6 transition-all duration-300 ${isFullscreen ? 'p-6' : ''}`}>

      {/* ── Controls bar ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-2xl border border-slate-800 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode toggle */}
          <div className="flex p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => setMode('split')}
              aria-label="Split view mode"
              aria-pressed={mode === 'split'}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                mode === 'split'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Split className="w-3 h-3" aria-hidden /> Split
            </button>
            <button
              onClick={() => setMode('unified')}
              aria-label="Unified view mode"
              aria-pressed={mode === 'unified'}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${
                mode === 'unified'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Files className="w-3 h-3" aria-hidden /> Unified
            </button>
          </div>

          {/* Granularity toggle */}
          <div className="flex p-1 bg-slate-800 rounded-lg">
            <button
              onClick={() => setGranularity('lines')}
              aria-label="Line-level diff"
              aria-pressed={granularity === 'lines'}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                granularity === 'lines'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lines
            </button>
            <button
              onClick={() => setGranularity('words')}
              aria-label="Word-level diff"
              aria-pressed={granularity === 'words'}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                granularity === 'words'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Words
            </button>
          </div>

          <div className="h-6 w-px bg-slate-700 hidden sm:block" aria-hidden />

          <button
            onClick={handleClear}
            className="text-xs font-medium text-slate-400 hover:text-red-400 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3 h-3" aria-hidden /> Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          {diffs.length > 0 && <DiffStats stats={stats} />}
          <button
            onClick={toggleFullscreen}
            className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" aria-hidden /> : <Maximize2 className="w-3 h-3" aria-hidden />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* ── Input panels ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="old-text" className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">
            Original Version
          </label>
          <textarea
            id="old-text"
            value={oldText}
            onChange={(e) => setOldText(e.target.value)}
            spellCheck={false}
            aria-label="Original text"
            placeholder="Paste original version here…"
            className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 resize-none leading-relaxed transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="new-text" className="text-xs font-bold uppercase tracking-widest text-indigo-400 ml-1">
            Modified Version
          </label>
          <textarea
            id="new-text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            spellCheck={false}
            aria-label="Modified text"
            placeholder="Paste modified version here…"
            className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed transition-colors"
          />
        </div>
      </div>

      {/* ── Diff output ────────────────────────────────────────────────── */}
      {diffs.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl" role="region" aria-label="Diff output">
          {mode === 'split' ? (
            <div className="grid grid-cols-2 divide-x divide-slate-800">
              {/* Left panel (Old) */}
              <div
                ref={leftPanelRef}
                onScroll={() =>
                  leftPanelRef.current &&
                  rightPanelRef.current &&
                  syncScroll(leftPanelRef.current, rightPanelRef.current)
                }
                className="overflow-auto max-h-[600px]"
              >
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-2 border-b border-slate-800 text-[12px] uppercase font-bold text-red-400 z-10">
                  Original
                </div>
                <pre className="m-0">
                  {diffs.map((part, i) =>
                    part.removed ? (
                      <div
                        key={getDiffKey(part, i)}
                        className="px-4 py-1 bg-red-900/20 text-red-200 whitespace-pre-wrap break-all font-mono text-xs border-l-2 border-red-500"
                      >
                        {part.value}
                      </div>
                    ) : part.added ? null : (
                      <div
                        key={getDiffKey(part, i)}
                        className="px-4 py-1 text-slate-600 whitespace-pre-wrap break-all font-mono text-xs"
                      >
                        {part.value}
                      </div>
                    ),
                  )}
                </pre>
              </div>

              {/* Right panel (New) */}
              <div
                ref={rightPanelRef}
                onScroll={() =>
                  rightPanelRef.current &&
                  leftPanelRef.current &&
                  syncScroll(rightPanelRef.current, leftPanelRef.current)
                }
                className="overflow-auto max-h-[600px]"
              >
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm p-2 border-b border-slate-800 text-[12px] uppercase font-bold text-emerald-400 z-10 flex justify-between items-center">
                  <span>Modified</span>
                  <CopyButton text={newText} />
                </div>
                <pre className="m-0">
                  {diffs.map((part, i) =>
                    part.added ? (
                      <div
                        key={getDiffKey(part, i)}
                        className="px-4 py-1 bg-emerald-900/20 text-emerald-200 whitespace-pre-wrap break-all font-mono text-xs border-l-2 border-emerald-500"
                      >
                        {part.value}
                      </div>
                    ) : part.removed ? null : (
                      <div
                        key={getDiffKey(part, i)}
                        className="px-4 py-1 text-slate-600 whitespace-pre-wrap break-all font-mono text-xs"
                      >
                        {part.value}
                      </div>
                    ),
                  )}
                </pre>
              </div>
            </div>
          ) : (
            /* Unified view */
            <div className="overflow-auto max-h-[600px]">
              <pre className="m-0">
                {diffs.map((part, i) => (
                  <div
                    key={getDiffKey(part, i)}
                    className={`px-4 py-1 border-l-2 whitespace-pre-wrap break-all font-mono text-xs ${
                      part.added
                        ? 'bg-emerald-900/10 text-emerald-300 border-emerald-500'
                        : part.removed
                        ? 'bg-red-900/10 text-red-300 border-red-500'
                        : 'text-slate-600 border-transparent'
                    }`}
                  >
                    <span className="select-none inline-block w-6 opacity-40 text-right mr-4 font-bold" aria-hidden>
                      {part.added ? '+' : part.removed ? '−' : ' '}
                    </span>
                    {part.value}
                  </div>
                ))}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="text-center pt-4">
        <p className="text-[12px] text-slate-500 flex items-center justify-center gap-2">
          <Lock className="w-3 h-3" aria-hidden /> Comparison happens locally. Your text never leaves your device.
        </p>
      </div>

    </div>
  );
}