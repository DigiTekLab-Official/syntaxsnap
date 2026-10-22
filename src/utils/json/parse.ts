// src/utils/json/parse.ts — JSON parsing with line/column errors, an optional
// JSON5/JSONC mode, and a validator that lists every problem it can find.

export interface ParseError { message: string; line?: number; column?: number; position?: number }

export interface Issue {
  message: string;
  line: number;
  column: number;
  position: number;
  /** 'error' breaks strict JSON; 'warning' is valid JSON that is probably a mistake (duplicate keys). */
  severity: 'error' | 'warning';
  /** True when "Fix common errors" can repair this kind of problem. */
  fixable?: boolean;
}

export interface ParseOptions {
  /** Accept JSONC/JSON5 extras: comments, trailing commas and single-quoted strings. */
  tolerant?: boolean;
}

/** 1-based line and column for a character offset. */
export function locate(text: string, pos: number) {
  let line = 1;
  let lineStart = 0;
  let i = text.indexOf('\n');
  while (i !== -1 && i < pos) {
    line++;
    lineStart = i + 1;
    i = text.indexOf('\n', lineStart);
  }
  return { line, column: pos - lineStart + 1 };
}

/** Character offset for a 1-based line and column. */
export function offsetOf(text: string, line: number, column = 1) {
  let pos = 0;
  for (let l = 1; l < line; l++) {
    const nl = text.indexOf('\n', pos);
    if (nl === -1) return text.length;
    pos = nl + 1;
  }
  return Math.min(text.length, pos + column - 1);
}

// ─── Copy-paste whitespace ───────────────────────────────────────────────────

// Spaces that web pages and editors put into copied code (w3schools, docs sites,
// Word, Slack): non-breaking and other Unicode spaces, zero-width characters and
// a byte-order mark. JSON only allows plain spaces, tabs and line breaks
// between tokens, so these break JSON.parse even though the JSON looks fine.
const ODD_SPACE = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/;
const isOddSpace = (c: number) =>
  c === 0x00a0 || c === 0x1680 || (c >= 0x2000 && c <= 0x200b) || c === 0x202f || c === 0x205f || c === 0x3000 || c === 0xfeff;

/**
 * Replaces Unicode spaces between tokens with plain spaces, one for one, so
 * positions don't move. Characters inside strings are left exactly as they are.
 */
export function normalizeSpaces(text: string): string {
  if (!ODD_SPACE.test(text)) return text;
  let out = '';
  let chunkStart = 0;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 34 /* " */ || c === 39 /* ' */) { i = skipString(text, i, c); continue; }
    if (isOddSpace(c)) {
      out += text.slice(chunkStart, i) + ' ';
      i++;
      chunkStart = i;
      continue;
    }
    i++;
  }
  return out + text.slice(chunkStart);
}

export function parseJson(raw: string, opts: ParseOptions = {}): { value?: unknown; error?: ParseError } {
  const text = normalizeSpaces(raw);
  const src = opts.tolerant ? toStrictJson(text) : text;
  try {
    return { value: JSON.parse(src) };
  } catch (e) {
    return { error: describeError(text, e, opts) };
  }
}

/**
 * Turns a JSON.parse failure into a browser-independent message with a position.
 * Our own scanner finds the first problem; the engine's message is the fallback.
 */
function describeError(text: string, e: unknown, opts: ParseOptions): ParseError {
  if (!text.trim()) return { message: 'The input is empty.' };
  const first = lintJson(text, { tolerant: opts.tolerant, limit: 1, errorsOnly: true })[0];
  if (first) return { message: first.message, line: first.line, column: first.column, position: first.position };

  const msg = e instanceof Error ? e.message : String(e);
  const lc = msg.match(/line (\d+) column (\d+)/i);
  if (lc) return { message: clean(msg), line: +lc[1], column: +lc[2] };
  const p = msg.match(/position (\d+)/i);
  if (p) return { message: clean(msg), position: +p[1], ...locate(text, +p[1]) };
  return { message: clean(msg) };
}

function clean(msg: string) {
  return msg
    .replace(/^JSON\.parse: /, '')
    .replace(/\s*\(line \d+ column \d+.*\)$/i, '')
    .replace(/ (in JSON )?at position \d+.*$/i, '')
    .replace(/ at line \d+ column \d+ of the JSON data$/i, '');
}

