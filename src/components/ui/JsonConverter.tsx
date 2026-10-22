// src/components/ui/JsonConverter.tsx — two-pane converter shared by the
// CSV, YAML, XML and escape pages. Each page passes its operation, options and
// sample. Conversion runs in this tab (in a Web Worker for inputs over 1 MB).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented, useIncomingInput } from './ws';
import { CodeInput, selectInTextarea } from './CodeInput';
import { CodeView } from './CodeView';
import { OpenFileBtn, DropZone, UrlLoader, SendToMenu, type SendTarget } from './InputSource';
import { convertAsync, SupersededError, WORKER_THRESHOLD } from '../../utils/json/worker';
import { repairJson } from '../../utils/json/repair';
import { parseJson } from '../../utils/json/parse';
import { fmtBytes } from '../../utils/json/format';
import type { ConvertOp, ConvertOptions, ConvertResult } from '../../utils/json/types';
import { trackToolEvent, type ToolAction } from '../../utils/analytics';
import { useDebounce } from '../../hooks/useDebounce';

export type OptionDef =
  | { kind: 'segmented'; key: string; label: string; choices: { value: string; label: string }[] }
  | { kind: 'toggle'; key: string; label: string; title?: string }
  | { kind: 'text'; key: string; label: string; placeholder?: string; width?: string };

export interface ConverterMode { op: ConvertOp; label: string; inputLabel: string; outputLabel: string; inputLang: Lang; outputLang: Lang; filename: string; mime: string; sample?: string }

type Lang = 'json' | 'csv' | 'yaml' | 'xml' | 'text';

export interface JsonConverterProps {
  tool: string;
  /** One mode for a single-direction converter, two for a toggle (escape/unescape). */
  modes: ConverterMode[];
  sample: string;
  options?: OptionDef[];
  defaultOptions?: ConvertOptions;
  /** File types the Open file button accepts. */
  accept: string;
  /** Offer a Table / Text toggle on the output (JSON to CSV). */
  table?: boolean;
  /** Tools the output can be sent to. */
  sendTargets?: SendTarget[];
  /** Prepend a UTF-8 byte order mark to downloads so Excel reads accents correctly. */
  excelBomOption?: boolean;
  /** Placeholder for the input. */
  placeholder?: string;
}

