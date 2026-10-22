// src/components/tools/CsvToJson.tsx — CSV → JSON with delimiter detection and type inference.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `order_id;customer;country;total;paid;shipped_on;zip
A-1001;Müller GmbH;DE;249.90;true;2026-10-02;01067
A-1002;"Rossi; Figli";IT;89;false;;00184
A-1003;Tanaka Ltd;JP;1200.5;true;2026-10-05;100-0001`;

export default function CsvToJson() {
  return (
    <JsonConverter
      tool="csv-to-json"
      modes={[{ op: 'csv-to-json', label: 'CSV to JSON', inputLabel: 'CSV', outputLabel: 'JSON', inputLang: 'csv', outputLang: 'json', filename: 'data.json', mime: 'application/json' }]}
      sample={SAMPLE}
      accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
      defaultOptions={{ header: true, delimiter: 'auto', inferTypes: true, unflatten: false }}
      options={[
        { kind: 'segmented', key: 'delimiter', label: 'Delimiter', choices: [{ value: 'auto', label: 'Auto' }, { value: ',', label: ',' }, { value: ';', label: ';' }, { value: '\t', label: 'Tab' }, { value: '|', label: '|' }] },
        { kind: 'toggle', key: 'header', label: 'First row is header' },
        { kind: 'toggle', key: 'inferTypes', label: 'Infer types', title: 'Turn 42, true and empty cells into numbers, booleans and null. Values with leading zeros stay text.' },
        { kind: 'toggle', key: 'unflatten', label: 'Nest dot paths', title: 'Headers like address.city become nested objects' },
      ]}
      sendTargets={[
        { label: 'JSON Formatter', href: '/tools/json-formatter' },
        { label: 'JSON to TypeScript', href: '/tools/json-to-typescript' },
        { label: 'JSON to Zod', href: '/tools/json-to-zod' },
      ]}
      placeholder="Paste CSV, or drop a .csv file"
    />
  );
}
