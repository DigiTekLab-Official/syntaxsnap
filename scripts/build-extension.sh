#!/usr/bin/env bash
# Builds the Chrome Web Store zip for extension/ (excludes README and store assets).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./extension/manifest.json').version")
OUT="dist-extension/syntaxsnap-extension-${VERSION}.zip"
mkdir -p dist-extension
rm -f "$OUT"
(cd extension && zip -qr "../$OUT" . -x 'README.md' 'store/*' 'logo.png' 'logo.svg' '.DS_Store' '*/.DS_Store')
echo "Built $OUT"
unzip -l "$OUT" | tail -n +1
