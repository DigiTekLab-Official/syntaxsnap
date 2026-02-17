'use client';
import React, { useState, useMemo, useId } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MatchInfo {
  value: string;
  index: number;
  groups: Record<string, string> | undefined;
}

interface ProcessedResult {
  /** HTML string with <mark> tags for rendering */
  html: string;
  matches: MatchInfo[];
  error: string | null;
}

// ─── Regex processing ─────────────────────────────────────────────────────────

/** Escape a string so it's safe to inject into an HTML attribute */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ALLOWED_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y', 'd']);

function sanitiseFlags(raw: string): string {
  // Deduplicate and keep only known flags; always add 'd' for indices if browser supports it
  return [...new Set(raw.split('').filter((f) => ALLOWED_FLAGS.has(f)))].join('');
}

function processRegex(pattern: string, flagsRaw: string, text: string): ProcessedResult {
  if (!pattern) return { html: escapeHtml(text), matches: [], error: null };

  const flags = sanitiseFlags(flagsRaw);
  let regex: RegExp;

  try {
    // Use 'd' (hasIndices) flag where available to get richer match data
    const flagsWithD = flags.includes('d') ? flags : flags + (RegExp.prototype.hasOwnProperty('hasIndices') ? 'd' : '');
    regex = new RegExp(pattern, flagsWithD);
  } catch (e) {
    return {
      html: escapeHtml(text),
      matches: [],
      error: e instanceof Error ? e.message : 'Invalid regular expression',
    };
  }

  // For non-global patterns, matchAll needs 'g' — we iterate carefully
  const effectiveRegex = flags.includes('g')
    ? regex
    : new RegExp(pattern, sanitiseFlags(flags + 'g'));

  const matchList: MatchInfo[] = [];
  let m: RegExpExecArray | null;

  while ((m = effectiveRegex.exec(text)) !== null) {
    matchList.push({
      value: m[0],
      index: m.index,
      groups: m.groups,
    });
    // Safety: prevent infinite loop on zero-length matches
    if (m[0].length === 0) effectiveRegex.lastIndex++;
    // Stop after first match if non-global in original pattern
    if (!flags.includes('g')) break;
  }

  if (matchList.length === 0) {
    return { html: escapeHtml(text), matches: [], error: null };
  }

  // Build highlighted HTML by walking through match positions
  let html = '';
  let cursor = 0;

  for (const match of matchList) {
    if (match.index > cursor) {
      html += escapeHtml(text.slice(cursor, match.index));
    }
    html += `<mark class="bg-indigo-500/40 text-white rounded-sm px-0.5 ring-1 ring-indigo-400/60">${escapeHtml(match.value)}</mark>`;
    cursor = match.index + match.value.length;
  }

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return { html, matches: matchList, error: null };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MatchBadge({ count }: { count: number }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums
        ${count > 0 ? 'bg-indigo-600/30 text-indigo-300 ring-1 ring-indigo-500/40' : 'bg-slate-800 text-slate-500'}`}
    >
      {count} {count === 1 ? 'match' : 'matches'}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const DEFAULT_PATTERN = String.raw`\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b`;
const DEFAULT_FLAGS = 'g';
const DEFAULT_TEXT =
  'Contact us at support@syntaxsnap.com or admin@test.org for help.\nInvalid: @missinguser.com or noatsign.net';

export default function RegexTester() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [text, setText] = useState(DEFAULT_TEXT);

  const patternId = useId();
  const flagsId   = useId();
  const inputId   = useId();

  const result = useMemo(
    () => processRegex(pattern, flags, text),
    [pattern, flags, text]
  );

  return (
    <div className="space-y-6">

      {/* ── Pattern Row ────────────────────────────────────────────────── */}
      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">

          <div>
            <label
              htmlFor={patternId}
              className="block text-xs text-slate-500 uppercase font-semibold mb-2 tracking-wider"
            >
              Regex Pattern
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-mono text-lg select-none" aria-hidden>/</span>
              <input
                id={patternId}
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                aria-label="Regular expression pattern"
                aria-invalid={!!result.error}
                aria-describedby={result.error ? 'regex-error' : undefined}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 font-mono text-sm text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
              />
              <span className="text-slate-500 font-mono text-lg select-none" aria-hidden>/</span>
            </div>
          </div>

          <div>
            <label
              htmlFor={flagsId}
              className="block text-xs text-slate-500 uppercase font-semibold mb-2 tracking-wider"
            >
              Flags
            </label>
            <input
              id={flagsId}
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              maxLength={8}
              spellCheck={false}
              autoCapitalize="none"
              aria-label="Regular expression flags (e.g. g, i, m)"
              className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-colors"
              placeholder="g"
            />
          </div>
        </div>

        {result.error && (
          <p
            id="regex-error"
            role="alert"
            aria-live="polite"
            className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2 font-mono"
          >
            {result.error}
          </p>
        )}
      </div>

      {/* ── Test Area ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ minHeight: '360px' }}>

        {/* Input */}
        <div className="flex flex-col">
          <label
            htmlFor={inputId}
            className="text-xs text-slate-500 uppercase font-semibold mb-2 tracking-wider"
          >
            Test String
          </label>
          <textarea
            id={inputId}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="Text to test the regex against"
            placeholder="Paste your test text here…"
            className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
              Match Results
            </span>
            <MatchBadge count={result.matches.length} />
          </div>

          <div
            aria-label="Regex match results"
            aria-live="polite"
            role="region"
            /* biome-ignore lint/security/noDangerouslySetInnerHtml: output is fully escaped; only <mark> tags injected by our sanitiser */
            dangerouslySetInnerHTML={{ __html: result.html }}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-sm text-slate-300 overflow-auto whitespace-pre-wrap leading-relaxed"
          />
        </div>

      </div>

      {/* ── Match Details Table ────────────────────────────────────────── */}
      {result.matches.length > 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Captured Groups &amp; Positions
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left px-4 py-2 font-semibold">#</th>
                  <th className="text-left px-4 py-2 font-semibold">Match</th>
                  <th className="text-left px-4 py-2 font-semibold">Index</th>
                  <th className="text-left px-4 py-2 font-semibold">Named Groups</th>
                </tr>
              </thead>
              <tbody>
                {result.matches.map((m, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2 text-slate-600">{i + 1}</td>
                    <td className="px-4 py-2 text-indigo-300">{m.value}</td>
                    <td className="px-4 py-2 text-slate-400">{m.index}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {m.groups
                        ? Object.entries(m.groups)
                            .map(([k, v]) => `${k}: "${v}"`)
                            .join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}