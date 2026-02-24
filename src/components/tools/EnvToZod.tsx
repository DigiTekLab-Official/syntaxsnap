import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { Monaco } from '@monaco-editor/react';
import { CopyButton } from '../ui/CopyButton';
import { useDebounce } from '../../hooks/useDebounce';
import { generateZodEnvSchema, MAX_INPUT_CHARS, type EnvConversionResult } from '../../utils/envToZod';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

/** Custom Monaco theme that matches the Slate-950 dark UI */
const SYNTAXSNAP_DARK = 'syntaxsnap-dark';

/** Lazy-loaded Monaco Editor — avoids SSR issues in Astro */
const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((mod) => ({ default: mod.Editor })),
);

function handleEditorWillMount(monaco: Monaco) {
  monaco.editor.defineTheme(SYNTAXSNAP_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0f172a',
      'editorCursor.foreground': '#00000000',
    },
  });
}

const DEFAULT_INPUT = `# Database
DATABASE_URL=postgres://user:password@localhost:5432/mydb?ssl=true

# Server
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# API
NEXT_PUBLIC_API_URL=https://api.syntaxsnap.com
API_TIMEOUT=30000
RATE_LIMIT=0.75

# Auth
JWT_SECRET=super-secret-token-here
IS_PROD=false

# Notifications
ADMIN_EMAIL=founder@syntaxsnap.com
SMTP_PASSWORD=s3cur3!pass`;

// ─── COMPONENT ──────────────────────────────────────────────────────────────

export default function EnvToZod() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mark component as hydrated for E2E selectors
  useEffect(() => {
    rootRef.current?.setAttribute('data-hydrated', 'true');
  }, []);

  // Chrome Extension / URL param integration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get('input');
    if (incoming) {
      setInput(incoming);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Run conversion on debounced input
  const result: EnvConversionResult = useMemo(() => {
    if (!debouncedInput.trim()) {
      return { code: '', count: 0, warnings: [] };
    }
    return generateZodEnvSchema(debouncedInput);
  }, [debouncedInput]);

  const handleClear = useCallback(() => {
    setInput('');
    textareaRef.current?.focus();
  }, []);

  const handleLoadExample = useCallback(() => {
    setInput(DEFAULT_INPUT);
  }, []);

  const isNearLimit = input.length > MAX_INPUT_CHARS * 0.8;
  const utilization = ((input.length / MAX_INPUT_CHARS) * 100).toFixed(0);

  return (
    <div ref={rootRef} className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex gap-2">
          <button
            onClick={handleLoadExample}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Load example .env file"
          >
            Load Example
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Clear input"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          {result.count > 0 && (
            <span className="text-xs text-slate-500 font-mono">
              {result.count} variable{result.count !== 1 ? 's' : ''} parsed
            </span>
          )}
          {isNearLimit && (
            <div className="flex items-center gap-2 text-xs text-amber-400" role="status">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{utilization}% capacity used</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Warnings ────────────────────────────────────────────────────── */}
      {result.warnings.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg px-4 py-3 text-amber-300 text-sm" role="status">
          {result.warnings[0]}
        </div>
      )}

      {/* ── Main Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-150">
        {/* ── Input Panel ─────────────────────────────────────────────── */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-semibold text-slate-300">.env Input</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {(input.length / 1_000).toFixed(1)}KB
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 w-full bg-transparent text-slate-300 p-4 resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:ring-inset leading-relaxed"
            placeholder="DATABASE_URL=postgres://..."
            spellCheck={false}
            maxLength={MAX_INPUT_CHARS + 10_000}
            aria-label=".env file input"
          />
        </div>

        {/* ── Output Panel ────────────────────────────────────────────── */}
        <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm font-semibold text-slate-300">Zod Schema Output</span>
            </div>
            <CopyButton
              text={result.code}
              label="Copy"
              copiedLabel="Copied!"
              variant="primary"
              size="sm"
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors text-xs"
              aria-label="Copy generated Zod schema to clipboard"
            />
          </div>
          <div className="flex-1 overflow-hidden bg-[#0f172a]" data-output-pane>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-500 text-sm font-mono">
                Loading editor…
              </div>
            }>
              <MonacoEditor
                language="typescript"
                theme={SYNTAXSNAP_DARK}
                value={result.code}
                beforeMount={handleEditorWillMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  wordWrap: 'on',
                  domReadOnly: true,
                  renderLineHighlight: 'none',
                  overviewRulerLanes: 0,
                  hideCursorInOverviewRuler: true,
                  cursorWidth: 0,
                  cursorBlinking: 'hidden',
                  scrollbar: { verticalScrollbarSize: 8 },
                }}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}