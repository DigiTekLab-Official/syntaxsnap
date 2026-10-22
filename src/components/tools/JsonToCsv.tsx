// src/components/tools/JsonToCsv.tsx — JSON array → CSV with a table preview.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `[
  { "id": 1001, "name": "Aisha Khan", "email": "aisha@example.com", "plan": "pro", "address": { "city": "Pune", "country": "IN" }, "tags": ["early-adopter", "beta"], "active": true },
  { "id": 1002, "name": "Diego Alvarez", "email": "diego@example.com", "plan": "free", "address": { "city": "Austin", "country": "US" }, "tags": [], "active": true },
  { "id": 1003, "name": "Linh Nguyen", "email": "linh@example.com", "plan": "team", "address": { "city": "Hanoi", "country": "VN" }, "tags": ["invoice"], "active": false }
]`;

export default function JsonToCsv() {
  return (
    <JsonConverter
      tool="json-to-csv"
      modes={[{ op: 'json-to-csv', label: 'JSON to CSV', inputLabel: 'JSON', outputLabel: 'CSV', inputLang: 'json', outputLang: 'csv', filename: 'data.csv', mime: 'text/csv' }]}
      sample={SAMPLE}
      accept=".json,.jsonc,.ndjson,.txt,application/json"
      table
      excelBomOption
      defaultOptions={{ flatten: true, arrays: 'join', delimiter: ',', tolerant: true }}
      options={[
        { kind: 'segmented', key: 'delimiter', label: 'Delimiter', choices: [{ value: ',', label: 'Comma' }, { value: ';', label: 'Semicolon' }, { value: '\t', label: 'Tab' }] },
        { kind: 'toggle', key: 'flatten', label: 'Flatten nested objects', title: 'address.city becomes its own column. Off: nested objects stay as JSON text in one cell.' },
        { kind: 'segmented', key: 'arrays', label: 'Arrays', choices: [{ value: 'join', label: 'a; b' }, { value: 'index', label: 'Columns' }, { value: 'json', label: 'JSON' }] },
        { kind: 'toggle', key: 'escapeFormulae', label: 'Escape formulas', title: 'Prefix cells starting with = + - @ so Excel does not run them as formulas' },
      ]}
      sendTargets={[{ label: 'CSV to JSON', href: '/tools/csv-to-json' }]}
      placeholder="Paste a JSON array of objects"
    />
  );
}
