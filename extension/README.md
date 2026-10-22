# SyntaxSnap Chrome extension

Right-click menu and popup that open text in [SyntaxSnap](https://syntaxsnap.com) tools.

## What it does

- **Right-click menu** on selected text: Format JSON, View JSON as a tree, JSON to TypeScript, JSON to Zod, TypeScript to Zod, OpenAPI to Zod, Decode JWT, Decode Base64, Convert Unix timestamp, Test regex, Compare text.
- **Popup:** search the tools, a popular list, and "Extract SVGs from this page", which sends an SVG to SVG to JSX.

Selected text is put in the URL **fragment** (`https://syntaxsnap.com/tools/<tool>#input=...`). Browsers never send the fragment to a server, so the text stays in the browser. The site reads it once and removes it from the address bar (`src/utils/incomingInput.ts`). The `utm_*` query parameters carry no user data.

## Permissions

| Permission | Why |
|---|---|
| `contextMenus` | Adds the SyntaxSnap entry to the right-click menu on selected text. |
| `activeTab` | After a menu click or popup action, lets the extension read the current tab only: the exact selection (with line breaks), or its SVGs. |
| `scripting` | Runs the one-off selection and SVG readers in that tab. |

No host permissions, no remote code, no analytics, and no data is collected.

## Files

- `manifest.json`: MV3 manifest
- `tools.js`: menu items, popup tool list and the URL builder (shared)
- `background.js`: service worker for the right-click menu
- `popup.html` and `popup.js`: popup UI and the SVG extractor
- `fonts/`: IBM Plex, bundled (OFL licence in `fonts/IBM-Plex-OFL.txt`)
- `store/`: Chrome Web Store screenshots and listing text (not shipped in the zip)

## Build and release

```
./scripts/build-extension.sh    # writes dist-extension/syntaxsnap-extension-<version>.zip
```

Release checklist:

1. Bump `version` in `manifest.json`.
2. Load unpacked (`chrome://extensions`, Developer mode, Load unpacked, choose `extension/`) and check each right-click item on a test page. The tool should open with the selected text and no `?input=` in the URL.
3. Run the script and upload the zip in the Chrome Web Store developer dashboard.
4. Update the listing from `store/listing.md` and the screenshots in `store/`.
