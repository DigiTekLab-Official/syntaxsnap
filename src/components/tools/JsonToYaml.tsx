// src/components/tools/JsonToYaml.tsx — JSON → YAML.
import React from 'react';
import JsonConverter from '../ui/JsonConverter';

const SAMPLE = `{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": { "name": "web", "labels": { "app": "web", "tier": "frontend" } },
  "spec": {
    "replicas": 3,
    "selector": { "matchLabels": { "app": "web" } },
    "template": {
      "metadata": { "labels": { "app": "web" } },
      "spec": {
        "containers": [
          {
            "name": "web",
            "image": "nginx:1.27",
            "ports": [{ "containerPort": 80 }],
            "env": [{ "name": "MODE", "value": "on" }, { "name": "WORKERS", "value": "4" }]
          }
        ]
      }
    }
  }
}`;

export default function JsonToYaml() {
  return (
    <JsonConverter
      tool="json-to-yaml"
      modes={[{ op: 'json-to-yaml', label: 'JSON to YAML', inputLabel: 'JSON', outputLabel: 'YAML', inputLang: 'json', outputLang: 'yaml', filename: 'data.yaml', mime: 'application/yaml' }]}
      sample={SAMPLE}
      accept=".json,.jsonc,.txt,application/json"
      defaultOptions={{ indent: '2', sortKeys: false, tolerant: true }}
      options={[
        { kind: 'segmented', key: 'indent', label: 'Indent', choices: [{ value: '2', label: '2' }, { value: '4', label: '4' }] },
        { kind: 'toggle', key: 'sortKeys', label: 'Sort keys' },
      ]}
      sendTargets={[{ label: 'YAML to JSON', href: '/tools/yaml-to-json' }]}
      placeholder="Paste JSON"
    />
  );
}
