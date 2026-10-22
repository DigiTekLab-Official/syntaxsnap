// src/utils/incomingInput.ts
// Text handed to a tool when it opens, from three places, in this order:
//   1. Another SyntaxSnap tool (sessionStorage, see sendTo() in components/ui/ws.tsx)
//   2. The Chrome extension, in the URL fragment: /tools/x#input=<encoded>
//      Fragments are never sent to the server, so the text stays in the browser.
//   3. The legacy query string ?input=<encoded> (extension 1.2.x and older)
// The fragment or query string is removed from the address bar after reading.

export const HANDOFF_KEY = 'syntaxsnap:handoff';

export function readIncomingInput(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) {
      sessionStorage.removeItem(HANDOFF_KEY);
      const h = JSON.parse(raw) as { to?: string; text?: string };
      if (h.to === window.location.pathname && h.text) return h.text;
    }
  } catch {
    /* storage blocked or malformed: fall through */
  }

  const clean = () => window.history.replaceState(window.history.state, '', window.location.pathname);

  const hash = window.location.hash;
  if (hash.startsWith('#input=')) {
    let text: string | null;
    try {
      text = decodeURIComponent(hash.slice('#input='.length));
    } catch {
      text = null; // malformed percent-encoding
    }
    clean();
    if (text) return text;
  }

  const q = new URLSearchParams(window.location.search).get('input');
  if (q) {
    clean();
    return q;
  }
  return null;
}
