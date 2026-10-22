// src/components/ui/ws.tsx — shared building blocks for workspace-style tools.
import React, { useState, useEffect, useCallback } from 'react';

export function Panel({
  title, actions, children, className = '', footer,
}: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; footer?: React.ReactNode }) {
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-800 bg-ws-panel ${className}`}>
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-3">
        <h2 className="truncate text-[13px] font-medium text-slate-300">{title}</h2>
        <div className="flex items-center gap-1">{actions}</div>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
      {footer && <div className="shrink-0 border-t border-slate-800 px-3 py-1.5 font-mono text-[11.5px] text-slate-500">{footer}</div>}
    </section>
  );
}

export function Btn({
  children, onClick, primary, title, disabled, pressed,
}: { children: React.ReactNode; onClick?: () => void; primary?: boolean; title?: string; disabled?: boolean; pressed?: boolean }) {
  const base = 'inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[12.5px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none';
  const look = primary
    ? 'bg-indigo-500 text-slate-950 hover:bg-indigo-400'
    : pressed
      ? 'bg-slate-700 text-white'
      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100';
  return (
    <button type="button" className={`${base} ${look}`} onClick={onClick} title={title} disabled={disabled} aria-pressed={pressed}>
      {children}
    </button>
  );
}

export function CopyBtn({ text, label = 'Copy', onDone }: { text: string; label?: string; onDone?: () => void }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1400);
    onDone?.();
  }, [text, onDone]);
  return <Btn onClick={copy} disabled={!text} primary>{done ? 'Copied' : label}</Btn>;
}

export function DownloadBtn({ text, filename, mime = 'text/plain', onDone }: { text: string; filename: string; mime?: string; onDone?: () => void }) {
  const dl = () => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onDone?.();
  };
  return <Btn onClick={dl} disabled={!text} title={`Download ${filename}`}>Download</Btn>;
}

export const editorCls =
  'absolute inset-0 h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-slate-200 outline-none placeholder:text-slate-600';

const HANDOFF_KEY = 'syntaxsnap:handoff';

/**
 * Opens another tool with this text as its input. The text travels through
 * sessionStorage, never the URL, so it is not sent to the server or logged.
 */
export function sendTo(href: string, text: string) {
  try { sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ to: href, text })); } catch { /* storage blocked */ }
  window.location.href = href;
}

/** Reads text handed over by another tool, or ?input= from the Chrome extension, once on load. */
export function useIncomingInput(set: (v: string) => void) {
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HANDOFF_KEY);
      if (raw) {
        sessionStorage.removeItem(HANDOFF_KEY);
        const h = JSON.parse(raw) as { to: string; text: string };
        if (h.to === window.location.pathname && h.text) { set(h.text); return; }
      }
    } catch { /* storage blocked */ }
    const p = new URLSearchParams(window.location.search);
    const v = p.get('input');
    if (v) { set(v); window.history.replaceState({}, '', window.location.pathname); }
  }, []);
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-slate-800 bg-slate-950 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-6 rounded px-2.5 text-[12px] font-medium transition-colors ${value === o.value ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
