// src/components/ui/JsonWorkbench.tsx — the JSON hub's main editor.
//
// One component behind the formatter, viewer, validator and minifier pages.
// Each page sets its default view and action through props. Everything runs in
// this tab: inputs over 1 MB are parsed in a Web Worker so typing stays smooth.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented, useIncomingInput } from './ws';
import { CodeInput, selectInTextarea } from './CodeInput';
import { CodeView } from './CodeView';
import { JsonTree } from './JsonTree';
import { OpenFileBtn, DropZone, UrlLoader, SendToMenu, type SendTarget } from './InputSource';
import { formatAsync, parseAsync, SupersededError, WORKER_THRESHOLD } from '../../utils/json/worker';
import { fmtBytes, type FormatResult, type Indent } from '../../utils/json/format';
import { repairJson } from '../../utils/json/repair';
import { parseJson } from '../../utils/json/parse';
import { trackToolEvent, type ToolAction } from '../../utils/analytics';
import { useDebounce } from '../../hooks/useDebounce';

export const DEFAULT_SAMPLE = `{"id":"ord_8f2c","status":"paid","total":129.5,"currency":"USD","customer":{"name":"Priya Raman","email":"priya@example.com"},"items":[{"sku":"KB-01","qty":1,"price":89.5},{"sku":"MS-07","qty":2,"price":20}],"shipped":false,"notes":null}`;

const SEND_TARGETS: SendTarget[] = [
  { label: 'JSON to TypeScript', href: '/tools/json-to-typescript' },
  { label: 'JSON to Zod', href: '/tools/json-to-zod' },
  { label: 'JSON to CSV', href: '/tools/json-to-csv' },
];

type View = 'code' | 'tree';
type Mode = 'beautify' | 'minify';

export interface JsonWorkbenchProps {
  /** Tool id for analytics, e.g. "json-formatter". */
  tool: string;
  defaultView?: View;
  /** 'validate' shows the pass/fail banner and the full problem list. */
  defaultAction?: Mode | 'validate';
  defaultIndent?: Indent;
  sample?: string;
  /** Tree levels open on load (viewer uses 2). */
  treeDepth?: number;
}

/** Repair is only attempted on inputs small enough to do it instantly. */
const REPAIR_LIMIT = 2 * 1024 * 1024;

