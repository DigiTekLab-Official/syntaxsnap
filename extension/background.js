// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const MAX_SELECTION_CHARS = 10_000;

const TOOLS = [
  { id: 'tool-ts-zod',      title: 'Convert TS to Zod',      path: '/tools/ts-to-zod' },
  { id: 'tool-openapi-zod', title: 'Convert OpenAPI to Zod', path: '/tools/openapi-to-zod' },
  { id: 'tool-json',        title: 'Convert JSON to Zod',    path: '/tools/json-to-zod' },
  { id: 'tool-graphql-zod', title: 'Convert GraphQL to Zod', path: '/tools/graphql-to-zod' },
  { id: 'tool-regex',       title: 'Test Regex Pattern',     path: '/tools/regex-tester' },
  { id: 'tool-diff',        title: 'Compare Text (Diff)',    path: '/tools/diff-viewer' },
];

// ─── SERVICE WORKER LIFECYCLE ───────────────────────────────────────────────
// Both listeners are registered synchronously at the top level to guarantee
// the service worker wakes reliably after being spun down (MV3 requirement).

chrome.runtime.onInstalled.addListener(() => {
  // removeAll prevents duplicate-ID errors when the extension updates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'syntaxsnap-root',
      title: 'SyntaxSnap Tools',
      contexts: ['selection'],
    });

    for (const tool of TOOLS) {
      chrome.contextMenus.create({
        id: tool.id,
        parentId: 'syntaxsnap-root',
        title: tool.title,
        contexts: ['selection'],
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  const raw = info.selectionText;
  if (!raw) return;

  const tool = TOOLS.find(t => t.id === info.menuItemId);
  if (!tool) return;

  // Truncate to prevent URL-length overflow (browsers cap at ~2 MB but
  // servers and Cloudflare Workers may reject much earlier).
  const text = encodeURIComponent(raw.slice(0, MAX_SELECTION_CHARS));
  chrome.tabs.create({ url: `https://syntaxsnap.com${tool.path}?input=${text}` });
});