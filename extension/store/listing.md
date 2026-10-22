# Chrome Web Store listing: SyntaxSnap 1.3.0

## Name (45 characters max)
SyntaxSnap: JSON Formatter, Zod & Dev Tools

## Summary (132 characters max)
Format and view JSON, decode JWTs, and convert JSON, TypeScript and OpenAPI to Zod. Runs on syntaxsnap.com; nothing is uploaded.

## Category
Developer Tools

## Detailed description

Rejected on 22 Oct 2026 for keyword spam ("Yellow Argon") because of a bracketed list of tool names. Keep this text free of tool-name lists: every line should describe what the extension does or explain a permission.

```
Select text on any page, right-click, and open it in the right developer tool, already pasted in.

What you can do from the right-click menu:
- Format JSON: beautify and validate it, and fix the almost-JSON that AI assistants often return, such as comments, trailing commas and single quotes.
- View JSON as a collapsible tree, search it, and copy the path of any value.
- Turn a JSON sample into TypeScript interfaces or a Zod schema.
- Convert TypeScript types or an OpenAPI spec into Zod schemas.
- Decode a JWT or a Base64 string, or turn a Unix timestamp into a readable date.
- Test a regular expression against the selected text, or compare two pieces of text.

The toolbar button lets you search all of SyntaxSnap's tools. It can also find the SVG icons on the current page and turn one into a React component.

How your text is handled
The selected text is passed to syntaxsnap.com in the part of the web address after the # sign. Browsers never send that part to a server, so the text goes straight into the tool in your browser. SyntaxSnap's tools process everything locally and do not upload what you paste.

Permissions
- Context menus: adds SyntaxSnap to the right-click menu when text is selected.
- Active tab and scripting: only after you click a SyntaxSnap menu item or the toolbar button, reads the selected text (keeping its line breaks) or the SVG icons on the current page.
The extension cannot see your other tabs or browsing history, and it contains no analytics.

What's new in 1.3.0
- New menu actions for formatting and viewing JSON, JSON to TypeScript, and decoding JWTs, Base64 and timestamps.
- Every menu action now opens the tool with your selection already filled in, line breaks included.
- Selected text travels in the address after the # sign, so it is never sent to a server.
- A redesigned toolbar popup with search.
```

## Single purpose (privacy tab)
Open text selected on a web page, or SVGs found on the page, in SyntaxSnap developer tools (formatters, converters and decoders) on syntaxsnap.com.

## Permission justifications
- contextMenus: shows the SyntaxSnap submenu when the user right-clicks selected text.
- activeTab: after the user clicks a SyntaxSnap menu item or the popup's SVG button, reads the selection or the SVG elements of the current tab only.
- scripting: runs the one-off function that reads the selection (with line breaks) or the page's SVGs in that tab.

## Remote code
No. All code is in the package.

## Data usage
The extension does not collect or transmit any user data. Tick no data types. Certify: data is not sold, not used for unrelated purposes, and not used for creditworthiness.

## Screenshots (1280×800, in store/)
1. 1-json-viewer.png: "Explore any JSON as a tree"
2. 2-right-click-menu.png: "Right-click selected text to open it in the right tool"
3. 3-jwt-debugger.png: "Decode JWTs without sending them anywhere"
4. 4-openapi-to-zod.png: "Turn OpenAPI specs into Zod schemas"
5. 5-popup.png: "48 developer tools, one click away"
