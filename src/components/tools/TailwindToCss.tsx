import React, { useState, useEffect, useMemo } from 'react';

// ─── PARSER CONFIGURATION ────────────────────────────────────────────────
const BREAKPOINTS: Record<string, string> = {
  sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
};

const PSEUDO_MAP: Record<string, string> = {
  hover: ':hover', focus: ':focus', active: ':active',
  'focus-within': ':focus-within', 'focus-visible': ':focus-visible',
  first: ':first-child', last: ':last-child', disabled: ':disabled',
};

const SPACING_MAP: Record<string, string[]> = {
  p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'], pb: ['padding-bottom'], pl: ['padding-left'], pr: ['padding-right'],
  m: ['margin'], mx: ['margin-left', 'margin-right'], my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'], mb: ['margin-bottom'], ml: ['margin-left'], mr: ['margin-right'],
  gap: ['gap'], 'gap-x': ['column-gap'], 'gap-y': ['row-gap']
};

const STANDALONE_COLORS: Record<string, string> = {
  'text-white': 'color: #ffffff;', 'text-black': 'color: #000000;', 'text-transparent': 'color: transparent;',
  'bg-white': 'background-color: #ffffff;', 'bg-black': 'background-color: #000000;', 'bg-transparent': 'background-color: transparent;',
  'border-white': 'border-color: #ffffff;', 'border-black': 'border-color: #000000;', 'border-transparent': 'border-color: transparent;',
};

const STATIC_UTILITIES: Record<string, string> = {
  // Layout & Position
  relative: 'position: relative;', absolute: 'position: absolute;', fixed: 'position: fixed;',
  sticky: 'position: sticky;', block: 'display: block;', inline: 'display: inline;',
  flex: 'display: flex;', 'inline-flex': 'display: inline-flex;', grid: 'display: grid;', hidden: 'display: none;',
  'flex-col': 'flex-direction: column;', 'flex-row': 'flex-direction: row;',
  'items-center': 'align-items: center;', 'items-start': 'align-items: flex-start;',
  'justify-center': 'justify-content: center;', 'justify-between': 'justify-content: space-between;',
  // Sizing
  'w-full': 'width: 100%;', 'w-screen': 'width: 100vw;', 'h-full': 'height: 100%;', 'h-screen': 'height: 100vh;', 'min-h-screen': 'min-height: 100vh;',
  // Typography
  'text-xs': 'font-size: 0.75rem; line-height: 1rem;', 'text-sm': 'font-size: 0.875rem; line-height: 1.25rem;',
  'text-base': 'font-size: 1rem; line-height: 1.5rem;', 'text-lg': 'font-size: 1.125rem; line-height: 1.75rem;',
  'text-xl': 'font-size: 1.25rem; line-height: 1.75rem;', 'text-2xl': 'font-size: 1.5rem; line-height: 2rem;',
  'font-bold': 'font-weight: 700;', 'font-semibold': 'font-weight: 600;', 'text-center': 'text-align: center;',
  // Borders & Effects
  rounded: 'border-radius: 0.25rem;', 'rounded-md': 'border-radius: 0.375rem;', 'rounded-lg': 'border-radius: 0.5rem;',
  'rounded-xl': 'border-radius: 0.75rem;', 'rounded-full': 'border-radius: 9999px;', border: 'border-width: 1px;',
  shadow: 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);',
  'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
  transition: 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
  'cursor-pointer': 'cursor: pointer;'
};