export default function JsonWorkbench({ tool, defaultView = 'code', defaultAction = 'beautify', defaultIndent = '2', sample = DEFAULT_SAMPLE, treeDepth = 1 }: JsonWorkbenchProps) {
  const validate = defaultAction === 'validate';
  const [input, setInput] = useState(sample);
  const [view, setView] = useState<View>(defaultView);
  const [mode, setMode] = useState<Mode>(defaultAction === 'minify' ? 'minify' : 'beautify');
  const [indent, setIndent] = useState<Indent>(defaultIndent);
  const [sort, setSort] = useState(false);
  const [tolerant, setTolerant] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<FormatResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [treeValue, setTreeValue] = useState<{ value: unknown } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seq = useRef(0);
  const pasted = useRef(false);

  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const track = useCallback((action: ToolAction, size?: number) => trackToolEvent(tool, action, size), [tool]);

  const big = input.length >= WORKER_THRESHOLD;
  const debounced = useDebounce(input, big ? 400 : 120);

  // Format (and validate) whenever the input or options change.
  useEffect(() => {
    if (!debounced.trim()) { setResult(null); setBusy(false); return; }
    const id = ++seq.current;
    setBusy(true);
    formatAsync(debounced, { indent, minify: mode === 'minify', sortKeys: sort, tolerant, lint: validate })
      .then((r) => {
        if (id !== seq.current) return;
        setResult(r);
        setBusy(false);
        if (pasted.current && !r.error) {
          pasted.current = false;
          track(validate ? 'validate' : mode === 'minify' ? 'minify' : 'format', r.inputBytes);
        }
      })
      .catch((e) => {
        if (e instanceof SupersededError || id !== seq.current) return;
        setBusy(false);
        setResult({ output: '', error: { message: (e as Error).message }, inputBytes: 0, outputBytes: 0, parseMs: 0 });
      });
  }, [debounced, indent, mode, sort, tolerant, validate, track]);

  // The tree needs the parsed value; big documents are parsed in the worker.
  useEffect(() => {
    if (view !== 'tree' || !result || result.error) { if (view !== 'tree') setTreeValue(null); return; }
    let live = true;
    parseAsync(debounced, { tolerant }, 'tree')
      .then((r) => { if (live && !r.error) setTreeValue({ value: r.value }); })
      .catch(() => { /* superseded */ });
    return () => { live = false; };
  }, [view, result, debounced, tolerant]);

  const error = result?.error;
  const repaired = useMemo(() => {
    if (!error || input.length > REPAIR_LIMIT) return '';
    const fixed = repairJson(input);
    const p = parseJson(fixed);
    return p.error ? '' : JSON.stringify(p.value, null, indent === 'tab' ? '\t' : Number(indent));
  }, [error, input, indent]);

  const loadText = (text: string, how: ToolAction) => {
    setInput(text);
    setNotice('');
    pasted.current = true;
    track(how, text.length);
  };
  const onFileError = (msg: string) => setNotice(msg);
  const jump = (line?: number, column?: number) => selectInTextarea(inputRef.current, input, line, column);
  const applyRepair = () => { setInput(repaired); track('repair', repaired.length); };

  const issues = result?.issues ?? [];
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const saved = result && !error && mode === 'minify' ? result.inputBytes - result.outputBytes : 0;
  const savedPct = result && result.inputBytes ? Math.round((saved / result.inputBytes) * 100) : 0;

  const footer = result && !error && result.stats
    ? [
        fmtBytes(result.outputBytes),
        `${result.stats.keys.toLocaleString()} keys`,
        `depth ${result.stats.depth}`,
        `parsed in ${result.parseMs < 1 ? '<1' : Math.round(result.parseMs)} ms`,
        mode === 'minify' && saved > 0 ? `saved ${fmtBytes(saved)} (${savedPct}%)` : '',
      ].filter(Boolean).join(' · ')
    : error ? 'Fix the error to see output' : busy ? 'Working…' : ' ';

  const outTitle = error
    ? <span className="text-rose-300">Invalid JSON</span>
    : result?.output ? <span className="text-ws-local">Valid JSON</span> : 'Output';
  const outName = mode === 'minify' ? 'minified.json' : 'formatted.json';

  return (
    <div ref={rootRef} className="space-y-3" data-tool={tool}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented label="Output style" value={mode} onChange={(v) => { setMode(v); track(v === 'minify' ? 'minify' : 'format', input.length); }} options={[{ value: 'beautify', label: 'Beautify' }, { value: 'minify', label: 'Minify' }]} />
        {mode === 'beautify' && (
          <Segmented label="Indent" value={indent} onChange={setIndent} options={[{ value: '2', label: '2 spaces' }, { value: '4', label: '4 spaces' }, { value: 'tab', label: 'Tab' }]} />
        )}
        <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400">
          <input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
          Sort keys
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400" title="Accept comments, trailing commas and single-quoted strings (JSONC / JSON5)">
          <input type="checkbox" checked={tolerant} onChange={(e) => setTolerant(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
          Allow comments (JSONC)
        </label>
        <span className="ml-auto">
          <Segmented label="View" value={view} onChange={(v) => { setView(v); if (v === 'tree') track('tree'); }} options={[{ value: 'code', label: 'Code' }, { value: 'tree', label: 'Tree' }]} />
        </span>
      </div>

      {validate && result && (
        <ValidationBanner
          valid={!error}
          errors={errors.length ? errors : error ? [{ message: error.message, line: error.line ?? 0, column: error.column ?? 0, position: 0, severity: 'error' as const }] : []}
          warnings={warnings}
          stats={result.stats}
          onJump={jump}
          onRepair={repaired ? applyRepair : undefined}
        />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <DropZone className="h-[min(70vh,620px)] min-h-[360px]" onText={(t) => loadText(t, 'file_open')} onError={onFileError}>
          <Panel
            className="h-full"
            title="Input"
            actions={<>
              <Btn onClick={() => { setInput(sample); setNotice(''); }}>Sample</Btn>
              <OpenFileBtn accept=".json,.jsonc,.json5,.txt,.ndjson,application/json,text/plain" onText={(t) => loadText(t, 'file_open')} onError={onFileError} />
              <Btn onClick={() => setShowUrl((s) => !s)} pressed={showUrl} title="Load JSON from a URL with your browser">URL</Btn>
              <Btn onClick={() => { setInput(''); setNotice(''); inputRef.current?.focus(); }}>Clear</Btn>
            </>}
            footer={notice ? <span className="text-rose-300">{notice}</span> : input ? `${result ? fmtBytes(result.inputBytes) : '…'}${big ? ' · large file, processed in the background' : ''}` : 'Paste JSON, drop a file, or open one'}
          >
            <div className="absolute inset-0 flex flex-col">
              {showUrl && <UrlLoader onText={(t) => loadText(t, 'url_load')} onClose={() => setShowUrl(false)} />}
              <div className="relative min-h-0 flex-1">
                <CodeInput
                  id="json-in"
                  label="JSON input"
                  value={input}
                  onChange={setInput}
                  onPaste={() => { pasted.current = true; }}
                  inputRef={inputRef}
                  errorLine={error?.line}
                  placeholder="Paste JSON here, or drop a .json file"
                />
              </div>
            </div>
          </Panel>
        </DropZone>

        <Panel
          className="h-[min(70vh,620px)] min-h-[360px]"
          title={outTitle}
          actions={<>
            {result?.output && <SendToMenu text={result.output} targets={SEND_TARGETS} onSend={() => track('send_to')} />}
            <DownloadBtn text={result?.output ?? ''} filename={outName} mime="application/json" onDone={() => track('download', result?.outputBytes)} />
            <CopyBtn text={result?.output ?? ''} onDone={() => track('copy', result?.outputBytes)} />
          </>}
          footer={footer}
        >
          {error ? (
            <div className="absolute inset-0 overflow-auto p-4" role="alert" data-error>
              <p className="text-[14px] font-medium text-rose-300">
                {error.line ? `Line ${error.line}, column ${error.column}: ` : ''}{error.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {error.line && <Btn onClick={() => jump(error.line, error.column)}>Show in input</Btn>}
                {repaired && <Btn primary onClick={applyRepair}>Fix common errors</Btn>}
              </div>
              {repaired && (
                <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-slate-400">
                  This looks like almost-JSON. The fix strips code fences and comments, removes trailing commas, adds missing ones, converts single quotes, quotes bare keys, and replaces Python literals like True and None.
                </p>
              )}
              {!tolerant && error.message.startsWith('Comments') && (
                <p className="mt-2 text-[13px] text-slate-400">Is this a JSONC config file (tsconfig, VS Code settings)? Tick <strong className="text-slate-300">Allow comments</strong> above to read it as is.</p>
              )}
            </div>
          ) : view === 'tree' ? (
            treeValue ? <JsonTree value={treeValue.value} initialDepth={treeDepth} onCopyPath={() => track('copy')} /> : <p className="p-4 text-[13px] text-slate-500">{busy || result ? 'Building tree…' : 'Paste JSON to see its tree.'}</p>
          ) : (
            <CodeView text={result?.output ?? ''} label="Formatted JSON" />
          )}
        </Panel>
      </div>
    </div>
  );
}

interface BannerProps {
  valid: boolean;
  errors: { message: string; line: number; column: number }[];
  warnings: { message: string; line: number; column: number }[];
  stats?: { keys: number; depth: number };
  onJump: (line?: number, column?: number) => void;
  onRepair?: () => void;
}

function ValidationBanner({ valid, errors, warnings, stats, onJump, onRepair }: BannerProps) {
  const list = [...errors.map((e) => ({ ...e, kind: 'error' as const })), ...warnings.map((w) => ({ ...w, kind: 'warning' as const }))];
  return (
    <section
      aria-live="polite"
      data-validation={valid ? 'pass' : 'fail'}
      className={`rounded-lg border px-4 py-3 ${valid ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className={`text-[15px] font-semibold ${valid ? 'text-emerald-300' : 'text-rose-300'}`}>
          {valid ? 'Valid JSON' : `Invalid JSON · ${errors.length} problem${errors.length === 1 ? '' : 's'} found`}
        </h2>
        {valid && stats && <span className="text-[13px] text-slate-400">{stats.keys.toLocaleString()} keys, nested {stats.depth} deep{warnings.length ? ` · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}</span>}
        {onRepair && <span className="ml-auto"><Btn primary onClick={onRepair}>Fix common errors</Btn></span>}
      </div>
      {list.length > 0 && (
        <ol className="mt-2 max-h-48 space-y-1 overflow-auto text-[13px]" data-issues>
          {list.map((it, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span className={`shrink-0 rounded px-1.5 text-[11px] font-medium ${it.kind === 'error' ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/20 text-amber-200'}`}>{it.kind}</span>
              {it.line > 0 && (
                <button type="button" onClick={() => onJump(it.line, it.column)} className="shrink-0 font-mono text-[12px] text-indigo-300 underline-offset-2 hover:underline" title="Show in input">
                  {it.line}:{it.column}
                </button>
              )}
              <span className="text-slate-300">{it.message}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
