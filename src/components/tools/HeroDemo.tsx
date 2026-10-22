// Homepage live demo: paste JSON, get Zod or TypeScript. Real code, not a mockup.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { jsonToTs, jsonToZodLite } from '../../utils/jsonToTs';
import { normalizeSpaces } from '../../utils/json/parse';
import { Segmented, CopyBtn } from '../ui/ws';

const SAMPLE = `{
  "id": 1042,
  "email": "dev@example.com",
  "plan": "pro",
  "active": true,
  "tags": ["beta", "api"],
  "limits": { "requests": 50000, "seats": 5 }
}`;

type Out = 'zod' | 'ts';

export default function HeroDemo() {
  const [input, setInput] = useState(SAMPLE);
  const [out, setOut] = useState<Out>('zod');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.setAttribute('data-hydrated', 'true'); }, []);

  const result = useMemo(() => {
    try {
      const v = JSON.parse(normalizeSpaces(input));
      return out === 'zod'
        ? { code: `import { z } from "zod";\n\nexport const Account = ${jsonToZodLite(v)};\n\nexport type Account = z.infer<typeof Account>;`, ok: true }
        : { code: jsonToTs(v, { rootName: 'Account' }), ok: true };
    } catch {
      return { code: '', ok: false };
    }
  }, [input, out]);

  return (
    <div ref={ref} className="overflow-hidden rounded-xl border border-slate-800 bg-ws-panel shadow-[0_24px_80px_-24px_rgb(0_0_0/0.6)]">
      <div className="flex h-10 items-center gap-3 border-b border-slate-800 bg-ws-rail px-3">
        <span className="font-mono text-[12px] text-slate-500">account.json</span>
        <span className="ml-auto"><Segmented label="Output" value={out} onChange={setOut} options={[{ value: 'zod', label: 'Zod' }, { value: 'ts', label: 'TypeScript' }]} /></span>
      </div>
      <div className="grid md:grid-cols-2">
        <label htmlFor="hero-in" className="sr-only">Edit the sample JSON</label>
        <textarea id="hero-in" wrap="off" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false}
          className="h-72 resize-none border-b border-slate-800 bg-transparent p-4 font-mono text-[12.5px] leading-relaxed text-slate-300 outline-none md:border-b-0 md:border-r" />
        <div className="relative h-72">
          {result.ok ? (
            <pre className="absolute inset-0 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-sky-200">{result.code}</pre>
          ) : (
            <p className="p-4 text-[13px] text-rose-300">That is not valid JSON yet. Keep typing, or open the JSON Formatter to find the error.</p>
          )}
        </div>
      </div>
      <div className="flex h-10 items-center justify-between border-t border-slate-800 px-3">
        <span className="font-mono text-[11.5px] text-ws-local">Converted in your browser</span>
        <CopyBtn text={result.code} />
      </div>
    </div>
  );
}