export default function JsonConverter({ tool, modes, sample, options = [], defaultOptions = {}, accept, table, sendTargets = [], excelBomOption, placeholder }: JsonConverterProps) {
  const [modeIdx, setModeIdx] = useState(0);
  const mode = modes[modeIdx];
  const [input, setInput] = useState(sample);
  const [opts, setOpts] = useState<ConvertOptions>(defaultOptions);
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [outView, setOutView] = useState<'table' | 'text'>(table ? 'table' : 'text');
  const [showUrl, setShowUrl] = useState(false);
  const [notice, setNotice] = useState('');
  const [bom, setBom] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seq = useRef(0);
  const pasted = useRef(false);

  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);
  const track = useCallback((a: ToolAction, size?: number) => trackToolEvent(tool, a, size), [tool]);

  const big = input.length >= WORKER_THRESHOLD;
  const debounced = useDebounce(input, big ? 400 : 150);

  useEffect(() => {
    if (!debounced.trim()) { setResult(null); setBusy(false); return; }
    const id = ++seq.current;
    setBusy(true);
    convertAsync(mode.op, debounced, opts)
      .then((r) => {
        if (id !== seq.current) return;
        setResult(r);
        setBusy(false);
        if (pasted.current && !r.error) { pasted.current = false; track('convert', debounced.length); }
      })
      .catch((e) => {
        if (e instanceof SupersededError || id !== seq.current) return;
        setBusy(false);
        setResult({ output: '', error: { message: (e as Error).message } });
      });
  }, [debounced, mode.op, opts, track]);

  const error = result?.error;
  const repaired = useMemo(() => {
    if (!error || mode.inputLang !== 'json' || input.length > 2 * 1024 * 1024) return '';
    const fixed = repairJson(input);
    const p = parseJson(fixed);
    return p.error ? '' : JSON.stringify(p.value, null, 2);
  }, [error, input, mode.inputLang]);

  const loadText = (text: string, how: ToolAction) => { setInput(text); setNotice(''); pasted.current = true; track(how, text.length); };
  const set = (k: string, v: string | boolean) => { setOpts((o) => ({ ...o, [k]: v })); };
  const switchMode = (i: number) => {
    setModeIdx(i);
    // Hand the current output over as the new input, so escape → unescape round-trips.
    if (result?.output && !result.error) setInput(result.output);
    track('convert');
  };

  const output = result?.output ?? '';
  const download = bom && excelBomOption ? '﻿' + output : output;
  const footer = error ? 'Fix the error to see output' : result ? [result.info, output ? fmtBytes(output.length) : ''].filter(Boolean).join(' · ') : busy ? 'Working…' : ' ';

  return (
    <div ref={rootRef} className="space-y-3" data-tool={tool}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {modes.length > 1 && (
          <Segmented label="Direction" value={String(modeIdx)} onChange={(v) => switchMode(Number(v))} options={modes.map((m, i) => ({ value: String(i), label: m.label }))} />
        )}
        {options.map((o) => {
          if (o.kind === 'segmented') {
            return (
              <span key={o.key} className="inline-flex items-center gap-2 text-[13px] text-slate-400">
                <span aria-hidden="true">{o.label}</span>
                <Segmented label={o.label} value={String(opts[o.key] ?? o.choices[0].value)} onChange={(v) => set(o.key, v)} options={o.choices} />
              </span>
            );
          }
          if (o.kind === 'toggle') {
            return (
              <label key={o.key} className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400" title={o.title}>
                <input type="checkbox" checked={!!opts[o.key]} onChange={(e) => set(o.key, e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
                {o.label}
              </label>
            );
          }
          return (
            <label key={o.key} className="inline-flex items-center gap-2 text-[13px] text-slate-400">
              {o.label}
              <input
                type="text"
                value={String(opts[o.key] ?? '')}
                onChange={(e) => set(o.key, e.target.value)}
                placeholder={o.placeholder}
                spellCheck={false}
                className="h-7 rounded border border-slate-700 bg-slate-950 px-2 font-mono text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500"
                style={{ width: o.width ?? '7rem' }}
              />
            </label>
          );
        })}
        {excelBomOption && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400" title="Adds a UTF-8 byte order mark to the download so Excel shows accented characters correctly">
            <input type="checkbox" checked={bom} onChange={(e) => setBom(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
            Excel-friendly download
          </label>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <DropZone className="h-[min(70vh,620px)] min-h-[360px]" onText={(t) => loadText(t, 'file_open')} onError={setNotice}>
          <Panel
            className="h-full"
            title={mode.inputLabel}
            actions={<>
              <Btn onClick={() => { setInput(mode.sample ?? sample); setNotice(''); }}>Sample</Btn>
              <OpenFileBtn accept={accept} onText={(t) => loadText(t, 'file_open')} onError={setNotice} />
              <Btn onClick={() => setShowUrl((s) => !s)} pressed={showUrl} title="Load from a URL with your browser">URL</Btn>
              <Btn onClick={() => { setInput(''); inputRef.current?.focus(); }}>Clear</Btn>
            </>}
            footer={notice ? <span className="text-rose-300">{notice}</span> : input ? `${fmtBytes(input.length)}${big ? ' · large file, processed in the background' : ''}` : 'Paste, drop a file, or open one'}
          >
            <div className="absolute inset-0 flex flex-col">
              {showUrl && <UrlLoader onText={(t) => loadText(t, 'url_load')} onClose={() => setShowUrl(false)} />}
              <div className="relative min-h-0 flex-1">
                <CodeInput
                  id="conv-in"
                  label={mode.inputLabel}
                  value={input}
                  onChange={setInput}
                  onPaste={() => { pasted.current = true; }}
                  inputRef={inputRef}
                  errorLine={error?.line}
                  placeholder={placeholder}
                />
              </div>
            </div>
          </Panel>
        </DropZone>

        <Panel
          className="h-[min(70vh,620px)] min-h-[360px]"
          title={error ? <span className="text-rose-300">Cannot convert</span> : mode.outputLabel}
          actions={<>
            {table && <Segmented label="Output view" value={outView} onChange={setOutView} options={[{ value: 'table', label: 'Table' }, { value: 'text', label: 'CSV' }]} />}
            {modes.length > 1 && output && <Btn onClick={() => setInput(output)} title="Run the output through again, e.g. for double-escaped strings">Use as input</Btn>}
            {output && <SendToMenu text={output} targets={sendTargets} onSend={() => track('send_to')} />}
            <DownloadBtn text={download} filename={mode.filename} mime={mode.mime} onDone={() => track('download', output.length)} />
            <CopyBtn text={output} onDone={() => track('copy', output.length)} />
          </>}
          footer={footer}
        >
          {error ? (
            <div className="absolute inset-0 overflow-auto p-4" role="alert" data-error>
              <p className="text-[14px] font-medium text-rose-300">
                {error.line ? `Line ${error.line}${error.column ? `, column ${error.column}` : ''}: ` : ''}{error.message}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {error.line && <Btn onClick={() => selectInTextarea(inputRef.current, input, error.line, error.column)}>Show in input</Btn>}
                {repaired && <Btn primary onClick={() => { setInput(repaired); track('repair'); }}>Fix common errors</Btn>}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col">
              {result?.warnings && result.warnings.length > 0 && (
                <ul className="shrink-0 space-y-0.5 border-b border-slate-800 bg-amber-500/10 px-3 py-1.5 text-[12px] text-amber-200" data-warnings>
                  {result.warnings.map((w) => <li key={w}>{w}</li>)}
                </ul>
              )}
              <div className="relative min-h-0 flex-1">
                {table && outView === 'table' && result?.table
                  ? <TableView table={result.table} />
                  : <CodeView text={output} lang={mode.outputLang === 'json' ? 'json' : 'text'} label={mode.outputLabel} />}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TableView({ table }: { table: NonNullable<ConvertResult['table']> }) {
  return (
    <div className="absolute inset-0 overflow-auto" data-table-preview>
      <table className="min-w-full border-collapse font-mono text-[12.5px]">
        <thead className="sticky top-0 z-[1] bg-ws-raised">
          <tr>
            <th scope="col" className="border-b border-r border-slate-800 px-2 py-1.5 text-right font-normal text-slate-500">#</th>
            {table.headers.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap border-b border-r border-slate-800 px-2.5 py-1.5 text-left font-medium text-sky-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i} className="odd:bg-slate-900/40">
              <td className="border-r border-slate-800/70 px-2 py-1 text-right tabular-nums text-slate-600">{i + 1}</td>
              {r.map((c, j) => (
                <td key={j} className="max-w-[28ch] truncate whitespace-nowrap border-r border-slate-800/70 px-2.5 py-1 text-slate-200" title={c}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {table.total > table.rows.length && (
        <p className="px-3 py-2 text-[12px] text-slate-500">Showing {table.rows.length} of {table.total.toLocaleString()} rows. Copy or download for all of them.</p>
      )}
    </div>
  );
}
