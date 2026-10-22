import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, Segmented, editorCls, useIncomingInput } from '../ui/ws';

type Mode = 'encode' | 'decode';
type Scope = 'component' | 'uri';

function safeDecode(s: string) {
  try { return { value: decodeURIComponent(s.replace(/\+/g, ' ')), error: '' }; }
  catch { return { value: '', error: 'This text has a broken percent sequence, such as a % not followed by two hex digits.' }; }
}

export default function UrlEncoder() {
  const [mode, setMode] = useState<Mode>('encode');
  const [scope, setScope] = useState<Scope>('component');
  const [input, setInput] = useState('https://api.example.com/search?q=café & bar&tags=a,b&redirect=/home?tab=1');
  const rootRef = useRef<HTMLDivElement>(null);
  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: '' };
    if (mode === 'decode') { const r = safeDecode(input); return { output: r.value, error: r.error }; }
    return { output: scope === 'component' ? encodeURIComponent(input) : encodeURI(input), error: '' };
  }, [input, mode, scope]);

  const params = useMemo(() => {
    const src = mode === 'decode' ? output || input : input;
    try {
      const u = new URL(src.trim());
      return { base: `${u.origin}${u.pathname}`, rows: [...u.searchParams.entries()], hash: u.hash };
    } catch { return null; }
  }, [input, output, mode]);

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Direction" value={mode} onChange={setMode} options={[{ value: 'encode', label: 'Encode' }, { value: 'decode', label: 'Decode' }]} />
        {mode === 'encode' && (
          <Segmented label="What to encode" value={scope} onChange={setScope} options={[{ value: 'component', label: 'Query value' }, { value: 'uri', label: 'Full URL' }]} />
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="h-[300px]" title="Input" actions={<Btn onClick={() => setInput('')}>Clear</Btn>}>
          <label htmlFor="url-in" className="sr-only">Input</label>
          <textarea id="url-in" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Paste a URL or text" className={editorCls} />
        </Panel>
        <Panel className="h-[300px]" title={mode === 'encode' ? 'Encoded' : 'Decoded'} actions={<><Btn onClick={() => { setInput(output); setMode(mode === 'encode' ? 'decode' : 'encode'); }} disabled={!output}>Use as input</Btn><CopyBtn text={output} /></>}>
          {error ? <p role="alert" className="p-4 text-[14px] text-rose-300">{error}</p> : (
            <pre data-output-pane className="absolute inset-0 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[13px] leading-relaxed text-slate-200">{output}</pre>
          )}
        </Panel>
      </div>
      {params && (
        <Panel title="URL parts">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[12.5px]">
              <tbody className="divide-y divide-slate-800">
                <tr><th className="w-40 px-3 py-2 font-medium text-slate-500">base</th><td className="break-all px-3 py-2 text-slate-200">{params.base}</td></tr>
                {params.rows.map(([k, v], i) => (
                  <tr key={i}><th className="px-3 py-2 font-medium text-indigo-300">{k}</th><td className="break-all px-3 py-2 text-slate-200">{v || <span className="text-slate-600">(empty)</span>}</td></tr>
                ))}
                {params.hash && <tr><th className="px-3 py-2 font-medium text-slate-500">hash</th><td className="px-3 py-2 text-slate-200">{params.hash}</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
