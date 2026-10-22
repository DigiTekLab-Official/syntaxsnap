// extension/background.js — right-click menu on selected text.
/* global importScripts, SYNTAXSNAP, chrome */
importScripts('tools.js');

// Fragments are not limited by server URL caps; this only guards against
// accidentally sending a whole page.
const MAX_SELECTION_CHARS = 200_000;
const MENU_PREFIX = 'syntaxsnap:';

// Listeners are registered synchronously at the top level (MV3 requirement).
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'syntaxsnap-root', title: 'SyntaxSnap', contexts: ['selection'] });
    for (const item of SYNTAXSNAP.MENU) {
      chrome.contextMenus.create({
        id: MENU_PREFIX + item.id,
        parentId: 'syntaxsnap-root',
        title: item.title,
        contexts: ['selection'],
      });
    }
  });
});

// info.selectionText collapses line breaks, which breaks SQL, YAML and regex
// input. activeTab (granted by the menu click) lets us read the real selection.
async function readSelection(tabId, frameId, fallback) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId ?? 0] },
      func: () => String(window.getSelection?.() ?? ''),
    });
    const text = res?.result;
    return text && text.trim() ? text : fallback;
  } catch {
    return fallback; // pages scripts can't run on (chrome://, the Web Store, PDFs)
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const id = String(info.menuItemId);
  if (!id.startsWith(MENU_PREFIX) || !info.selectionText) return;
  const toolId = id.slice(MENU_PREFIX.length);
  if (!SYNTAXSNAP.MENU.some((m) => m.id === toolId)) return;
  const raw = tab?.id != null ? await readSelection(tab.id, info.frameId, info.selectionText) : info.selectionText;
  const text = raw.slice(0, MAX_SELECTION_CHARS);
  chrome.tabs.create({ url: SYNTAXSNAP.toolUrl(toolId, text, 'context_menu') });
});
