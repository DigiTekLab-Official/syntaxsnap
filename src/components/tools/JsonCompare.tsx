// src/components/tools/JsonCompare.tsx — semantic JSON diff (key order ignored).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { diffLines } from 'diff';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented } from '../ui/ws';
import { CodeInput, selectInTextarea } from '../ui/CodeInput';
import { OpenFileBtn, DropZone } from '../ui/InputSource';
import { parseAsync, SupersededError } from '../../utils/json/worker';
import { diffJson, canonicalPretty, type Change } from '../../utils/json/compare';
import type { ParseError } from '../../utils/json/parse';
import { trackToolEvent } from '../../utils/analytics';
import { useDebounce } from '../../hooks/useDebounce';

const LEFT = `{
  "id": 1042,
  "name": "Starter plan",
  "price": { "amount": 9, "currency": "USD" },
  "features": ["5 projects", "Email support"],
  "trial": true,
  "legacy_code": "ST-1"
}`;

const RIGHT = `{
  "name": "Starter plan",
  "id": 1042,
  "price": { "currency": "USD", "amount": 12 },
  "features": ["5 projects", "Email support", "API access"],
  "trial": false,
  "billing": "monthly"
}`;

type View = 'changes' | 'text';
type Side = { value?: unknown; error?: ParseError };

const short = (v: unknown) => {
  if (v === undefined) return '';
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 79) + '…' : s;
};

const KIND_STYLE: Record<Change['kind'], string> = {
  added: 'bg-emerald-500/15 text-emerald-300',
  removed: 'bg-rose-500/15 text-rose-300',
  changed: 'bg-amber-500/15 text-amber-200',
};

