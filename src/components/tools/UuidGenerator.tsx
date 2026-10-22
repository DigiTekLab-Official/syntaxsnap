import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented } from '../ui/ws';

type Version = 'v4' | 'v7';

function v4() {
  return crypto.randomUUID ? crypto.randomUUID() : v7().replace(/^(.{14})7/, '$14');
}

function v7() {
  // RFC 9562: 48-bit Unix ms timestamp, version 7, variant 10, rest random.
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let ts = Date.now();
  for (let i = 5; i >= 0; i--) { b[i] = ts & 0xff; ts = Math.floor(ts / 256); }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export default function UuidGenerator() {
  const [version, setVersion] = useState<Version>('v4');
  const [count, setCount] = useState(10);
  const [upper, setUpper] = useState(false);
  const [noDash, setNoDash] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(() => {
    const n = Math.min(Math.max(1, count || 1), 1000);
    setIds(Array.from({ length: n }, () => (version === 'v4' ? v4() : v7())));
  }, [count, version]);

  useEffect(() => { generate(); rootRef.current?.setAttribute('data-hydrated', 'true'); }, [generate]);

  const shown = ids.map((id) => { const s0 = noDash ? id.replace(/-/g, '') : id; return upper ? s0.toUpperCase() : s0; });
  const text = shown.join('\n');

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Version" value={version} onChange={setVersion} options={[{ value: 'v4', label: 'v4 random' }, { value: 'v7', label: 'v7 time-ordered' }]} />
        <label className="flex items-center gap-2 text-[13px] text-slate-400">
          How many
          <input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-7 w-20 rounded border border-slate-800 bg-slate-950 px-2 font-mono text-[12.5px] text-slate-200 outline-none focus:border-indigo-500" />
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />Uppercase</label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400"><input type="checkbox" checked={noDash} onChange={(e) => setNoDash(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />No hyphens</label>
        <Btn primary onClick={generate}>Generate</Btn>
      </div>
      <Panel className="h-[min(60vh,520px)] min-h-[280px]" title={`${shown.length} ${version} UUIDs`} actions={<><DownloadBtn text={text} filename="uuids.txt" /><CopyBtn text={text} label="Copy all" /></>}
        footer={version === 'v7' ? 'v7 IDs sort by creation time, which keeps database indexes compact' : 'v4 IDs are 122 bits of secure randomness'}>
        <ol className="absolute inset-0 overflow-auto py-2 font-mono text-[13px]">
          {shown.map((id, i) => (
            <li key={i} className="group flex items-center gap-4 px-4 py-1 hover:bg-slate-900">
              <span className="w-8 text-right text-slate-600 tabular-nums">{i + 1}</span>
              <span className="flex-1 select-all text-slate-200">{id}</span>
              <button type="button" onClick={() => navigator.clipboard.writeText(id)} className="text-[12px] text-slate-500 opacity-0 hover:text-indigo-300 focus:opacity-100 group-hover:opacity-100">Copy</button>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
