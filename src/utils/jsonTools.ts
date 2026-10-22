// src/utils/jsonTools.ts — parsing helpers for the JSON formatter.

export interface ParseError { message: string; line?: number; column?: number; position?: number }

export function locate(text: string, pos: number) {
  const before = text.slice(0, pos);
  const line = before.split('\n').length;
  const column = pos - before.lastIndexOf('\n');
  return { line, column };
}

export function parseJson(text: string): { value?: unknown; error?: ParseError } {
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const lc = msg.match(/line (\d+) column (\d+)/i);
    if (lc) return { error: { message: clean(msg), line: +lc[1], column: +lc[2] } };
    const p = msg.match(/position (\d+)/i);
    if (p) {
      const position = +p[1];
      return { error: { message: clean(msg), position, ...locate(text, position) } };
    }
    if (/end of (JSON|data) input/i.test(msg)) {
      return { error: { message: 'The JSON ends early. A bracket, brace or quote is probably missing.', ...locate(text, text.length) } };
    }
    return { error: { message: clean(msg) } };
  }
}

function clean(msg: string) {
  return msg.replace(/^JSON\.parse: /, '').replace(/\s*\(line \d+ column \d+.*\)$/i, '').replace(/ in JSON at position \d+.*$/i, '');
}

export function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v as object).sort((a, b) => a.localeCompare(b)).map((k) => [k, sortKeysDeep((v as Record<string, unknown>)[k])]));
  }
  return v;
}

export function stats(v: unknown) {
  let keys = 0, depth = 0, nodes = 0;
  const walk = (x: unknown, d: number) => {
    nodes++; depth = Math.max(depth, d);
    if (Array.isArray(x)) x.forEach((i) => walk(i, d + 1));
    else if (x && typeof x === 'object') for (const [, val] of Object.entries(x)) { keys++; walk(val, d + 1); }
  };
  walk(v, 0);
  return { keys, depth, nodes };
}

/**
 * Best-effort repair of "almost JSON": comments, trailing commas, single quotes,
 * unquoted keys, and Python/JS literals. Common in LLM output and config files.
 */
export function repairJson(input: string): string {
  let s = input.trim();
  // Strip a markdown code fence an LLM may have wrapped around the JSON
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    // Strings: normalise single-quoted to double-quoted
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1; let str = '';
      while (j < s.length && s[j] !== q) {
        if (s[j] === '\\') { str += s[j] + (s[j + 1] ?? ''); j += 2; continue; }
        if (q === "'" && s[j] === '"') { str += '\\"'; j++; continue; }
        if (s[j] === '\n') { str += '\\n'; j++; continue; }
        str += s[j]; j++;
      }
      out += '"' + (q === "'" ? str.replace(/\\'/g, "'") : str) + '"';
      i = j + 1; continue;
    }
    // Comments
    if (c === '/' && s[i + 1] === '/') { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i += 2; continue; }
    out += c; i++;
  }
  return out
    .replace(/,\s*([}\]])/g, '$1') // trailing commas
    .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$-]*)\s*:/g, '$1"$2":') // unquoted keys
    .replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null')
    .replace(/\bundefined\b/g, 'null')
    .replace(/}\s*{/g, '},{');
}

export const bytes = (s: string) => new TextEncoder().encode(s).length;
export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