// ─── CORE PARSER ─────────────────────────────────────────────────────────
const parseTailwindClasses = (classString: string, selector: string) => {
  const classes = classString.split(/\s+/).filter(Boolean);
  const rulesMap = new Map<string, string[]>(); // Group by media query wrapper

  classes.forEach(cls => {
    // 1. Extract Modifiers (hover:, md:, etc)
    const parts = cls.split(':');
    const utility = parts.pop()!;
    const modifiers = parts;

    let mediaQuery = '';
    let pseudo = '';

    modifiers.forEach(mod => {
      if (BREAKPOINTS[mod]) mediaQuery = `@media (min-width: ${BREAKPOINTS[mod]})`;
      if (PSEUDO_MAP[mod]) pseudo += PSEUDO_MAP[mod];
    });

    const ruleWrapperKey = `${mediaQuery}|${pseudo}`;
    if (!rulesMap.has(ruleWrapperKey)) rulesMap.set(ruleWrapperKey, []);
    const pushRule = (rule: string) => rulesMap.get(ruleWrapperKey)!.push(rule);

    // 2. Map Utilities
    if (STATIC_UTILITIES[utility]) {
      pushRule(STATIC_UTILITIES[utility]);
    } else if (STANDALONE_COLORS[utility]) {
      pushRule(STANDALONE_COLORS[utility]);
    } else {
      // Regex Parsers
      const spacingMatch = utility.match(/^(-?)(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y)-(\d+\.?\d*)$/);
      const colorMatch = utility.match(/^(text|bg|border)-([a-z]+)-(\d+)(?:\/(\d+))?$/);
      const arbitraryMatch = utility.match(/^(w|h|bg|text|border)-\[(.+)\]$/);

      if (spacingMatch) {
        const [, neg, prefix, value] = spacingMatch;
        const rem = `${neg}${Number(value) * 0.25}rem`;
        SPACING_MAP[prefix].forEach(p => pushRule(`${p}: ${rem};`));
      } 
      else if (colorMatch) {
        const [, type, color, shade, opacity] = colorMatch;
        const prop = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : 'border-color';
        let val = `var(--color-${color}-${shade})`;
        // Simulate opacity handling for CSS vars
        if (opacity) val = `rgb(var(--color-${color}-${shade}-rgb) / ${Number(opacity)/100})`;
        pushRule(`${prop}: ${val};`);
      } 
      else if (arbitraryMatch) {
        const [, type, rawValue] = arbitraryMatch;
        const val = rawValue.replace(/_/g, ' '); // Convert Tailwind underscores to spaces
        const prop = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : type === 'w' ? 'width' : type === 'h' ? 'height' : 'border-color';
        pushRule(`${prop}: ${val};`);
      } 
      else {
        pushRule(`/* TODO: Unmapped utility '${utility}' */`);
      }
    }
  });

  // 3. Format Output
  let finalCss = '';
  rulesMap.forEach((rules, key) => {
    if (rules.length === 0) return;
    const [media, pseudo] = key.split('|');
    let block = `.${selector}${pseudo} {\n  ${rules.join('\n  ')}\n}`;
    if (media) {
      block = `${media} {\n  ${block.split('\n').join('\n  ')}\n}`; // Indent nested block
    }
    finalCss += block + '\n\n';
  });

  return finalCss.trim();
};

// ─── REACT COMPONENT ─────────────────────────────────────────────────────
export default function TailwindToCss() {
  const [input, setInput] = useState('flex items-center p-4 md:p-8 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 text-white w-[100%]');
  const [debouncedInput, setDebouncedInput] = useState(input);
  const [selector, setSelector] = useState('custom-card');
  const [copied, setCopied] = useState(false);

  // Debounce input to prevent UI lag on massive pastes
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 150);
    return () => clearTimeout(timer);
  }, [input]);

  const cssOutput = useMemo(() => parseTailwindClasses(debouncedInput, selector), [debouncedInput, selector]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cssOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto text-slate-200">
      
      {/* Configuration Row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col gap-2 w-full sm:w-64">
          <label htmlFor="selector" className="text-sm font-semibold text-teal-400">CSS Class Selector</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">.</span>
            <input 
              id="selector"
              type="text" 
              value={selector} 
              onChange={(e) => setSelector(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
              className="w-full bg-[#020617] border border-slate-700 rounded-lg py-2 pl-6 pr-3 text-sm focus:outline-none focus:border-teal-500 font-mono" 
            />
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="flex flex-col gap-2">
        <label htmlFor="tw-input" className="text-sm font-semibold text-teal-400">Tailwind CSS Utilities</label>
        <textarea 
          id="tw-input"
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Paste your className string here... (e.g. hover:bg-blue-500 md:w-full)"
          className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-teal-500 h-32" 
        />
      </div>

      {/* Output Section */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-blue-400">Generated Vanilla CSS</label>
          <button 
            onClick={copyToClipboard} 
            aria-label="Copy CSS to clipboard"
            className={`text-xs px-4 py-1.5 rounded transition-all font-medium border ${
              copied 
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' 
                : 'bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 border-teal-500/30'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        
        {/* Render area: strict formatting to prevent JSX whitespace bugs inside <pre> */}
        <div className="relative w-full bg-[#020617] border border-slate-800 rounded-xl overflow-hidden">
<pre aria-live="polite" className="w-full p-4 text-sm font-mono text-slate-300 min-h-62.5 overflow-x-auto whitespace-pre-wrap">
{cssOutput || '/* Enter Tailwind classes above to generate CSS */'}
</pre>
        </div>
      </div>
      
    </div>
  );
}