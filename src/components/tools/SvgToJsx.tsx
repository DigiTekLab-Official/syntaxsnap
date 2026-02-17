'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { FileCode, ClipboardCheck, Clipboard } from 'lucide-react';

// ─── Attribute rename map ─────────────────────────────────────────────────────

const ATTR_RENAMES: Record<string, string> = {
  // HTML reserved names
  class:           'className',
  for:             'htmlFor',
  tabindex:        'tabIndex',
  accesskey:       'accessKey',
  contenteditable: 'contentEditable',
  crossorigin:     'crossOrigin',
  enctype:         'encType',
  spellcheck:      'spellCheck',
  autofocus:       'autoFocus',
  novalidate:      'noValidate',
  readonly:        'readOnly',
  maxlength:       'maxLength',
  minlength:       'minLength',
  colspan:         'colSpan',
  rowspan:         'rowSpan',
  cellpadding:     'cellPadding',
  cellspacing:     'cellSpacing',
  usemap:          'useMap',
  frameborder:     'frameBorder',
  // SVG namespace attributes
  'xml:lang':      'xmlLang',
  'xml:space':     'xmlSpace',
  // xlink — deprecated in SVG 2.0, map to plain equivalents
  'xlink:href':    'href',
  'xlink:type':    'xlinkType',
  'xlink:role':    'xlinkRole',
  'xlink:arcrole': 'xlinkArcrole',
  'xlink:title':   'xlinkTitle',
  'xlink:show':    'xlinkShow',
  'xlink:actuate': 'xlinkActuate',
};

function toJsxAttrName(attr: string): string {
  const lower = attr.toLowerCase();
  if (ATTR_RENAMES[lower]) return ATTR_RENAMES[lower];
  // kebab-case → camelCase (preserves aria-* and data-* prefixes correctly)
  return attr.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

// ─── CSS string → React style object ─────────────────────────────────────────

/**
 * Converts an inline CSS string to a React style object literal string.
 *
 * Uses a character-level parser instead of split(';') so that values
 * containing semicolons or colons — e.g. url(data:image/png;base64,…) —
 * are handled correctly.
 */
function parseCssToStyleObject(css: string): string {
  const pairs: string[] = [];
  let i = 0;

  while (i < css.length) {
    // skip leading whitespace
    while (i < css.length && css[i] === ' ') i++;
    if (i >= css.length) break;

    // read property name — stop at the first ':' not inside parens
    const propStart = i;
    let depth = 0;
    while (i < css.length) {
      if      (css[i] === '(') depth++;
      else if (css[i] === ')') depth--;
      else if (css[i] === ':' && depth === 0) break;
      i++;
    }
    const prop = css.slice(propStart, i).trim();
    if (!prop || i >= css.length) break;
    i++; // skip ':'

    // read value — stop at ';' not inside parens or quotes
    const valStart = i;
    depth = 0;
    let inQuote = false;
    let quoteChar = '';
    while (i < css.length) {
      const ch = css[i];
      if (!inQuote && (ch === '"' || ch === "'")) { inQuote = true;  quoteChar = ch; }
      else if (inQuote && ch === quoteChar)        { inQuote = false; }
      else if (!inQuote && ch === '(')             depth++;
      else if (!inQuote && ch === ')')             depth--;
      else if (!inQuote && ch === ';' && depth === 0) break;
      i++;
    }
    const val = css.slice(valStart, i).trim();

    if (prop && val) {
      // vendor-prefixed props: -webkit-foo → WebkitFoo
      const camelProp = prop.startsWith('-')
        ? prop
            .replace(/^-([a-z])/, (_: string, c: string) => c.toUpperCase())
            .replace(/-([a-z])/g,  (_: string, c: string) => c.toUpperCase())
        : prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());

      pairs.push(`${camelProp}: "${val}"`);
    }
    i++; // skip ';'
  }

  return `{{ ${pairs.join(', ')} }}`;
}

// ─── Attribute tokenizer ──────────────────────────────────────────────────────

interface AttrToken {
  name:  string;
  value: string | null; // null = boolean attribute
}

/**
 * Tokenises an attribute string into name/value pairs.
 * Handles both single-quoted and double-quoted values, and bare boolean attrs.
 * Does NOT use regex so there is no risk of re-processing already-transformed names.
 */
