// src/components/tools/JsonFormatter.tsx — formatter page: code view, beautify.
import React from 'react';
import JsonWorkbench from '../ui/JsonWorkbench';

export default function JsonFormatter() {
  return <JsonWorkbench tool="json-formatter" defaultView="code" defaultAction="beautify" />;
}
