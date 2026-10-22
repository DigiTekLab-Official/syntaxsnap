import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn } from '../ui/ws';

function parseEpoch(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    // 13+ digits = ms, 16 = µs, 19 = ns; otherwise seconds
    const digits = s.replace(/^-/, '').split('.')[0].length;
    const ms = digits >= 19 ? n / 1e6 : digits >= 16 ? n / 1e3 : digits >= 12 ? n : n * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function relative(d: Date, now: number) {
  const diff = (d.getTime() - now) / 1000;
  const abs = Math.abs(diff);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute'], [1, 'second']];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [sec, unit] of units) if (abs >= sec || unit === 'second') return rtf.format(Math.round(diff / sec), unit);
  return '';
}

export default function TimestampConverter() {
  const [now, setNow] = useState(0); // set on mount to avoid a hydration mismatch
  const [input, setInput] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setNow(Date.now());
    setInput(String(Math.floor(Date.now() / 1000)));
    rootRef.current?.setAttribute('data-hydrated', 'true');
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = useMemo(() => parseEpoch(input), [input]);
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'local';
  const rows: [string, string][] = date ? [
    ['Unix seconds', String(Math.floor(date.getTime() / 1000))],
    ['Unix milliseconds', String(date.getTime())],
    ['ISO 8601 (UTC)', date.toISOString()],
    ['UTC', date.toUTCString()],
    [`Local (${tz})`, date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })],
    ['RFC 2822', date.toUTCString().replace('GMT', '+0000')],
    ['Relative', relative(date, now)],
  ] : [];

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-800 bg-ws-panel px-4 py-3">
        <span className="text-[13px] text-slate-400">Current Unix time</span>
        <span className="font-mono text-lg tabular-nums text-white">{now ? Math.floor(now / 1000) : '…'}</span>
        <Btn onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>Use now</Btn>
        <span className="ml-auto"><CopyBtn text={String(Math.floor(now / 1000))} /></span>
      </div>
      <Panel title="Timestamp or date">
        <label htmlFor="ts-input" className="sr-only">Timestamp or date</label>
        <input id="ts-input" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false}
          placeholder="1767225600, 1767225600000 or 2026-01-01T00:00:00Z"
          className="w-full bg-transparent px-4 py-3.5 font-mono text-[15px] text-slate-100 outline-none placeholder:text-slate-600" />
      </Panel>
      <Panel title={date ? 'Converted' : 'Converted'}>
        {input.trim() && !date ? (
          <p role="alert" className="p-4 text-[14px] text-rose-300">Enter epoch seconds, milliseconds, or a date such as 2026-01-01 or 2026-01-01T09:30:00+05:30.</p>
        ) : (
          <table className="w-full text-left text-[13px]">
            <tbody className="divide-y divide-slate-800">
              {rows.map(([k, v]) => (
                <tr key={k} className="group">
                  <th className="w-52 px-4 py-2.5 font-medium text-slate-400">{k}</th>
                  <td className="break-all px-4 py-2.5 font-mono text-slate-100">{v}</td>
                  <td className="w-16 px-2 text-right"><button type="button" onClick={() => navigator.clipboard.writeText(v)} className="text-[12px] text-slate-500 hover:text-indigo-300">Copy</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
