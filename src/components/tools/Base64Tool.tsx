import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, Segmented, editorCls, useIncomingInput } from '../ui/ws';

function encode(text: string, urlSafe: boolean) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : b64;
}

function decode(b64: string) {
  let s = b64.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (s.startsWith('data:')) s = s.slice(s.indexOf(',') + 1);
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export default function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('{"user":"admin","exp":1767225600} ✓ UTF-8 safe');
  const [urlSafe, setUrlSafe] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useIncomingInput((v) => { setInput(v); if (/^[A-Za-z0-9+/_=-]+$/.test(v.trim())) setMode('decode'); });
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    try {
      return { output: mode === 'encode' ? encode(input, urlSafe) : decode(input), error: '' };
    } catch {
      return { output: '', error: mode === 'decode' ? 'This is not valid Base64, or it decodes to binary data rather than UTF-8 text.' : 'Could not encode this input.' };
    }
  }, [input, mode, urlSafe]);

  const swap = () => { if (output) { setInput(output); setMode(mode === 'encode' ? 'decode' : 'encode'); } };

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" value={mode} onChange={setMode} options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
        {mode === 'encode' && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400">
            <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
            URL-safe (base64url, no padding)
          </label>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="h-[min(60vh,480px)] min-h-[300px]" title={mode === 'encode' ? 'Text' : 'Base64'} actions={<Btn onClick={() => setInput('')}>Clear</Btn>}>
          <label htmlFor="b64-in" className="sr-only">Input</label>
          <textarea id="b64-in" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder={mode === 'encode' ? 'Type or paste text to encode' : 'Paste Base64 or a data: URI to decode'} className={editorCls} />
        </Panel>
        <Panel className="h-[min(60vh,480px)] min-h-[300px]" title={mode === 'encode' ? 'Base64' : 'Text'} actions={<><Btn onClick={swap} disabled={!output}>Use as input</Btn><CopyBtn text={output} /></>}
          footer={output ? `${output.length.toLocaleString()} characters` : ' '}>
          {error ? <p role="alert" className="p-4 text-[14px] text-rose-300">{error}</p> : (
            <pre data-output-pane className="absolute inset-0 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-relaxed text-slate-200">{output}</pre>
          )}
        </Panel>
      </div>
    </div>
  );
}