// ─── JSONC / JSON5 → strict JSON ─────────────────────────────────────────────

/**
 * Rewrites JSONC/JSON5-style input as strict JSON: comments and trailing commas
 * become spaces (so error positions stay put) and single-quoted strings become
 * double-quoted. Everything inside strings is left alone.
 */
export function toStrictJson(text: string): string {
  // Fast path: nothing to rewrite.
  if (!/[/'\],}]/.test(text)) return text;
  const out: string[] = [];
  let i = 0;
  let chunkStart = 0;
  const n = text.length;
  const flush = (to: number) => { if (to > chunkStart) out.push(text.slice(chunkStart, to)); };

  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 34 /* " */) {
      i = skipString(text, i, 34);
      continue;
    }
    if (c === 39 /* ' */) {
      flush(i);
      const end = skipString(text, i, 39);
      out.push(singleToDouble(text.slice(i + 1, Math.max(i + 1, end - 1))));
      i = end;
      chunkStart = i;
      continue;
    }
    if (c === 47 /* / */ && (text[i + 1] === '/' || text[i + 1] === '*')) {
      flush(i);
      const end = skipComment(text, i);
      out.push(blank(text.slice(i, end)));
      i = end;
      chunkStart = i;
      continue;
    }
    if (c === 44 /* , */) {
      const next = nextSignificant(text, i + 1);
      if (next < n && (text[next] === '}' || text[next] === ']')) {
        flush(i);
        out.push(' ');
        i++;
        chunkStart = i;
        continue;
      }
    }
    i++;
  }
  flush(n);
  return out.join('');
}

/** Index just past the closing quote (or the end of text if unterminated). */
function skipString(text: string, start: number, quote: number) {
  let i = start + 1;
  const n = text.length;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 92 /* \ */) { i += 2; continue; }
    if (c === quote) return i + 1;
    if (c === 10) return i; // strings cannot span lines; stop here
    i++;
  }
  return n;
}

function skipComment(text: string, start: number) {
  if (text[start + 1] === '/') {
    const nl = text.indexOf('\n', start);
    return nl === -1 ? text.length : nl;
  }
  const end = text.indexOf('*/', start + 2);
  return end === -1 ? text.length : end + 2;
}

/** Index of the next character that is not whitespace or inside a comment. */
function nextSignificant(text: string, from: number) {
  let i = from;
  const n = text.length;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) { i++; continue; }
    if (c === 47 && (text[i + 1] === '/' || text[i + 1] === '*')) { i = skipComment(text, i); continue; }
    return i;
  }
  return n;
}

const blank = (s: string) => s.replace(/[^\n]/g, ' ');

function singleToDouble(inner: string) {
  let s = '';
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '\\') {
      const nx = inner[i + 1];
      if (nx === "'") { s += "'"; i++; continue; }
      s += ch + (nx ?? ''); i++; continue;
    }
    s += ch === '"' ? '\\"' : ch;
  }
  return '"' + s + '"';
}

// ─── Validator ───────────────────────────────────────────────────────────────

export interface LintOptions {
  tolerant?: boolean;
  /** Stop after this many issues. */
  limit?: number;
  /** Skip warnings (duplicate keys) — used when we only need the first error. */
  errorsOnly?: boolean;
}

const MAX_DEPTH = 4000;

/**
 * Scans text as JSON and reports every problem it can recover from: comments,
 * trailing commas, single quotes, unquoted keys, Python/JS literals, missing
 * commas, bad escapes and duplicate keys. Positions are 1-based.
 */
