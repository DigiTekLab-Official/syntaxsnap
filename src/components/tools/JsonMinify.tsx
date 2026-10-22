// src/components/tools/JsonMinify.tsx — minifier page: minify by default and
// show the bytes saved.
import React from 'react';
import JsonWorkbench from '../ui/JsonWorkbench';

const SAMPLE = `{
    "flags": {
        "new_checkout": {
            "enabled": true,
            "rollout_percent": 25,
            "segments": [
                "beta-testers",
                "internal"
            ]
        },
        "dark_mode": {
            "enabled": true,
            "rollout_percent": 100,
            "segments": []
        },
        "ai_summaries": {
            "enabled": false,
            "rollout_percent": 0,
            "segments": [
                "enterprise"
            ]
        }
    },
    "updated_at": "2026-10-20T08:15:00Z",
    "version": 42
}`;

export default function JsonMinify() {
  return <JsonWorkbench tool="json-minify" defaultView="code" defaultAction="minify" defaultIndent="4" sample={SAMPLE} />;
}
