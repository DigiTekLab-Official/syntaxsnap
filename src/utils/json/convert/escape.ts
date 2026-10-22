// src/utils/json/convert/escape.ts — JSON string escaping and unescaping.
import { lintJson, parseJson } from '../parse';
import type { ConvertResult } from '../types';

export interface EscapeOptions {
  /** Wrap the result in double quotes so it is a complete JSON string literal. */
  quotes?: boolean;
  /** If the input is valid JSON, minify it first (the "stringify" use case). */
  minifyJson?: boolean;
}

export function escapeJson(input: string, opts: EscapeOptions = {}): ConvertResult {
  let text = input;
  let minified = false;
  if (opts.minifyJson && input.trim()) {
    const { value, error } = parseJson(input);
    if (!error) { text = JSON.stringify(value); minified = true; }
  }
  const lit = JSON.stringify(text);
  const output = opts.quotes ?? true ? lit : lit.slice(1, -1);
  return { output, info: `${minified ? 'Minified JSON, then escaped' : 'Escaped'} · ${output.length.toLocaleString()} characters` };
}

export interface UnescapeOptions {
  /** If the unescaped text is itself JSON, pretty-print it. */
  formatJson?: boolean;
}

export function unescapeJson(input: string, opts: UnescapeOptions = {}): ConvertResult {
  const t = input.trim();
  if (!t) return { output: '', error: { message: 'The input is empty.' } };
  // Accept both a full literal ("a\"b") and just its contents (a\"b).
  const quoted = /^"(?:[^"\\]|\\.)*"$/s.test(t);
  const literal = quoted ? t : '"' + t + '"';
  // Raw line breaks are common when copying from logs; treat them as \n.
  const normalised = literal.replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t');
  let value: unknown;
  try {
    value = JSON.parse(normalised);
  } catch {
    const issue = lintJson(normalised, { limit: 1, errorsOnly: true })[0];
    if (issue) {
      const shift = quoted ? 0 : 1;
      return { output: '', error: { message: issue.message.replace('This string is never closed. A closing quote is missing.', 'An unescaped double quote ends the string early. Inside a JSON string, write \\" for a quote.'), column: Math.max(1, issue.column - shift), line: 1 } };
    }
    return { output: '', error: { message: 'This is not a valid JSON string literal.' } };
  }
  if (typeof value !== 'string') return { output: '', error: { message: 'The input is not a JSON string.' } };
  if (opts.formatJson) {
    const inner = parseJson(value);
    if (!inner.error && value.trim() && /^[[{]/.test(value.trim())) {
      return { output: JSON.stringify(inner.value, null, 2), info: 'Unescaped. The result is JSON, so it was formatted.' };
    }
  }
  return { output: value, info: `Unescaped · ${value.length.toLocaleString()} characters` };
}