export function lintJson(raw: string, opts: LintOptions = {}): Issue[] {
  const text = normalizeSpaces(raw);
  const limit = opts.limit ?? 100;
  const tolerant = !!opts.tolerant;
  const issues: Issue[] = [];
  const n = text.length;
  let i = 0;
  let fatal = false;

  // Precompute line starts lazily for fast locate on many issues.
  let lineStarts: number[] | null = null;
  const where = (pos: number) => {
    if (!lineStarts) {
      lineStarts = [0];
      for (let k = text.indexOf('\n'); k !== -1; k = text.indexOf('\n', k + 1)) lineStarts.push(k + 1);
    }
    let lo = 0, hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1;
    }
    return { line: lo + 1, column: pos - lineStarts[lo] + 1 };
  };

  const report = (pos: number, message: string, severity: Issue['severity'] = 'error', fixable = false) => {
    if (issues.length >= limit) { fatal = true; return; }
    if (severity === 'warning' && opts.errorsOnly) return;
    issues.push({ message, position: pos, severity, fixable, ...where(pos) });
    if (issues.length >= limit) fatal = true;
  };
  const stop = (pos: number, message: string) => { report(pos, message); fatal = true; };

  const ws = () => {
    while (i < n) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) { i++; continue; }
      if (c === 47 && (text[i + 1] === '/' || text[i + 1] === '*')) {
        if (!tolerant) report(i, 'Comments are not allowed in JSON.', 'error', true);
        if (text[i + 1] === '*' && text.indexOf('*/', i + 2) === -1) { stop(i, 'This block comment is never closed.'); return; }
        i = skipComment(text, i);
        continue;
      }
      if (c === 0xfeff && i === 0) { i++; continue; }
      break;
    }
  };

  const describe = (pos: number) => {
    if (pos >= n) return 'the end of the input';
    const ch = text[pos];
    if (ch === '\n' || ch === '\r') return 'a line break';
    return `"${ch}"`;
  };

  const word = () => {
    const m = /^[A-Za-z_$][\w$-]*/.exec(text.slice(i, i + 64));
    return m ? m[0] : '';
  };

  const string = (quote: string) => {
    const start = i;
    if (quote === "'" && !tolerant) report(i, 'Strings must use double quotes, not single quotes.', 'error', true);
    i++;
    while (i < n) {
      const ch = text[i];
      if (ch === quote) { i++; return true; }
      if (ch === '\\') {
        const e = text[i + 1];
        if (e === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) report(i, 'A \\u escape needs exactly four hex digits.');
          i += 6; continue;
        }
        if (!'"\\/bfnrt'.includes(e ?? '') && !(e === "'" && quote === "'")) {
          report(i, e === "'" ? 'Single quotes do not need escaping in JSON. Write \' instead of \\\'.' : `"\\${e ?? ''}" is not a valid escape sequence in JSON.`, 'error', e === "'");
        }
        i += 2; continue;
      }
      if (ch === '\n' || ch === '\r') { stop(start, 'This string is never closed. Strings cannot span lines; use \\n for a line break.'); return false; }
      if (text.charCodeAt(i) < 0x20) report(i, 'Tab and control characters must be escaped inside strings (use \\t).', 'error', true);
      i++;
    }
    stop(start, 'This string is never closed. A closing quote is missing.');
    return false;
  };

  const number = () => {
    const start = i;
    const m = /^[+-]?0[xX][0-9a-fA-F]+|^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!m) { stop(i, `Unexpected ${describe(i)}. Expected a value.`); return; }
    const s = m[0];
    i += s.length;
    if (s[0] === '+') report(start, 'Numbers cannot start with a plus sign.');
    else if (/^-?0[xX]/.test(s)) report(start, 'Hexadecimal numbers are not allowed in JSON.');
    else if (/^-?0\d/.test(s)) report(start, 'Numbers cannot have leading zeros.');
    else if (/^-?\./.test(s)) report(start, 'Numbers need a digit before the decimal point.');
    else if (/\.(?:[eE]|$)/.test(s)) report(start, 'Numbers need a digit after the decimal point.');
  };

  const LITERAL_FIX: Record<string, string> = {
    True: 'true', False: 'false', None: 'null', undefined: 'null', NaN: 'null', Infinity: 'null', TRUE: 'true', FALSE: 'false', NULL: 'null', Null: 'null',
  };

  const value = (depth: number) => {
    if (fatal) return;
    ws();
    if (i >= n) { stop(i, 'The JSON ends early. A value, bracket or quote is probably missing.'); return; }
    if (depth > MAX_DEPTH) { stop(i, `Nesting is deeper than ${MAX_DEPTH} levels.`); return; }
    const ch = text[i];
    if (ch === '{') return object(depth);
    if (ch === '[') return array(depth);
    if (ch === '"') { string('"'); return; }
    if (ch === "'") { string("'"); return; }
    if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) {
      if (text.startsWith('-Infinity', i)) { report(i, '-Infinity is not valid JSON. Use null or a large number.', 'error', true); i += 9; return; }
      number(); return;
    }
    const w = word();
    if (w) {
      if (w === 'true' || w === 'false' || w === 'null') { i += w.length; return; }
      if (LITERAL_FIX[w]) { report(i, `${w} is not valid JSON. Use ${LITERAL_FIX[w]}.`, 'error', true); i += w.length; return; }
      stop(i, `Unexpected word "${w}". Text values must be in double quotes.`);
      return;
    }
    stop(i, `Unexpected ${describe(i)}. Expected a value.`);
  };

  const object = (depth: number) => {
    i++; // {
    const keys = opts.errorsOnly ? null : new Set<string>();
    ws();
    if (text[i] === '}') { i++; return; }
    for (;;) {
      if (fatal) return;
      ws();
      const keyPos = i;
      let key: string;
      if (text[i] === '"' || text[i] === "'") {
        const q = text[i];
        if (!string(q)) return;
        key = text.slice(keyPos + 1, i - 1);
      } else {
        const w = word();
        if (w) {
          if (!tolerant) report(i, `Property names must be in double quotes: "${w}".`, 'error', true);
          key = w;
          i += w.length;
        } else if (i >= n) {
          stop(i, 'The JSON ends early. An object is missing its closing }.'); return;
        } else if (text[i] === '}') {
          // Reached through a trailing comma; already reported.
          i++; return;
        } else {
          stop(i, `Unexpected ${describe(i)}. Expected a property name in double quotes.`); return;
        }
      }
      if (keys) {
        if (keys.has(key)) report(keyPos, `Duplicate key "${key}". JSON.parse keeps only the last value.`, 'warning');
        keys.add(key);
      }
      ws();
      if (text[i] !== ':') {
        if (i >= n) { stop(i, 'The JSON ends early. A value is missing after the property name.'); return; }
        stop(i, `Expected ":" after the property name, found ${describe(i)}.`); return;
      }
      i++;
      value(depth + 1);
      if (fatal) return;
      ws();
      const c = text[i];
      if (c === ',') {
        const commaPos = i;
        i++;
        ws();
        if (text[i] === '}') {
          if (!tolerant) report(commaPos, 'Trailing comma before }. Remove the last comma.', 'error', true);
          i++; return;
        }
        continue;
      }
      if (c === '}') { i++; return; }
      if (i >= n) { stop(i, 'The JSON ends early. An object is missing its closing }.'); return; }
      if (c === '"' || c === "'" || /[A-Za-z_$]/.test(c)) {
        report(i, 'Missing comma between properties.', 'error', true);
        continue;
      }
      stop(i, `Expected "," or "}" after a property value, found ${describe(i)}.`);
      return;
    }
  };

  const array = (depth: number) => {
    i++; // [
    ws();
    if (text[i] === ']') { i++; return; }
    for (;;) {
      if (fatal) return;
      value(depth + 1);
      if (fatal) return;
      ws();
      const c = text[i];
      if (c === ',') {
        const commaPos = i;
        i++;
        ws();
        if (text[i] === ']') {
          if (!tolerant) report(commaPos, 'Trailing comma before ]. Remove the last comma.', 'error', true);
          i++; return;
        }
        if (text[i] === ',') { stop(i, 'Two commas in a row. Arrays cannot have empty slots.'); return; }
        continue;
      }
      if (c === ']') { i++; return; }
      if (i >= n) { stop(i, 'The JSON ends early. An array is missing its closing ].'); return; }
      if (c === '{' || c === '[' || c === '"' || c === "'" || c === '-' || (c >= '0' && c <= '9') || /[A-Za-z]/.test(c)) {
        report(i, 'Missing comma between array items.', 'error', true);
        continue;
      }
      stop(i, `Expected "," or "]" after an array item, found ${describe(i)}.`);
      return;
    }
  };

  ws();
  if (i >= n && !fatal) {
    report(0, 'The input is empty.');
    return issues;
  }
  value(0);
  if (!fatal) {
    ws();
    if (i < n && !fatal) {
      const extra = text[i];
      report(i, extra === '{' || extra === '['
        ? 'Unexpected text after the JSON value. Is this several JSON documents (NDJSON)? Wrap them in [ ] with commas.'
        : `Unexpected ${describe(i)} after the end of the JSON value.`, 'error', extra === '{' || extra === '[');
    }
  }
  return issues;
}
