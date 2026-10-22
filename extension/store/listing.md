# Chrome Web Store listing: SyntaxSnap 1.3.0

## Name (45 characters max)
SyntaxSnap: JSON Formatter, Zod & Dev Tools

## Summary (132 characters max)
Format and view JSON, decode JWTs, and convert JSON, TypeScript and OpenAPI to Zod. Runs on syntaxsnap.com; nothing is uploaded.

## Category
Developer Tools

## Detailed description

Select text on any page, right-click, and open it in the right developer tool, already pasted in.

SyntaxSnap puts 48 free developer tools one click away:

- Format JSON: beautify, validate and fix broken JSON, including the almost-JSON that ChatGPT and Claude return (comments, trailing commas, single quotes).
- View JSON as a tree: collapse and expand, search keys and values, and copy any node's path.
- Turn JSON into TypeScript interfaces or Zod schemas.
- Convert TypeScript and OpenAPI specs (JSON or YAML) to Zod.
- Decode a JWT, decode Base64, or convert a Unix timestamp to a readable date.
- Test a regex against the selected text, or compare two pieces of text.

From the toolbar button you can search every tool, open the most popular ones (JSON Formatter, JSON Viewer, OpenAPI to Zod, SQL to Prisma, SQL to Drizzle, Aurora Gradient), and extract any SVG on the page and turn it into a React JSX component.

How your text is handled:
The selected text is passed to syntaxsnap.com in the part of the address after the # sign (the URL fragment). Browsers never send that part to a server, so the text goes straight into the tool in your browser. SyntaxSnap's tools process everything locally and do not upload what you paste. The one exception, the AI Mock Generator, is not in the right-click menu and is clearly labelled on the site.

Permissions:
- Context menus: adds "SyntaxSnap" to the right-click menu on selected text.
- Active tab and scripting: only after you click a SyntaxSnap menu item or the popup, reads the selected text (keeping its line breaks) or the SVGs on the current page.
No access to your other tabs, history or browsing data. No analytics in the extension.

What's new in 1.3.0:
- New right-click actions: Format JSON, View JSON as a tree, JSON to TypeScript, Decode JWT, Decode Base64, Convert Unix timestamp.
- Every menu item now opens the tool with your selection already pasted in, keeping line breaks.
- Selected text is passed in the URL fragment, so it is never sent to a server.
- Redesigned popup with search.

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
