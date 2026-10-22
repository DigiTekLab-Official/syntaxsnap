// src/components/tools/JsonValidator.tsx — validator page: pass/fail banner and
// the full problem list. The sample has typical hand-edit mistakes on purpose.
import React from 'react';
import JsonWorkbench from '../ui/JsonWorkbench';

const SAMPLE = `{
  "name": "billing-service",
  "port": 8080,
  'region': "eu-west-1",
  "retries": 3
  "features": {
    "invoices": true,
    "refunds": false,
  },
  "port": 9090
}`;

export default function JsonValidator() {
  return <JsonWorkbench tool="json-validator" defaultView="code" defaultAction="validate" sample={SAMPLE} />;
}
