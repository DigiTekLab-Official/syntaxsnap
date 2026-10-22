// src/utils/json/repair.ts — best-effort repair of "almost JSON".
//
// Handles what LLMs, JavaScript configs and Python reprs usually produce:
// markdown code fences and surrounding prose, comments, trailing and missing
// commas, single quotes, unquoted keys, Python/JS literals, raw line breaks in
// strings, NDJSON / several concatenated documents, and output that was cut
// off before its closing brackets. Text inside strings is never altered.
import { normalizeSpaces } from './parse';

const LITERALS: Record<string, string> = {
  true: 'true', false: 'false', null: 'null',
  True: 'true', False: 'false', None: 'null', TRUE: 'true', FALSE: 'false', NULL: 'null', Null: 'null',
  undefined: 'null', NaN: 'null', Infinity: 'null',
};

/** Pulls the JSON out of a markdown code fence or surrounding prose. */
export function extractJsonBlock(input: string): string {
  const s = input.trim();
  const fence = /```[\w-]*[ \t]*\r?\n?([\s\S]*?)(?:```|$)/.exec(s);
  if (fence && /[[{]/.test(fence[1])) return fence[1].trim();
  if (/^[[{"'\d-]/.test(s) || /^(true|false|null)\b/.test(s)) return s;
  // Prose before the JSON ("Here is the data: {...}") — take from the first bracket.
  const start = s.search(/[[{]/);
  if (start === -1) return s;
  const open = s[start];
  const close = open === '{' ? '}' : ']';
  const end = s.lastIndexOf(close);
  return end > start ? s.slice(start, end + 1) : s.slice(start);
}

export function repairJson(input: string): string {
  const s = normalizeSpaces(extractJsonBlock(input));
  const out: string[] = [];
  const stack: ('{' | '[')[] = [];
  // What the last emitted token was, to decide on missing commas.
  let last: 'start' | 'value' | 'open' | 'comma' | 'colon' = 'start';
  let topLevelValues = 0;
  let i = 0;
  const n = s.length;

  // In an object, anything that is not after a colon is a key. After a value it
  // means a comma was missing, so add one.
  const inObjectKeyPosition = () => stack[stack.length - 1] === '{' && (last === 'open' || last === 'comma' || last === 'value');
  const beginKey = () => { if (last === 'value') out.push(','); };

  const beginValue = () => {
    if (last === 'value') {
      if (stack.length === 0) { out.push(','); topLevelValues++; }
      else out.push(',');
    } else if (last === 'start') {
      topLevelValues = 1;
    }
  };

  while (i < n) {
    const c = s[i];

    // Whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { out.push(c); i++; continue; }

    // Comments
    if (c === '/' && s[i + 1] === '/') { while (i < n && s[i] !== '\n') i++; continue; }
    if (c === '/' && s[i + 1] === '*') {
      const end = s.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }

    // Strings (single or double quoted)
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      let str = '';
      let closed = false;
      while (j < n) {
        const ch = s[j];
        if (ch === '\\') {
          const nx = s[j + 1] ?? '';
          if (nx === "'") str += "'";
          else if ('"\\/bfnrtu'.includes(nx) && nx !== '') str += '\\' + nx;
          else str += '\\\\' + nx; // unknown escape: keep the backslash literally
          j += 2; continue;
        }
        if (ch === q) { closed = true; j++; break; }
        if (ch === '"') { str += '\\"'; j++; continue; }
        if (ch === '\n') {
          // A newline in a single-quoted or unterminated string: escape it,
          // unless the string was obviously never closed.
          if (q === '"' && s.indexOf('"', j + 1) === -1) break;
          str += '\\n'; j++; continue;
        }
        if (ch === '\r') { str += '\\r'; j++; continue; }
        if (ch === '\t') { str += '\\t'; j++; continue; }
        const code = ch.charCodeAt(0);
        if (code < 0x20) { str += '\\u' + code.toString(16).padStart(4, '0'); j++; continue; }
        str += ch; j++;
      }
      const isKey = inObjectKeyPosition();
      if (isKey) beginKey(); else beginValue();
      out.push('"' + str + '"');
      last = 'value';
      i = j;
      if (!closed && j >= n) break;
      if (isKey) {
        // Make sure a colon follows a key.
        let k = i;
        while (k < n && /\s/.test(s[k])) k++;
        if (s[k] !== ':') out.push(':');
        last = s[k] === ':' ? 'value' : 'colon';
      }
      continue;
    }

    if (c === ':') { out.push(':'); last = 'colon'; i++; continue; }

    if (c === ',') {
      // Drop trailing commas and doubled commas; they are re-added where needed.
      let k = i + 1;
      while (k < n && /\s/.test(s[k])) k++;
      if (s[k] === '}' || s[k] === ']' || s[k] === ',' || k >= n || last === 'open' || last === 'comma' || last === 'start') { i++; continue; }
      out.push(','); last = 'comma'; i++; continue;
    }

    if (c === '{' || c === '[') {
      beginValue();
      stack.push(c);
      out.push(c); last = 'open'; i++; continue;
    }

    if (c === '}' || c === ']') {
      // Close any unclosed inner containers, then this one.
      if (stack.length === 0) { i++; continue; }
      const want = c === '}' ? '{' : '[';
      if (stack[stack.length - 1] !== want && stack.includes(want)) {
        while (stack.length && stack[stack.length - 1] !== want) out.push(stack.pop() === '{' ? '}' : ']');
      }
      if (stack[stack.length - 1] === want) { stack.pop(); out.push(c); last = 'value'; }
      i++; continue;
    }

    // Numbers
    const num = /^[+-]?(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/.exec(s.slice(i, i + 400));
    if (num && num[0] !== '+' && num[0] !== '-') {
      beginValue();
      out.push(normaliseNumber(num[0]));
      last = 'value';
      i += num[0].length;
      continue;
    }
    if (s.startsWith('-Infinity', i)) { beginValue(); out.push('null'); last = 'value'; i += 9; continue; }

    // Bare words: literals, unquoted keys, or unquoted string values
    const w = /^[A-Za-z_$][\w$.-]*/.exec(s.slice(i, i + 200));
    if (w) {
      const word = w[0];
      if (inObjectKeyPosition()) {
        beginKey();
        out.push(JSON.stringify(word));
        let k = i + word.length;
        while (k < n && /\s/.test(s[k])) k++;
        if (s[k] !== ':') out.push(':');
        last = s[k] === ':' ? 'value' : 'colon';
        i += word.length;
        continue;
      }
      beginValue();
      if (LITERALS[word]) out.push(LITERALS[word]);
      else {
        // Unquoted text value: take the rest of the token up to a delimiter.
        const rest = /^[^,}\]\n]*/.exec(s.slice(i))![0].trimEnd();
        out.push(JSON.stringify(rest));
        i += rest.length;
        last = 'value';
        continue;
      }
      last = 'value';
      i += word.length;
      continue;
    }

    // Anything else (stray characters) is dropped.
    i++;
  }

  // Close whatever the input left open (truncated output).
  if (last === 'colon') out.push('null');
  while (stack.length) out.push(stack.pop() === '{' ? '}' : ']');

  let result = out.join('').trim();
  if (topLevelValues > 1) result = '[\n' + result + '\n]';
  return result;
}

function normaliseNumber(s: string): string {
  let t = s.replace(/^\+/, '');
  if (/^-?0[xX]/.test(t)) return String(parseInt(t, 16));
  t = t.replace(/^(-?)0+(\d)/, '$1$2');
  if (/^-?\./.test(t)) t = t.replace('.', '0.');
  t = t.replace(/\.(?=[eE]|$)/, '');
  return t;
}
