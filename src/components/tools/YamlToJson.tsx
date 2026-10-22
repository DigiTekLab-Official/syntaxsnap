// src/components/tools/YamlToJson.tsx — YAML → JSON with readable errors.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `# GitHub Actions workflow
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
    env:
      CI: true
      RELEASE_DATE: 2026-10-22
`;

export default function YamlToJson() {
  return (
    <JsonConverter
      tool="yaml-to-json"
      modes={[{ op: 'yaml-to-json', label: 'YAML to JSON', inputLabel: 'YAML', outputLabel: 'JSON', inputLang: 'yaml', outputLang: 'json', filename: 'data.json', mime: 'application/json' }]}
      sample={SAMPLE}
      accept=".yaml,.yml,.txt,application/yaml,text/yaml,text/plain"
      defaultOptions={{ indent: '2' }}
      options={[{ kind: 'segmented', key: 'indent', label: 'Indent', choices: [{ value: '2', label: '2' }, { value: '4', label: '4' }] }]}
      sendTargets={[
        { label: 'JSON Formatter', href: '/tools/json-formatter' },
        { label: 'JSON to TypeScript', href: '/tools/json-to-typescript' },
        { label: 'JSON to YAML', href: '/tools/json-to-yaml' },
      ]}
      placeholder="Paste YAML"
    />
  );
}
