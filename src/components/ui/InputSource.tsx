// src/components/ui/InputSource.tsx — ways to get text into a tool without
// uploading it: a file picker, drag-and-drop, and a browser fetch of a URL the
// user types. Files are read with FileReader on this device.
import React, { useRef, useState } from 'react';
import { Btn, sendTo } from './ws';

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`This file is ${(file.size / 1048576).toFixed(0)} MB. The limit is 50 MB.`));
      return;
    }
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(new Error('The file could not be read.'));
    r.readAsText(file);
  });
}

/** Hidden file input plus an "Open file" button. */
export function OpenFileBtn({ accept, onText, onError }: { accept: string; onText: (text: string, name: string) => void; onError: (msg: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Btn onClick={() => ref.current?.click()} title="Open a file from your computer. It is read locally, not uploaded.">Open file</Btn>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-label="Open file"
        data-file-input
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try { onText(await readTextFile(f), f.name); } catch (err) { onError((err as Error).message); }
        }}
      />
    </>
  );
}

/** Wraps a panel so a file can be dropped anywhere on it. */
export function DropZone({ children, onText, onError, label = 'Drop a file to open it', className = '' }: {
  children: React.ReactNode; onText: (text: string, name: string) => void; onError: (msg: string) => void; label?: string; className?: string;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  return (
    <div
      className={`relative flex min-h-0 flex-col ${className}`}
      data-dropzone
      onDragEnter={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); depth.current++; setOver(true); } }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={async (e) => {
        const f = e.dataTransfer.files?.[0];
        depth.current = 0;
        setOver(false);
        if (!f) return;
        e.preventDefault();
        try { onText(await readTextFile(f), f.name); } catch (err) { onError((err as Error).message); }
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-ws-bg/85 text-[14px] font-medium text-indigo-200">
          {label}. It stays on your device.
        </div>
      )}
    </div>
  );
}

/**
 * Fetches a URL the user typed, directly from their browser. No proxy: the
 * request goes from this tab to that server, and SyntaxSnap never sees it.
 */
export function UrlLoader({ onText, onClose }: { onText: (text: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});
  const load = async (e: React.FormEvent) => {
    e.preventDefault();
    let u: URL;
    try { u = new URL(url.trim()); } catch { setState({ error: 'Enter a full URL starting with https://' }); return; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') { setState({ error: 'Only http and https URLs can be loaded.' }); return; }
    setState({ busy: true });
    try {
      const res = await fetch(u.toString(), { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (!res.ok) throw new Error(`The server answered ${res.status} ${res.statusText}.`);
      const len = Number(res.headers.get('content-length') || 0);
      if (len > MAX_FILE_BYTES) throw new Error('The response is larger than 50 MB.');
      const text = await res.text();
      onText(text);
      setState({});
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      setState({ error: /fetch|network|load failed|cors|content security/i.test(msg) || err instanceof TypeError
        ? 'Could not load it. The server may not allow requests from other sites (CORS), or the URL is unreachable.'
        : msg });
    }
  };
  return (
    <form onSubmit={load} className="border-b border-slate-800 bg-ws-rail/60 px-3 py-2.5">
      <div className="flex gap-2">
        <label htmlFor="load-url" className="sr-only">URL to load</label>
        <input
          id="load-url"
          type="url"
          inputMode="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data.json"
          className="h-7 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 font-mono text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
        <button type="submit" disabled={state.busy} className="h-7 rounded bg-indigo-500 px-2.5 text-[12.5px] font-medium text-slate-950 hover:bg-indigo-400 disabled:opacity-50">{state.busy ? 'Loading…' : 'Fetch'}</button>
        <Btn onClick={onClose}>Cancel</Btn>
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-slate-500">
        Your browser fetches this URL directly. The site you enter sees the request; SyntaxSnap does not. The server must allow cross-origin requests.
      </p>
      {state.error && <p role="alert" className="mt-1 text-[12.5px] text-rose-300">{state.error}</p>}
    </form>
  );
}

export interface SendTarget { label: string; href: string }

/** "Send to" menu that hands the output to another tool via sessionStorage. */
export function SendToMenu({ text, targets, onSend }: { text: string; targets: SendTarget[]; onSend?: (t: SendTarget) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  // sessionStorage holds about 5 MB; larger outputs cannot be handed over.
  const tooBig = text.length > 2_400_000;
  if (!text || targets.length === 0) return null;
  return (
    <details ref={ref} className="relative">
      <summary
        className="inline-flex h-7 cursor-pointer list-none items-center gap-1 rounded px-2.5 text-[12.5px] font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-100 [&::-webkit-details-marker]:hidden"
        title="Open this output in another tool"
      >
        Send to
        <svg className="h-3 w-3" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </summary>
      <div className="absolute right-0 top-8 z-20 w-56 rounded-md border border-slate-700 bg-ws-raised p-1 shadow-xl">
        {tooBig ? (
          <p className="px-2 py-1.5 text-[12.5px] text-slate-400">The output is too large to hand over. Download it instead.</p>
        ) : targets.map((t) => (
          <button
            key={t.href}
            type="button"
            className="block w-full rounded px-2 py-1.5 text-left text-[13px] text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => { ref.current?.removeAttribute('open'); onSend?.(t); sendTo(t.href, text); }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </details>
  );
}
