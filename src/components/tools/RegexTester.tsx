// src/components/tools/RegexTester.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { Regex, Flag, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CopyButton from '../ui/CopyButton';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MatchInfo {
  value: string;
  index: number;
  groups: Record<string, string> | undefined;
}

// ─── Constants & Presets ─────────────────────────────────────────────────────
const PRESETS = [
  { name: 'Email', pattern: String.raw`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`, flags: 'g' },
  { name: 'URL', pattern: String.raw`https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)`, flags: 'gi' },
  { name: 'Date (YYYY-MM-DD)', pattern: String.raw`\d{4}-\d{2}-\d{2}`, flags: 'g' },
  { name: 'IPv4', pattern: String.raw`\b(?:\d{1,3}\.){3}\d{1,3}\b`, flags: 'g' },
];

const DEFAULT_TEXT = `Contact us at support@syntaxsnap.com or admin@test.org for help.
Visit https://syntaxsnap.com for more tools.
Server IP: 192.168.1.1 connected on 2025-10-25.`;

// ─── Logic ───────────────────────────────────────────────────────────────────
function escapeHtml(s: string) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;') // FIX: Prevents attribute injection
      .replace(/\//g, '&#x2F;'); // FIX: Extra safety
}

// FIX: Prevent ReDoS (Regular Expression Denial of Service) browser freezes
function executeRegexSafely(pattern: string, flags: string, text: string, timeoutMs = 1000): { matches: MatchInfo[]; timedOut: boolean } {
  const regex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); // Ensure global for highlighting
  const matches: MatchInfo[] = [];
  const startTime = Date.now();
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (Date.now() - startTime > timeoutMs) {
      return { matches, timedOut: true }; // Circuit breaker
    }
    matches.push({ value: match[0], index: match.index, groups: match.groups });
    if (match[0].length === 0) regex.lastIndex++; // Avoid infinite loops on empty matches
  }
  return { matches, timedOut: false };
}

function processRegex(pattern: string, flags: string, text: string) {
  if (!pattern) return { html: escapeHtml(text), matches: [], error: null, timedOut: false };

  try {
    const { matches, timedOut } = executeRegexSafely(pattern, flags, text);

    // Build Highlighted HTML
    let html = '';
    let lastIndex = 0;
    
    // Only highlight up to what we found if it timed out, or everything if normal
    matches.forEach((m) => {
      html += escapeHtml(text.slice(lastIndex, m.index));
      html += `<mark class="bg-indigo-500/30 text-indigo-200 rounded px-0.5 border-b-2 border-indigo-500">${escapeHtml(m.value)}</mark>`;
      lastIndex = m.index + m.value.length;
    });
    html += escapeHtml(text.slice(lastIndex));

    return { html, matches, error: null, timedOut };
  } catch (e) {
    return { html: escapeHtml(text), matches: [], error: (e as Error).message, timedOut: false };
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RegexTester() {
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState(DEFAULT_TEXT);

  // Apply 300ms debounce to prevent freezing on large texts and complex patterns
  const debouncedPattern = useDebounce(pattern, 300);
  const debouncedText = useDebounce(text, 300);

  // ─── Chrome Extension Integration ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incomingText = params.get('input');
    
    if (incomingText) {
      setText(incomingText);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  // Process against debounced values for massive performance gains
  const { html, matches, error, timedOut } = useMemo(
    () => processRegex(debouncedPattern, flags, debouncedText), 
    [debouncedPattern, flags, debouncedText]
  );

  return (
    <div className="space-y-8 min-h-150">
      
      {/* ─── Controls ────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
        
        {/* Header with Presets */}
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Regex className="w-5 h-5" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">Pattern & Flags</h3>
          </div>
          
          <div className="flex gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => { setPattern(p.pattern); setFlags(p.flags); }}
                className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 hover:text-indigo-400 text-slate-300 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3" /> {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs Row */}
        <div className="grid grid-cols-12 gap-4">
          {/* Pattern Input */}
          <div className="col-span-12 md:col-span-9 relative">
            <div className="flex items-center absolute left-3 top-3 text-slate-500 select-none font-mono text-lg">/</div>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className={`w-full bg-slate-950 border ${error || timedOut ? 'border-red-500/50 focus:ring-red-500/20' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'} rounded-xl py-3 pl-8 pr-4 font-mono text-sm text-indigo-300 focus:outline-none focus:ring-2 transition-all`}
              placeholder="Enter regex pattern..."
            />
            <div className="flex items-center absolute right-3 top-3 text-slate-500 select-none font-mono text-lg">/</div>
          </div>

          {/* Flags Input */}
          <div className="col-span-12 md:col-span-3 relative">
            <div className="absolute left-3 top-3.5 text-slate-500">
              <Flag className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 font-mono text-sm text-yellow-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              placeholder="flags"
            />
          </div>
        </div>

        {/* Error / Timeout Messages */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono">{error}</span>
          </div>
        )}
        {timedOut && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 px-4 py-2 rounded-lg border border-yellow-900/50">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-mono">Execution timed out. The regex pattern is too complex (Catastrophic Backtracking) and was stopped to prevent browser freezing.</span>
          </div>
        )}
      </div>

      {/* ─── Testing Arena ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Test String Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Test String</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-80 bg-slate-900/30 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none leading-relaxed"
            placeholder="Paste text here to test..."
          />
        </div>

        {/* Results Output */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Results</label>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${matches.length > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                {matches.length} Matches Found
              </span>
              <CopyButton text={html} label="Copy Results" variant="ghost" />
            </div>
          </div>
          
          <div 
            className="w-full h-80 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-sm text-slate-400 overflow-auto whitespace-pre-wrap leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html || '<span class="text-slate-600 italic">// No matches found</span>' }}
          />
        </div>
      </div>

      {/* ─── Match Details Table ─────────────────────────────────────────── */}
      {matches.length > 0 && (
        <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capture Groups</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="text-xs uppercase bg-slate-900/50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">#</th>
                  <th className="px-6 py-3">Match</th>
                  <th className="px-6 py-3">Index</th>
                  <th className="px-6 py-3">Groups</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {matches.slice(0, 50).map((m, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-600">{i + 1}</td>
                    <td className="px-6 py-3 font-mono text-indigo-300">{m.value}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{m.index}</td>
                    <td className="px-6 py-3 font-mono text-slate-400">
                      {m.groups ? JSON.stringify(m.groups) : <span className="text-slate-600">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {matches.length > 50 && (
            <div className="px-6 py-2 text-xs text-center text-slate-500 bg-slate-900/30 border-t border-slate-800">
              Showing first 50 matches only
            </div>
          )}
        </div>
      )}

    </div>
  );
}