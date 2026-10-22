// src/components/ui/CodeInput.tsx — textarea editor with a line-number gutter.
//
// The gutter only renders the line numbers in view, so a 10 MB file with
// hundreds of thousands of lines costs the same as a short one. Lines do not
// wrap, which keeps every textarea row aligned with its number.
import React, { useEffect, useMemo, useRef, useState } from 'react';

const LINE = 20; // px, must match leading-[20px]
const PAD = 12; // px, must match py-3

export function countLines(s: string) {
  let n = 1;
  for (let i = s.indexOf('\n'); i !== -1; i = s.indexOf('\n', i + 1)) n++;
  return n;
}

export interface CodeInputProps {
  id: string;
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  /** 1-based line to highlight as the error line. */
  errorLine?: number;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  readOnly?: boolean;
  onPaste?: () => void;
}

export function CodeInput({ id, label, value, onChange, placeholder, errorLine, inputRef, readOnly, onPaste }: CodeInputProps) {
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ref = inputRef ?? ownRef;
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);
  const lines = useMemo(() => countLines(value), [value]);
  const digits = String(lines).length;
  const gutter = Math.max(2, digits) * 8 + 20;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  const frame = useRef(0);
  const onScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const t = e.currentTarget.scrollTop;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrollTop(t));
  };

  const first = Math.max(0, Math.floor((scrollTop - PAD) / LINE));
  const count = Math.ceil(height / LINE) + 2;
  const last = Math.min(lines, first + count);
  const nums: number[] = [];
  for (let i = first; i < last; i++) nums.push(i + 1);
  const hasError = !!errorLine && errorLine >= 1 && errorLine <= lines;

  return (
    <div className="absolute inset-0 flex">
      <div
        aria-hidden="true"
        className="relative shrink-0 select-none overflow-hidden border-r border-slate-800/80 bg-ws-rail/60 font-mono text-[12px] leading-[20px] text-slate-600"
        style={{ width: gutter }}
      >
        <div style={{ transform: `translateY(${PAD + first * LINE - scrollTop}px)` }}>
          {nums.map((n) => (
            <div key={n} className={`pr-2.5 text-right tabular-nums ${hasError && n === errorLine ? 'bg-rose-500/20 font-medium text-rose-300' : ''}`}>{n}</div>
          ))}
        </div>
      </div>
      <div className="relative min-w-0 flex-1">
        {hasError && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bg-rose-500/10"
            style={{ top: PAD + (errorLine! - 1) * LINE - scrollTop, height: LINE }}
            data-error-line={errorLine}
          />
        )}
        <label htmlFor={id} className="sr-only">{label}</label>
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onScroll={onScroll}
          onPaste={onPaste}
          readOnly={readOnly}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          placeholder={placeholder}
          aria-invalid={hasError || undefined}
          className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 font-mono text-[13px] leading-[20px] text-slate-200 outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

/** Selects a 1-based line/column in a textarea and scrolls it into view. */
export function selectInTextarea(el: HTMLTextAreaElement | null, text: string, line?: number, column?: number) {
  if (!el || !line) return;
  let pos = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf('\n', pos);
    if (nl === -1) break;
    pos = nl + 1;
  }
  pos = Math.min(text.length, pos + Math.max(0, (column ?? 1) - 1));
  el.focus();
  el.setSelectionRange(pos, Math.min(text.length, pos + 1));
  el.scrollTop = Math.max(0, PAD + (line - 1) * LINE - el.clientHeight / 2);
}
