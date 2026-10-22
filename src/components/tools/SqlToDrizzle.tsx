import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Panel, Btn, CopyBtn, DownloadBtn, Segmented, editorCls, useIncomingInput } from '../ui/ws';
import { sqlToDrizzle, detectDialect, type Dialect } from '../../utils/sqlToDrizzle';
import { useDebounce } from '../../hooks/useDebounce';

const SAMPLE = `CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  meta JSONB,
  published_at TIMESTAMP
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (post_id, tag)
);`;

const LABEL: Record<Dialect, string> = { pg: 'PostgreSQL', mysql: 'MySQL', sqlite: 'SQLite' };
type Choice = 'auto' | Dialect;

export default function SqlToDrizzle() {
  const [input, setInput] = useState(SAMPLE);
  const [choice, setChoice] = useState<Choice>('auto');
  const [relations, setRelations] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  useIncomingInput(setInput);
  useEffect(() => { rootRef.current?.setAttribute('data-hydrated', 'true'); }, []);

  const debounced = useDebounce(input, 200);
  const detected = useMemo(() => detectDialect(debounced), [debounced]);
  const dialect = choice === 'auto' ? detected : choice;
  const result = useMemo(() => (debounced.trim() ? sqlToDrizzle(debounced, dialect, { relations }) : null), [debounced, dialect, relations]);

  return (
    <div ref={rootRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Database"
          value={choice}
          onChange={setChoice}
          options={[{ value: 'auto', label: `Auto (${LABEL[detected]})` }, { value: 'pg', label: 'PostgreSQL' }, { value: 'mysql', label: 'MySQL' }, { value: 'sqlite', label: 'SQLite' }]}
        />
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-400">
          <input type="checkbox" checked={relations} onChange={(e) => setRelations(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
          Generate relations
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="h-[min(72vh,640px)] min-h-[380px]" title="SQL" actions={<><Btn onClick={() => setInput(SAMPLE)}>Sample</Btn><Btn onClick={() => setInput('')}>Clear</Btn></>}>
          <label htmlFor="sql-in" className="sr-only">SQL CREATE TABLE statements</label>
          <textarea id="sql-in" wrap="off" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} placeholder="Paste CREATE TABLE statements" className={editorCls} />
        </Panel>
        <Panel
          className="h-[min(72vh,640px)] min-h-[380px]"
          title={`Drizzle schema (${LABEL[dialect]})`}
          actions={<><DownloadBtn text={result?.code ?? ''} filename="schema.ts" /><CopyBtn text={result?.code ?? ''} /></>}
          footer={result ? (result.warnings.length ? `${result.tables} tables · ${result.warnings.length} note${result.warnings.length > 1 ? 's' : ''} below`: `${result.tables} tables`) : 'Paste SQL to begin'}
        >
          {result && !result.code ? (
            <p role="alert" className="p-4 text-[14px] text-rose-300">No CREATE TABLE statements found. Paste one or more statements like CREATE TABLE users (...);</p>
          ) : (
            <pre data-output-pane className="absolute inset-0 overflow-auto whitespace-pre p-4 font-mono text-[13px] leading-relaxed text-sky-200">{result?.code ?? ''}</pre>
          )}
        </Panel>
      </div>

      {result && result.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <h2 className="text-[13px] font-medium text-amber-300">Check these before you use the schema</h2>
          <ul className="mt-1.5 space-y-1 font-mono text-[12.5px] text-amber-200/80">
            {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