export default function JsonCompare() {
  const [left, setLeft] = useState(LEFT);
  const [right, setRight] = useState(RIGHT);
  const [view, setView] = useState<View>('changes');
  const [ignoreOrder, setIgnoreOrder] = useState(false);
  const [a, setA] = useState<Side>({});
  const [b, setB] = useState<Side>({});
  const [notice, setNotice] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLTextAreaElement>(null);
  const rightRef = useRef<HTMLTextAreaElement>(null);
  const tracked = useRef(false);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const dl = useDebounce(left, 200);
  const dr = useDebounce(right, 200);
  useEffect(() => {
    let live = true;
    parseAsync(dl, { tolerant: true }, 'cmp-a').then((r) => live && setA(r)).catch((e) => { if (!(e instanceof SupersededError)) setA({ error: { message: String(e) } }); });
    return () => { live = false; };
  }, [dl]);
  useEffect(() => {
    let live = true;
    parseAsync(dr, { tolerant: true }, 'cmp-b').then((r) => live && setB(r)).catch((e) => { if (!(e instanceof SupersededError)) setB({ error: { message: String(e) } }); });
    return () => { live = false; };
  }, [dr]);

  const ready = !a.error && !b.error && 'value' in a && 'value' in b;
  const diff = useMemo(() => (ready ? diffJson(a.value, b.value, { ignoreArrayOrder: ignoreOrder }) : null), [ready, a, b, ignoreOrder]);
  const textDiff = useMemo(() => (ready && view === 'text' ? diffLines(canonicalPretty(a.value), canonicalPretty(b.value)) : null), [ready, a, b, view]);

  useEffect(() => {
    if (diff && !tracked.current && (dl !== LEFT || dr !== RIGHT)) { tracked.current = true; trackToolEvent('json-compare', 'compare', dl.length + dr.length); }
  }, [diff, dl, dr]);

  const counts = useMemo(() => {
    const c = { added: 0, removed: 0, changed: 0 };
    diff?.changes.forEach((x) => { c[x.kind]++; });
    return c;
  }, [diff]);
  const report = diff ? JSON.stringify(diff.changes, null, 2) : '';

  const swap = () => { setLeft(right); setRight(left); };

  const sidePanel = (label: string, id: string, value: string, set: (v: string) => void, side: Side, ref: React.RefObject<HTMLTextAreaElement | null>) => (
    <DropZone className="h-[min(48vh,440px)] min-h-[300px]" onText={(t) => { set(t); trackToolEvent('json-compare', 'file_open', t.length); }} onError={setNotice}>
      <Panel
        className="h-full"
        title={side.error ? <span className="text-rose-300">{label} · invalid</span> : label}
        actions={<>
          <OpenFileBtn accept=".json,.jsonc,.txt,application/json" onText={(t) => { set(t); trackToolEvent('json-compare', 'file_open', t.length); }} onError={setNotice} />
          <Btn onClick={() => set('')}>Clear</Btn>
        </>}
        footer={side.error
          ? <button type="button" className="text-left text-rose-300 hover:underline" onClick={() => selectInTextarea(ref.current, value, side.error!.line, side.error!.column)}>
              {side.error.line ? `Line ${side.error.line}, column ${side.error.column}: ` : ''}{side.error.message}
            </button>
          : `${value.length.toLocaleString()} characters`}
      >
        <CodeInput id={id} label={`${label} JSON`} value={value} onChange={set} inputRef={ref} errorLine={side.error?.line} placeholder={`Paste the ${label.toLowerCase()} JSON`} />
      </Panel>
    </DropZone>
  );

  return (
    <div ref={rootRef} className="space-y-3" data-tool="json-compare">
      <div className="grid gap-3 lg:grid-cols-2">
        {sidePanel('Original', 'cmp-left', left, setLeft, a, leftRef)}
        {sidePanel('Changed', 'cmp-right', right, setRight, b, rightRef)}
      </div>
      {notice && <p role="alert" className="text-[13px] text-rose-300">{notice}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Result view" value={view} onChange={setView} options={[{ value: 'changes', label: 'Changes' }, { value: 'text', label: 'Side by side text' }]} />
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400" title="Match array items regardless of their position">
          <input type="checkbox" checked={ignoreOrder} onChange={(e) => setIgnoreOrder(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
          Ignore array order
        </label>
        <Btn onClick={swap} title="Swap original and changed">Swap</Btn>
      </div>

      <Panel
        className="h-[min(60vh,520px)] min-h-[320px]"
        title={!ready ? 'Differences' : diff && diff.changes.length === 0
          ? <span className="text-ws-local">No differences</span>
          : <span data-summary>{counts.added} added · {counts.removed} removed · {counts.changed} changed{diff?.truncated ? ' (first 5,000)' : ''}</span>}
        actions={<>
          <DownloadBtn text={report} filename="json-diff.json" mime="application/json" onDone={() => trackToolEvent('json-compare', 'download')} />
          <CopyBtn text={report} label="Copy changes" onDone={() => trackToolEvent('json-compare', 'copy')} />
        </>}
        footer={'Key order is ignored: {"a":1,"b":2} equals {"b":2,"a":1}'}
      >
        {!ready ? (
          <p className="p-4 text-[13px] text-slate-400" role="status">{a.error || b.error ? 'Fix the invalid JSON above to compare.' : 'Paste JSON on both sides to compare.'}</p>
        ) : view === 'changes' ? (
          diff!.changes.length === 0 ? (
            <p className="p-4 text-[14px] text-slate-300" data-equal>The two documents are equal. Only key order or whitespace differs, if anything.</p>
          ) : (
            <div className="absolute inset-0 overflow-auto">
              <table className="min-w-full font-mono text-[12.5px]" data-changes>
                <thead className="sticky top-0 bg-ws-raised text-left text-slate-400">
                  <tr>
                    <th scope="col" className="px-3 py-1.5 font-medium">Change</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Path</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">Before</th>
                    <th scope="col" className="px-3 py-1.5 font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {diff!.changes.map((c, i) => (
                    <tr key={i} className="border-t border-slate-800/70 align-top">
                      <td className="px-3 py-1.5"><span className={`rounded px-1.5 py-px text-[11px] font-medium ${KIND_STYLE[c.kind]}`}>{c.kind}</span></td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-sky-300">{c.path}</td>
                      <td className="px-3 py-1.5 text-rose-200/90">{short(c.before)}</td>
                      <td className="px-3 py-1.5 text-emerald-200/90">{short(c.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <pre className="absolute inset-0 overflow-auto py-2 font-mono text-[12.5px] leading-[20px]" data-text-diff tabIndex={0} aria-label="Text diff with keys sorted">
            {textDiff!.map((part, i) => {
              const cls = part.added ? 'bg-emerald-500/15 text-emerald-200' : part.removed ? 'bg-rose-500/15 text-rose-200' : 'text-slate-400';
              const sign = part.added ? '+ ' : part.removed ? '- ' : '  ';
              return part.value.replace(/\n$/, '').split('\n').map((line, j) => (
                <div key={`${i}-${j}`} className={`px-3 ${cls}`}>{sign}{line}</div>
              ));
            })}
          </pre>
        )}
      </Panel>
    </div>
  );
}
