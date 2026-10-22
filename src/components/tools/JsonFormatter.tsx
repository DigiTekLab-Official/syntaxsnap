import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented, editorCls, useIncomingInput, sendTo } from '../ui/ws';
import { parseJson, sortKeysDeep, stats, repairJson, bytes, fmtBytes } from '../../utils/jsonTools';
import { useDebounce } from '../../hooks/useDebounce';

const SAMPLE = `{"id":"ord_8f2c","status":"paid","total":129.5,"currency":"USD","customer":{"name":"Priya Raman","email":"priya@example.com"},"items":[{"sku":"KB-01","qty":1,"price":89.5},{"sku":"MS-07","qty":2,"price":20}],"shipped":false,"notes":null}`;

type Indent = '2' | '4' | 'tab';
type Mode = 'pretty' | 'minify';

export default function JsonFormatter() {
  const [input, setInput] = useState(SAMPLE);
  const [indent, setIndent] = useState<Indent>('2');
  const [mode, setMode] = useState<Mode>('pretty');
  const [sort, setSort] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const debounced = useDebounce(input, 150);
  const result = useMemo(() => {
    if (!debounced.trim()) return { output: '', error: undefined, info: undefined };
    const { value, error } = parseJson(debounced);
    if (error) return { output: '', error, info: undefined };
    const v = sort ? sortKeysDeep(value) : value;
    const space = mode === 'minify' ? undefined : indent === 'tab' ? '\t' : Number(indent);
    const output = JSON.stringify(v, null, space);
    return { output, error: undefined, info: stats(value) };
  }, [debounced, indent, mode, sort]);

  const jumpToError = () => {
    const el = inputRef.current; const e = result.error;
    if (!el || !e?.line) return;
    const lines = input.split('\n');
    const pos = lines.slice(0, e.line - 1).reduce((n, l) => n + l.length + 1, 0) + (e.column ?? 1) - 1;
    el.focus(); el.setSelectionRange(pos, pos + 1);
  };

  const repaired = result.error ? repairJson(input) : '';
  const canRepair = Boolean(result.error && repaired && !parseJson(repaired).error);

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Output" value={mode} onChange={setMode} options={[{ value: 'pretty', label: 'Beautify' }, { value: 'minify', label: 'Minify' }]} />
        {mode === 'pretty' && (
          <Segmented label="Indent" value={indent} onChange={setIndent} options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }]} />
        )}
        <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
          Sort keys
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel
          className="h-[min(70vh,620px)] min-h-[360px]"
          title="Input"
          actions={<>
            <Btn onClick={() => setInput(SAMPLE)}>Sample</Btn>
            <Btn onClick={() => setInput('')}>Clear</Btn>
          </>}
          footer={input ? `${fmtBytes(bytes(input))} · ${input.split('\n').length} lines` : 'Paste or type JSON'}
        >
          <label htmlFor="json-in" className="sr-only">JSON input</label>
          <textarea id="json-in" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Paste JSON here" className={editorCls} />
        </Panel>

        <Panel
          className="h-[min(70vh,620px)] min-h-[360px]"
          title={result.error ? <span className="text-rose-300">Invalid JSON</span> : result.output ? <span className="text-ws-local">Valid JSON</span> : 'Output'}
          actions={<>
            {result.output && <Btn onClick={() => sendTo('/tools/json-to-typescript', result.output)} title="Open this JSON in JSON to TypeScript">To TypeScript</Btn>}
            {result.output && <Btn onClick={() => sendTo('/tools/json-to-zod', result.output)} title="Open this JSON in JSON to Zod">To Zod</Btn>}
            <DownloadBtn text={result.output} filename="formatted.json" />
            <CopyBtn text={result.output} />
          </>}
          footer={result.info ? `${fmtBytes(bytes(result.output))} · ${result.info.keys} keys · depth ${result.info.depth}` : result.error ? 'Fix the error to see output' : ' '}
        >
          {result.error ? (
            <div className="p-4" role="alert">
              <p className="text-[14px] font-medium text-rose-300">
                {result.error.line ? `Line ${result.error.line}, column ${result.error.column}: ` : ''}{result.error.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.error.line && <Btn onClick={jumpToError}>Show in input</Btn>}
                {canRepair && <Btn primary onClick={() => setInput(repaired)}>Fix common errors</Btn>}
              </div>
              {canRepair && (
                <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-slate-400">
                  This looks like almost-JSON. The fix removes comments and trailing commas, converts single quotes, quotes bare keys and replaces Python literals like True and None.
                </p>
              )}
            </div>
          ) : (
            <pre data-output-pane className="absolute inset-0 overflow-auto p-4 font-mono text-[13px] leading-relaxed text-slate-200 whitespace-pre">{result.output || ''}</pre>
          )}
        </Panel>
      </div>
    </div>
  );
}
