// src/components/ui/JsonTree.tsx — collapsible, searchable tree view.
//
// Rows are virtualised (only the ones on screen are rendered) and children are
// built only when a node is expanded, so large documents stay responsive.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { visibleRows, idsToDepth, searchTree, type TreeRow, type JsonType } from '../../utils/json/tree';
import { Btn } from './ws';

const ROW = 24;

const TYPE_STYLE: Record<JsonType, { badge: string; value: string }> = {
  object: { badge: 'obj', value: 'text-slate-500' },
  array: { badge: 'arr', value: 'text-slate-500' },
  string: { badge: 'str', value: 'text-emerald-300' },
  number: { badge: 'num', value: 'text-amber-300' },
  boolean: { badge: 'bool', value: 'text-fuchsia-300' },
  null: { badge: 'null', value: 'text-fuchsia-300' },
};

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q);
  if (i === -1) return <>{text}</>;
  return <>{text.slice(0, i)}<mark className="rounded-sm bg-amber-400/30 text-inherit">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export interface JsonTreeProps {
  value: unknown;
  /** Levels expanded on first render (root is level 0). */
  initialDepth?: number;
  onCopyPath?: (path: string) => void;
}

export function JsonTree({ value, initialDepth = 1, onCopyPath }: JsonTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => idsToDepth(value, initialDepth).ids);
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(500);
  const box = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // A new document keeps the open/closed state of paths that still exist;
  // only the very first document gets the default depth.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setExpanded((prev) => (prev.size ? prev : idsToDepth(value, initialDepth).ids));
  }, [value, initialDepth]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const search = useMemo(() => searchTree(value, debouncedQ), [value, debouncedQ]);
  const matchSet = useMemo(() => new Set(search.matches), [search]);

  useEffect(() => {
    setMatchIdx(0);
    if (search.expand.size) setExpanded((prev) => new Set([...prev, ...search.expand]));
  }, [search]);

  const rows = useMemo(() => visibleRows(value, expanded), [value, expanded]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scrollToId = useCallback((id: string) => {
    const idx = rows.findIndex((r) => r.id === id);
    const el = box.current;
    if (idx === -1 || !el) return;
    const top = idx * ROW;
    if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - ROW) el.scrollTop = Math.max(0, top - el.clientHeight / 3);
  }, [rows]);

  useEffect(() => {
    if (search.matches.length) scrollToId(search.matches[matchIdx] ?? search.matches[0]);
  }, [matchIdx, search, scrollToId]);

  const toggle = (row: TreeRow) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id); else next.add(row.id);
      return next;
    });
  };

  const expandAll = () => {
    const { ids, truncated } = idsToDepth(value, Infinity);
    setExpanded(ids);
    setNote(truncated ? `Expanded the first ${ids.size.toLocaleString()} containers. Search to jump to deeper nodes.` : '');
  };
  const collapseAll = () => { setExpanded(new Set(['$'])); setNote(''); if (box.current) box.current.scrollTop = 0; };

  const copyPath = async (row: TreeRow) => {
    try { await navigator.clipboard.writeText(row.id); } catch { /* clipboard blocked */ }
    setToast(`Copied ${row.id}`);
    onCopyPath?.(row.id);
    setTimeout(() => setToast(''), 1600);
  };

  const start = Math.max(0, Math.floor(scrollTop / ROW) - 5);
  const end = Math.min(rows.length, start + Math.ceil(height / ROW) + 10);
  const slice = rows.slice(start, end);
  const step = (d: number) => setMatchIdx((i) => (search.matches.length ? (i + d + search.matches.length) % search.matches.length : 0));

  return (
    <div className="absolute inset-0 flex flex-col" data-tree>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-800 px-2 py-1.5">
        <label htmlFor="tree-search" className="sr-only">Search keys and values</label>
        <input
          id="tree-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); } }}
          placeholder="Search keys and values"
          className="h-7 w-44 min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 text-[12.5px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
        {debouncedQ && (
          <span className="text-[12px] tabular-nums text-slate-400" aria-live="polite" data-match-count>
            {search.matches.length ? `${matchIdx + 1} of ${search.matches.length}${search.truncated ? '+' : ''}` : 'No matches'}
          </span>
        )}
        {search.matches.length > 1 && <><Btn onClick={() => step(-1)} title="Previous match">↑</Btn><Btn onClick={() => step(1)} title="Next match">↓</Btn></>}
        <span className="ml-auto flex gap-1">
          <Btn onClick={expandAll}>Expand all</Btn>
          <Btn onClick={collapseAll}>Collapse all</Btn>
        </span>
      </div>
      {note && <p className="shrink-0 border-b border-slate-800 px-3 py-1 text-[12px] text-amber-200">{note}</p>}
      <div
        ref={box}
        className="relative min-h-0 flex-1 overflow-auto font-mono text-[13px]"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        data-tree-rows={rows.length}
      >
        <div style={{ height: rows.length * ROW, position: 'relative', minWidth: '100%' }}>
          {slice.map((row, i) => {
            const isOpen = expanded.has(row.id);
            const container = row.type === 'object' || row.type === 'array';
            const hit = matchSet.has(row.id);
            const current = hit && search.matches[matchIdx] === row.id;
            const style = TYPE_STYLE[row.type];
            const keyLabel = row.key === null ? '$' : typeof row.key === 'number' ? String(row.key) : row.key;
            return (
              <div
                key={row.id}
                data-row={row.id}
                data-match={hit || undefined}
                className={`absolute left-0 right-0 flex items-center whitespace-nowrap pr-3 ${current ? 'bg-amber-400/15' : hit ? 'bg-amber-400/5' : 'hover:bg-slate-800/50'}`}
                style={{ top: (start + i) * ROW, height: ROW, paddingLeft: 6 + row.depth * 16 }}
              >
                {container && row.childCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${keyLabel}`}
                    className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-700 hover:text-slate-200"
                  >
                    <svg className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ) : <span className="mr-1 w-5 shrink-0" />}
                <button
                  type="button"
                  onClick={() => copyPath(row)}
                  title={`Copy path ${row.id}`}
                  className="flex min-w-0 items-center gap-1.5 rounded px-1 text-left hover:bg-slate-700/40"
                >
                  <span className={typeof row.key === 'number' ? 'text-slate-500' : 'text-sky-300'}>
                    <Highlight text={keyLabel} q={debouncedQ} /><span className="text-slate-600">:</span>
                  </span>
                  {container ? (
                    <span className="text-slate-500">{row.type === 'array' ? `[${row.childCount}]` : `{${row.childCount}}`}</span>
                  ) : (
                    <span className={`${style.value} truncate`}><Highlight text={row.preview} q={debouncedQ} /></span>
                  )}
                  <span className="rounded bg-slate-800 px-1 text-[10px] leading-4 text-slate-400">{style.badge}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-between border-t border-slate-800 px-3 py-1 text-[11.5px] text-slate-500">
        <span>Click a node to copy its JSONPath</span>
        <span aria-live="polite" className="truncate pl-2 font-mono text-indigo-300" data-copied-path>{toast}</span>
      </div>
    </div>
  );
}