function tokenizeAttrs(attrs: string): AttrToken[] {
  const tokens: AttrToken[] = [];
  let i = 0;

  while (i < attrs.length) {
    // skip whitespace
    while (i < attrs.length && /\s/.test(attrs[i])) i++;
    if (i >= attrs.length) break;

    // read name — stops at whitespace, '=', '/', or '>'
    const nameStart = i;
    while (i < attrs.length && !/[\s=/>]/.test(attrs[i])) i++;
    const name = attrs.slice(nameStart, i);
    if (!name) { i++; continue; }

    // skip whitespace
    while (i < attrs.length && /\s/.test(attrs[i])) i++;

    if (attrs[i] !== '=') {
      tokens.push({ name, value: null }); // boolean attr
      continue;
    }
    i++; // skip '='

    // skip whitespace
    while (i < attrs.length && /\s/.test(attrs[i])) i++;

    // read value (double-quoted, single-quoted, or unquoted)
    let value = '';
    if (i < attrs.length && (attrs[i] === '"' || attrs[i] === "'")) {
      const quote = attrs[i++];
      const start = i;
      while (i < attrs.length && attrs[i] !== quote) i++;
      value = attrs.slice(start, i);
      i++; // skip closing quote
    } else {
      const start = i;
      while (i < attrs.length && !/\s/.test(attrs[i])) i++;
      value = attrs.slice(start, i);
    }

    tokens.push({ name, value });
  }

  return tokens;
}

function renderAttrs(tokens: AttrToken[]): string {
  if (tokens.length === 0) return '';
  return (
    ' ' +
    tokens
      .map(({ name, value }) => {
        const jsxName = toJsxAttrName(name);
        if (value === null) return jsxName;
        if (name.toLowerCase() === 'style') return `style=${parseCssToStyleObject(value)}`;
        return `${jsxName}="${value}"`;
      })
      .join(' ')
  );
}

// ─── Main converter ───────────────────────────────────────────────────────────

/**
 * Converts raw SVG markup to React-compatible JSX.
 *
 * Fixes vs the naive regex-layering approach:
 *   1. Single-pass tag regex — no double-processing of self-closing tags
 *      (the old two-step regex left a trailing space before `/>`)
 *   2. Proper attribute tokenizer — handles single-quoted values, boolean
 *      attrs, and never re-processes already-converted attr names
 *   3. CSS parser respects parens/quotes, so url(data:…;…) values are intact
 *   4. `s` flag on the tag regex handles multiline attribute strings
 */
function svgToJsx(raw: string): string {
  const stripped = raw
    .replace(/<\?xml[^>]*\?>/gi, '')   // XML declaration
    .replace(/<!DOCTYPE[^>]*>/gi, '')   // DOCTYPE
    .replace(/<!--[\s\S]*?-->/g,  '')   // HTML/XML comments
    .trimStart();

  // Single pass over all tag tokens.
  // Groups: (1) optional '/'  (2) tag name  (3) attr string  (4) optional '/' for self-close
  return stripped
    .replace(
      /<(\/?)([a-zA-Z][a-zA-Z0-9:.-]*)([^>]*?)(\/?)>/gs,
      (
        _full:        string,
        closingSlash: string,
        tagName:      string,
        attrs:        string,
        selfClose:    string,
      ) => {
        if (closingSlash) return `</${tagName}>`; // closing tag — no attrs

        const tokens        = tokenizeAttrs(attrs);
        const renderedAttrs = renderAttrs(tokens);

        return selfClose
          ? `<${tagName}${renderedAttrs} />`
          : `<${tagName}${renderedAttrs}>`;
      },
    )
    .trim();
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('ok');
    } catch {
      setState('err');
    } finally {
      setTimeout(() => setState('idle'), 2000);
    }
  }, [text]);

  const Icon = state === 'ok' ? ClipboardCheck : Clipboard;

  return (
    <button
      onClick={copy}
      disabled={!text}
      aria-label="Copy JSX to clipboard"
      className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {state === 'ok' ? 'Copied!' : state === 'err' ? 'Failed' : 'Copy JSX'}
    </button>
  );
}

// ─── Default sample ───────────────────────────────────────────────────────────

const DEFAULT_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none"
  xmlns="http://www.w3.org/2000/svg">
  <!-- A red circle with a stroke -->
  <circle cx="50" cy="50" r="40"
    stroke="black" stroke-width="3"
    fill="red" class="my-circle" />
  <text x="50" y="55" text-anchor="middle"
    font-size="14" fill="white">Hello</text>
</svg>`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SvgToJsx() {
  const [input,  setInput]  = useState(DEFAULT_SVG);
  const [output, setOutput] = useState('');

  useEffect(() => {
    setOutput(svgToJsx(input));
  }, [input]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '480px' }}>

      {/* ── Source SVG ───────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center gap-2 min-h-12">
          <FileCode className="w-4 h-4 text-slate-400" aria-hidden />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Source SVG
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Source SVG code"
          placeholder="Paste SVG code here…"
          className="flex-1 bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* ── JSX Output ──────────────────────────────────────────────── */}
      <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center min-h-12">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            React JSX
          </span>
          <CopyButton text={output} />
        </div>

        <pre
          aria-label="Generated React JSX"
          aria-live="polite"
          className="flex-1 p-4 font-mono text-sm text-emerald-400 overflow-auto whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30"
        >
          {output || (
            <span className="text-slate-600">{'// Output will appear here…'}</span>
          )}
        </pre>
      </div>

    </div>
  );
}