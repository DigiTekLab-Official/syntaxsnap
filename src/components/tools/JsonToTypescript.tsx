import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented, editorCls, useIncomingInput, sendTo } from '../ui/ws';
import { jsonToTs } from '../../utils/jsonToTs';
import { parseJson } from '../../utils/jsonTools';
import { useDebounce } from '../../hooks/useDebounce';

const SAMPLE = `{
  "id": 4021,
  "login": "octo-dev",
  "profile": { "name": "Mara Lind", "company": null, "location": "Berlin" },
  "repos": [
    { "name": "api-gateway", "stars": 312, "private": false, "topics": ["go", "grpc"] },
    { "name": "infra", "stars": 18, "private": true, "topics": [], "archived": true }
  ],
  "created_at": "2021-03-14T09:26:53Z"
}`;

export default function JsonToTypescript() {
  const [input, setInput] = useState(SAMPLE);
  const [rootName, setRootName] = useState('User');
  const [style, setStyle] = useState<'interface' | 'type'>('interface');
  const [readonly, setReadonly] = useState(false);
  const [exportAll, setExportAll] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const debounced = useDebounce(input, 200);
  const { output, error } = useMemo(() => {
    if (!debounced.trim()) return { output: '', error: '' };
    const { value, error } = parseJson(debounced);
    if (error) return { output: '', error: `${error.line ? `Line ${error.line}, column ${error.column}: ` : ''}${error.message}` };
    return { output: jsonToTs(value, { rootName: rootName || 'Root', style, readonly, exportAll }), error: '' };
  }, [debounced, rootName, style, readonly, exportAll]);

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[13px] text-slate-400">
          Root name
          <input value={rootName} onChange={(e) => setRootName(e.target.value)} className="h-7 w-32 rounded border border-slate-800 bg-slate-950 px-2 font-mono text-[12.5px] text-slate-200 outline-none focus:border-indigo-500" />
        </label>
        <Segmented label="Declaration style" value={style} onChange={setStyle} options={[{ value: 'interface', label: 'interface' }, { value: 'type', label: 'type' }]} />
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400"><input type="checkbox" checked={exportAll} onChange={(e) => setExportAll(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />export</label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400"><input type="checkbox" checked={readonly} onChange={(e) => setReadonly(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />readonly</label>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="h-[min(70vh,600px)] min-h-[360px]" title="JSON" actions={<><Btn onClick={() => setInput(SAMPLE)}>Sample</Btn><Btn onClick={() => setInput('')}>Clear</Btn></>}>
          <label htmlFor="ts-in" className="sr-only">JSON input</label>
          <textarea id="ts-in" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Paste a JSON object or API response" className={editorCls} />
        </Panel>
        <Panel className="h-[min(70vh,600px)] min-h-[360px]" title="TypeScript" actions={<>{output && <Btn onClick={() => sendTo('/tools/ts-to-zod', output)} title="Turn these types into Zod schemas">To Zod</Btn>}<DownloadBtn text={output} filename="types.ts" /><CopyBtn text={output} /></>}
          footer={output ? 'Keys missing from some array items are marked optional' : ' '}>
          {error ? (
            <p role="alert" className="p-4 text-[14px] text-rose-300">{error}</p>
          ) : (
            <pre data-output-pane className="absolute inset-0 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-sky-200 whitespace-pre">{output}</pre>
          )}
        </Panel>
      </div>
    </div>
  );
}
