// src/components/ui/CodeView.tsx — read-only output with light JSON colouring.
// Very large outputs are shown truncated; Copy and Download always use the full text.
import React, { useMemo } from 'react';
import { fmtBytes } from '../../utils/json/format';

/** Characters rendered in the output pane. */
export const DISPLAY_LIMIT = 400_000;
/** Above this, skip colouring (thousands of spans slow the page down). */
const HIGHLIGHT_LIMIT = 150_000;

const TOKEN = /("(?:\\.|[^"\\\n])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

export function highlightJson(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push(<span key={k++} className="text-sky-300">{m[1]}</span>, m[2]);
      } else {
        out.push(<span key={k++} className="text-emerald-300">{m[1]}</span>);
      }
    } else if (m[3] !== undefined) {
      out.push(<span key={k++} className="text-fuchsia-300">{m[3]}</span>);
    } else {
      out.push(<span key={k++} className="text-amber-300">{m[4]}</span>);
    }
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function CodeView({ text, lang = 'json', label = 'Output' }: { text: string; lang?: 'json' | 'text'; label?: string }) {
  const truncated = text.length > DISPLAY_LIMIT;
  const shown = truncated ? text.slice(0, DISPLAY_LIMIT) : text;
  const body = useMemo(
    () => (lang === 'json' && shown.length <= HIGHLIGHT_LIMIT ? highlightJson(shown) : shown),
    [shown, lang],
  );
  return (
    <div className="absolute inset-0 flex flex-col">
      {truncated && (
        <p className="shrink-0 border-b border-slate-800 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200">
          Showing the first {fmtBytes(DISPLAY_LIMIT)} of {fmtBytes(text.length)}. Copy and Download include everything.
        </p>
      )}
      <pre
        data-output-pane
        aria-label={label}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto whitespace-pre p-3 font-mono text-[13px] leading-[20px] text-slate-200"
      >
        {body}
      </pre>
    </div>
  );
}
