// src/components/tools/XmlToJson.tsx — XML → JSON with an attribute prefix option.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog updated="2026-10-21">
  <book id="bk101" available="true">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <price currency="USD">44.95</price>
    <isbn>0012345678</isbn>
  </book>
  <book id="bk102" available="false">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <price currency="EUR">5.95</price>
    <isbn>0098765432</isbn>
  </book>
</catalog>`;

export default function XmlToJson() {
  return (
    <JsonConverter
      tool="xml-to-json"
      modes={[{ op: 'xml-to-json', label: 'XML to JSON', inputLabel: 'XML', outputLabel: 'JSON', inputLang: 'xml', outputLang: 'json', filename: 'data.json', mime: 'application/json' }]}
      sample={SAMPLE}
      accept=".xml,.rss,.atom,.svg,.txt,application/xml,text/xml"
      defaultOptions={{ attrPrefix: '@_', ignoreAttributes: false, parseValues: true }}
      options={[
        { kind: 'text', key: 'attrPrefix', label: 'Attribute prefix', placeholder: 'none', width: '4rem' },
        { kind: 'toggle', key: 'ignoreAttributes', label: 'Drop attributes' },
        { kind: 'toggle', key: 'parseValues', label: 'Parse numbers and booleans', title: 'Values with leading zeros, like 0012345678, stay strings' },
      ]}
      sendTargets={[
        { label: 'JSON Formatter', href: '/tools/json-formatter' },
        { label: 'JSON to TypeScript', href: '/tools/json-to-typescript' },
        { label: 'JSON to XML', href: '/tools/json-to-xml' },
      ]}
      placeholder="Paste XML"
    />
  );
}
