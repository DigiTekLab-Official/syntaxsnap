// src/components/tools/JsonEscape.tsx — escape text into a JSON string literal, or back.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `{"event": "signup", "message": "Welcome, \\"Sam\\"!\\nYour code is ready."}`;

const UNESCAPE_SAMPLE = `"{\\"event\\":\\"signup\\",\\"path\\":\\"C:\\\\\\\\Users\\\\\\\\sam\\",\\"note\\":\\"line one\\\\nline two\\"}"`;

export default function JsonEscape() {
  return (
    <JsonConverter
      tool="json-escape"
      modes={[
        { op: 'escape', label: 'Escape', inputLabel: 'Text or JSON', outputLabel: 'Escaped JSON string', inputLang: 'text', outputLang: 'text', filename: 'escaped.txt', mime: 'text/plain' },
        { op: 'unescape', label: 'Unescape', inputLabel: 'Escaped JSON string', outputLabel: 'Unescaped text', inputLang: 'text', outputLang: 'json', filename: 'unescaped.txt', mime: 'text/plain', sample: UNESCAPE_SAMPLE },
      ]}
      sample={SAMPLE}
      accept=".json,.txt,text/plain,application/json"
      defaultOptions={{ quotes: true, minifyJson: true, formatJson: true }}
      options={[
        { kind: 'toggle', key: 'quotes', label: 'Wrap in quotes', title: 'Output a complete string literal, ready to paste into code' },
        { kind: 'toggle', key: 'minifyJson', label: 'Minify JSON first', title: 'When escaping valid JSON, remove whitespace before escaping' },
        { kind: 'toggle', key: 'formatJson', label: 'Format unescaped JSON', title: 'When unescaping, pretty-print the result if it is JSON' },
      ]}
      placeholder="Paste text to escape, or an escaped string to unescape"
    />
  );
}
