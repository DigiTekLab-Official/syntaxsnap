import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { FileCode, Settings2, Trash2 } from 'lucide-react';
import CopyButton from '../ui/CopyButton';

// ─── Attribute rename map ─────────────────────────────────────────────────────
const ATTR_RENAMES: Record<string, string> = {
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
  'xml:lang':      'xmlLang',
  'xml:space':     'xmlSpace',
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
  return attr.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

// ─── CSS string → React style object ─────────────────────────────────────────
function parseCssToStyleObject(css: string): string {
  const pairs: string[] = [];
  let i = 0;

  while (i < css.length) {
    while (i < css.length && css[i] === ' ') i++;
    if (i >= css.length) break;

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
    i++; 

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
      const camelProp = prop.startsWith('-')
        ? prop
            .replace(/^-([a-z])/, (_: string, c: string) => c.toUpperCase())
            .replace(/-([a-z])/g,  (_: string, c: string) => c.toUpperCase())
        : prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());

      pairs.push(`${camelProp}: "${val}"`);
    }
    i++; 
  }

  return `{ ${pairs.join(', ')} }`;
}

// ─── Attribute tokenizer ──────────────────────────────────────────────────────
interface AttrToken {
  name:  string;
  value: string | null; 
}

function tokenizeAttrs(attrs: string): AttrToken[] {
  const tokens: AttrToken[] = [];
  let i = 0;

  while (i < attrs.length) {
    while (i < attrs.length && /\s/.test(attrs[i])) i++;
    if (i >= attrs.length) break;

    const nameStart = i;
    while (i < attrs.length && !/[\s=/>]/.test(attrs[i])) i++;
    const name = attrs.slice(nameStart, i);
    if (!name) { i++; continue; }

    while (i < attrs.length && /\s/.test(attrs[i])) i++;

    if (attrs[i] !== '=') {
      tokens.push({ name, value: null });
      continue;
    }
    i++; 

    while (i < attrs.length && /\s/.test(attrs[i])) i++;

    let value: string;
    if (i < attrs.length && (attrs[i] === '"' || attrs[i] === "'")) {
      const quote = attrs[i++];
      const start = i;
      while (i < attrs.length && attrs[i] !== quote) i++;
      value = attrs.slice(start, i);
      i++; 
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
        if (name.toLowerCase() === 'style') return `style={${parseCssToStyleObject(value)}}`;
        return `${jsxName}="${value}"`;
      })
      .join(' ')
  );
}

// ─── Security Sanitizer ───────────────────────────────────────────────────────
function sanitizeSvg(svg: string): string {
  let sanitized = svg;
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/\s*script\s*>)<[^<]*)*<\/\s*script\s*>/gi, '');
  sanitized = sanitized.replace(/<script\b[^>]*\/?>/gi, ''); 
  sanitized = sanitized.replace(/\son\w+\s*=\s*(?:["'][^"']*["']|[^\s>]*)/gi, '');
  sanitized = sanitized.replace(/\s(?:href|src)\s*=\s*["']javascript:[^"']*["']/gi, '');
  
  if (/<script/i.test(sanitized) || /\son\w+\s*=/i.test(sanitized)) {
    sanitized = sanitizeSvg(sanitized);
  }
  return sanitized;
}

// ─── Main converter ───────────────────────────────────────────────────────────
function svgToJsx(raw: string, wrapComponent: boolean, addProps: boolean): string {
  const safeRaw = sanitizeSvg(raw);

  let stripped = safeRaw
    .replace(/<\?xml[^>]*\?>/gi, '')   
    .replace(/<!DOCTYPE[^>]*>/gi, '')   
    .replace(new RegExp('<!--[\\s\\S]*?-->', 'g'), '')
    .trimStart();

  let jsx = stripped
    .replace(
      /<(\/?)([a-zA-Z][a-zA-Z0-9:.-]*)([^>]*?)(\/?)>/gs,
      (
        _full:        string,
        closingSlash: string,
        tagName:      string,
        attrs:        string,
        selfClose:    string,
      ) => {
        if (closingSlash) return `</${tagName}>`; 

        const tokens        = tokenizeAttrs(attrs);
        const renderedAttrs = renderAttrs(tokens);

        return selfClose
          ? `<${tagName}${renderedAttrs} />`
          : `<${tagName}${renderedAttrs}>`;
      },
    )
    .trim();

  // Inject {...props} into the root svg tag if requested
  if (addProps && jsx.toLowerCase().startsWith('<svg')) {
    jsx = jsx.replace(/<svg/i, '<svg {...props}');
  }

  // Wrap in a functional component if requested
  if (wrapComponent) {
    const indentedJsx = jsx.split('\n').join('\n    ');
    return `export default function SvgIcon(${addProps ? 'props' : ''}) {\n  return (\n    ${indentedJsx}\n  );\n}`;
  }

  return jsx;
}

// ─── Default sample ───────────────────────────────────────────────────────────
const DEFAULT_SVG = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" class="my-circle" />
  <text x="50" y="55" text-anchor="middle" font-size="14" fill="white">Hello</text>
</svg>`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function SvgToJsx() {
  const [input,  setInput]  = useState(DEFAULT_SVG);
  const [output, setOutput] = useState('');
  
  // New Developer Options
  const [wrapComponent, setWrapComponent] = useState(false);
  const [addProps, setAddProps] = useState(false);

  const debouncedInput = useDebounce(input, 300);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setOutput(svgToJsx(debouncedInput, wrapComponent, addProps));
  }, [debouncedInput, wrapComponent, addProps]);

  // Fixes the "Dead Click" issue tracked in Clarity
  const handleSelectAll = useCallback(() => {
    if (outputRef.current) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(outputRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* ── Settings Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-300 font-medium text-sm">
          <Settings2 className="w-4 h-4 text-indigo-400" />
          <span>Format Options:</span>
        </div>
        
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={wrapComponent} 
            onChange={(e) => setWrapComponent(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          Wrap in Functional Component
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
          <input 
            type="checkbox" 
            checked={addProps} 
            onChange={(e) => setAddProps(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
          />
          Add {'{...props}'} to root SVG
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ minHeight: '480px' }}>
        {/* ── Source SVG ───────────────────────────────────────────────── */}
        <div className="flex flex-col bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between min-h-12">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-400" aria-hidden />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Source SVG
              </span>
            </div>
            <button 
              onClick={() => setInput('')}
              className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-red-400 transition-colors"
              title="Clear Input"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Source SVG code"
            placeholder="Paste raw SVG code here…"
            className="flex-1 bg-transparent p-4 font-mono text-sm text-slate-300 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* ── JSX Output ──────────────────────────────────────────────── */}
        <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative group">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center min-h-12">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              React JSX
            </span>
            <CopyButton text={output} />
          </div>

          <pre
            ref={outputRef}
            tabIndex={0}
            onClick={handleSelectAll}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); } }}
            title="Click to select all code"
            aria-label="Generated React JSX"
            aria-live="polite"
            className="flex-1 p-4 font-mono text-sm text-emerald-400 overflow-auto whitespace-pre-wrap leading-relaxed selection:bg-indigo-500/30 cursor-text"
          >
            {output || (
              <span className="text-slate-600">{'// Paste SVG code to see output here…'}</span>
            )}
          </pre>
          
          {/* Subtle hint for users that they can click to select */}
          <div className="absolute bottom-4 right-4 text-xs font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Click code to select all
          </div>
        </div>
      </div>
    </div>
  );
}