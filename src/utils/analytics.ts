// src/utils/analytics.ts — privacy-safe usage events.
//
// Sends only which tool and which action, plus an optional coarse size bucket.
// Never pass input text, file names, URLs, keys or exact sizes here.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export type ToolAction =
  | 'format' | 'minify' | 'validate' | 'convert' | 'copy' | 'download'
  | 'file_open' | 'url_load' | 'repair' | 'send_to' | 'compare' | 'tree';

export type SizeBucket = '<10KB' | '<1MB' | '>1MB';

/** Coarse size bucket for a character or byte count. */
export function sizeBucket(n: number): SizeBucket {
  return n < 10 * 1024 ? '<10KB' : n < 1024 * 1024 ? '<1MB' : '>1MB';
}

export function trackToolEvent(tool: string, action: ToolAction, size?: number) {
  if (typeof window === 'undefined') return;
  try {
    const params: Record<string, string> = { tool, action };
    if (typeof size === 'number') params.size = sizeBucket(size);
    window.gtag?.('event', 'tool_action', params);
    window.clarity?.('event', `${tool}:${action}`);
  } catch {
    /* analytics must never break a tool */
  }
}
