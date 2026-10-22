// extension/tools.js — tool list shared by the popup and the context menu.
// Loaded with importScripts() in the service worker and a <script> tag in the popup.
/* global self */
self.SYNTAXSNAP = {
  SITE: 'https://syntaxsnap.com',

  // Right-click menu on selected text, in this order.
  MENU: [
    { id: 'json-formatter', title: 'Format JSON' },
    { id: 'json-viewer', title: 'View JSON as a tree' },
    { id: 'json-to-typescript', title: 'JSON to TypeScript' },
    { id: 'json-to-zod', title: 'JSON to Zod' },
    { id: 'ts-to-zod', title: 'TypeScript to Zod' },
    { id: 'openapi-to-zod', title: 'OpenAPI to Zod' },
    { id: 'jwt-debugger', title: 'Decode JWT' },
    { id: 'base64', title: 'Decode Base64' },
    { id: 'timestamp-converter', title: 'Convert Unix timestamp' },
    { id: 'regex-tester', title: 'Test regex on this text' },
    { id: 'diff-viewer', title: 'Compare text' },
  ],

  // Popup list. `popular` items show before the user types.
  TOOLS: [
    { id: 'json-formatter', name: 'JSON Formatter', desc: 'Beautify, validate and fix JSON', popular: true },
    { id: 'json-viewer', name: 'JSON Viewer', desc: 'Explore JSON as a tree', popular: true },
    { id: 'openapi-to-zod', name: 'OpenAPI to Zod', desc: 'Zod schemas from an OpenAPI spec', popular: true },
    { id: 'sql-to-prisma', name: 'SQL to Prisma', desc: 'Prisma models from CREATE TABLE', popular: true },
    { id: 'sql-to-drizzle', name: 'SQL to Drizzle', desc: 'Drizzle schema from CREATE TABLE', popular: true },
    { id: 'aurora-gradient', name: 'Aurora Gradient', desc: 'Animated CSS and Tailwind backgrounds', popular: true },
    { id: 'json-validator', name: 'JSON Validator', desc: 'Find every error in JSON' },
    { id: 'json-to-typescript', name: 'JSON to TypeScript', desc: 'Interfaces from a JSON sample' },
    { id: 'json-to-zod', name: 'JSON to Zod', desc: 'Zod schema from a JSON sample' },
    { id: 'json-to-csv', name: 'JSON to CSV', desc: 'Flatten JSON into a CSV table' },
    { id: 'csv-to-json', name: 'CSV to JSON', desc: 'Turn CSV rows into JSON' },
    { id: 'json-to-yaml', name: 'JSON to YAML', desc: 'Convert JSON to YAML' },
    { id: 'json-compare', name: 'JSON Compare', desc: 'Diff two JSON documents' },
    { id: 'ts-to-zod', name: 'TypeScript to Zod', desc: 'Zod schemas from interfaces' },
    { id: 'graphql-to-zod', name: 'GraphQL to Zod', desc: 'Zod schemas from GraphQL types' },
    { id: 'prisma-to-zod', name: 'Prisma to Zod', desc: 'Zod schemas from Prisma models' },
    { id: 'jwt-debugger', name: 'JWT Debugger', desc: 'Decode tokens locally' },
    { id: 'base64', name: 'Base64', desc: 'Encode and decode, UTF-8 safe' },
    { id: 'url-encoder', name: 'URL Encoder', desc: 'Percent-encode and decode' },
    { id: 'uuid-generator', name: 'UUID Generator', desc: 'v4 and v7 in bulk' },
    { id: 'timestamp-converter', name: 'Timestamp Converter', desc: 'Unix time to dates and back' },
    { id: 'regex-tester', name: 'Regex Tester', desc: 'Live matches and groups' },
    { id: 'diff-viewer', name: 'Diff Viewer', desc: 'Compare text side by side' },
    { id: 'cron-descriptor', name: 'Cron Translator', desc: 'Cron to plain English' },
    { id: 'svg-to-jsx', name: 'SVG to JSX', desc: 'React components from SVG' },
    { id: 'tailwind-shadow-generator', name: 'Tailwind Shadow & Glow', desc: 'Layered shadows and glows' },
    { id: 'mesh-gradient', name: 'Mesh Gradient', desc: 'Multi-point CSS gradients' },
  ],

  /**
   * Builds a tool URL. Selected text goes in the URL fragment (#input=), which
   * browsers never send to the server. The UTM tags carry no user data.
   */
  toolUrl(id, text, medium) {
    const base = `${this.SITE}/tools/${id}?utm_source=extension&utm_medium=${medium}`;
    return text ? `${base}#input=${encodeURIComponent(text)}` : base;
  },
};
