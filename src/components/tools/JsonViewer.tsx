// src/components/tools/JsonViewer.tsx — viewer page: tree view, two levels open.
import React from 'react';
import JsonWorkbench from '../ui/JsonWorkbench';

const SAMPLE = `{
  "repository": {
    "id": 70107786,
    "name": "syntaxsnap-demo",
    "private": false,
    "owner": { "login": "octo-dev", "id": 583231, "type": "User", "site_admin": false },
    "topics": ["json", "developer-tools", "privacy"],
    "license": { "key": "mit", "name": "MIT License", "spdx_id": "MIT" },
    "stats": { "stars": 1284, "forks": 96, "open_issues": 7, "watchers": 41 }
  },
  "releases": [
    {
      "tag": "v2.1.0",
      "published_at": "2026-09-30T14:02:11Z",
      "prerelease": false,
      "assets": [
        { "name": "app-linux-x64.tar.gz", "size": 18874368, "downloads": 3021 },
        { "name": "app-macos-arm64.zip", "size": 17301504, "downloads": 4410 }
      ]
    },
    {
      "tag": "v2.1.0-rc.1",
      "published_at": "2026-09-12T09:45:00Z",
      "prerelease": true,
      "assets": []
    }
  ],
  "rate_limit": { "limit": 5000, "remaining": 4987, "reset": 1761134400 },
  "next_page": null
}`;

export default function JsonViewer() {
  return <JsonWorkbench tool="json-viewer" defaultView="tree" defaultAction="beautify" sample={SAMPLE} treeDepth={2} />;
}
