// src/components/tools/JsonToXml.tsx — JSON → XML with a configurable root element.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `{
  "@_version": "2.0",
  "channel": {
    "title": "SyntaxSnap changelog",
    "link": "https://syntaxsnap.com",
    "item": [
      { "title": "JSON tree viewer", "pubDate": "Wed, 22 Oct 2026 09:00:00 GMT", "category": ["json", "viewer"] },
      { "title": "CSV export", "pubDate": "Mon, 20 Oct 2026 09:00:00 GMT", "category": ["csv"] }
    ]
  }
}`;

export default function JsonToXml() {
  return (
    <JsonConverter
      tool="json-to-xml"
      modes={[{ op: 'json-to-xml', label: 'JSON to XML', inputLabel: 'JSON', outputLabel: 'XML', inputLang: 'json', outputLang: 'xml', filename: 'data.xml', mime: 'application/xml' }]}
      sample={SAMPLE}
      accept=".json,.jsonc,.txt,application/json"
      defaultOptions={{ root: 'rss', itemName: 'item', attrPrefix: '@_', declaration: true, tolerant: true }}
      options={[
        { kind: 'text', key: 'root', label: 'Root element', placeholder: 'root', width: '8rem' },
        { kind: 'text', key: 'itemName', label: 'Array item', placeholder: 'item', width: '6rem' },
        { kind: 'text', key: 'attrPrefix', label: 'Attribute prefix', placeholder: '@_', width: '4rem' },
        { kind: 'toggle', key: 'declaration', label: 'XML declaration' },
      ]}
      sendTargets={[{ label: 'XML to JSON', href: '/tools/xml-to-json' }]}
      placeholder="Paste JSON"
    />
  );
}
