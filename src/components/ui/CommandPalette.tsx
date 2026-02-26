import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TOOLS } from '../../config/tools';

function normalize(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for Cmd+K / Ctrl+K and custom open event
  useEffect(() => {
    if (!mounted) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };

    const onOpen = () => setOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-command-palette', onOpen);
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-command-palette', onOpen);
    };
  }, [mounted]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setHighlighted(0);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => { document.body.style.overflow = 'unset'; };
  }, [open]);

  // Filter tools
  const results = query
    ? TOOLS.filter((tool) => {
        const q = normalize(query);
        return (
          normalize(tool.title).includes(q) ||
          normalize(tool.desc).includes(q) ||
          normalize(tool.category).includes(q)
        );
      })
    : TOOLS;

  // Keyboard navigation
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter' && results[highlighted]) {
        window.location.href = results[highlighted].href;
        setOpen(false);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [results, highlighted]
  );

  if (!mounted || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] bg-slate-950/80 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={() => setOpen(false)} // Click outside to close
    >
      <div
        className="w-full max-w-xl mx-4 rounded-2xl shadow-2xl bg-slate-900 border border-slate-800 flex flex-col max-h-[60vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Search Input Area */}
        <div className="relative border-b border-slate-800 shrink-0">
          <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            className="w-full pl-14 pr-14 py-4 text-lg font-medium bg-slate-900 text-white outline-none placeholder:text-slate-500"
            placeholder="Search for tools..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
          {/* Mobile-Friendly Close Button */}
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 bg-slate-800/50 hover:bg-slate-700 rounded-md transition-colors"
            aria-label="Close search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Results List */}
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {results.length === 0 && (
            <li className="px-6 py-8 text-slate-500 text-center text-sm">No tools found matching "{query}".</li>
          )}
          {results.map((tool, i) => (
            <li
              key={tool.id}
              className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
                i === highlighted
                  ? 'bg-blue-600/10 text-blue-400'
                  : 'hover:bg-slate-800/50 text-slate-300'
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => {
                window.location.href = tool.href;
                setOpen(false);
              }}
              aria-selected={i === highlighted}
            >
              <div className="flex flex-col gap-1 overflow-hidden">
                <span className="font-semibold text-sm truncate text-white">{tool.title}</span>
                <span className="text-xs text-slate-500 truncate">{tool.desc}</span>
              </div>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-slate-800 px-2 py-1 rounded text-slate-400 ml-4 hidden sm:inline-block">
                {tool.category}
              </span>
            </li>
          ))}
        </ul>

        {/* Keyboard Hints (Hidden on Mobile) */}
        <div className="shrink-0 hidden sm:flex items-center px-6 py-3 border-t border-slate-800 text-xs text-slate-500 bg-slate-900/50">
          <span className="flex items-center gap-1.5 mr-4">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 font-sans shadow-sm">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 font-sans shadow-sm">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5 mr-4">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 font-sans shadow-sm">↵</kbd>
            to select
          </span>
          <span className="flex items-center gap-1.5 ml-auto">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 border border-slate-700 font-sans shadow-sm text-[10px]">ESC</kbd>
            to close
          </span>
        </div>
      </div>
    </div>
  );
}