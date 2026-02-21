// astro.config.mjs
import { defineConfig } from 'astro/config';
import react      from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap     from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  // ── Site URL ───────────────────────────────────────────────────────────────
  site: 'https://syntaxsnap.com',

  // ── Output mode ───────────────────────────────────────────────────────────
  output: 'static',

  // ── Build Format (CRITICAL FIX) ───────────────────────────────────────────
  // This MUST be at the root level, not inside vite.
  // 'file' = dist/tools/json-to-zod.html (Cloudflare serves without slash)
  // 'directory' = dist/tools/json-to-zod/index.html (Cloudflare forces slash)
  build: {
    format: 'file',
  },

  // ── Trailing slash ────────────────────────────────────────────────────────
  // Works together with build.format: 'file' to ensure no slashes ever appear.
  trailingSlash: 'never',

  // ── Integrations ──────────────────────────────────────────────────────────
  integrations: [
    react({
      // Scope React transforms to component files only.
      include: ['**/components/**', '**/src/components/**'],
    }),

    sitemap({
      // Exclude non-content pages
      filter: (page) =>
        !page.includes('/404')    &&
        !page.includes('/api/')   &&
        !page.includes('/draft/'),

      // CORRECTED: Use 'serialize' to customize priorities.
      // Claude was right: 'chunks' is not the standard way to do this logic.
      serialize(item) {
        // High priority for tools
        if (item.url.includes('/tools/')) {
          item.changefreq = 'daily';
          item.priority   = 0.9;
          return item;
        }
        // Standard priority for everything else
        item.changefreq = 'weekly';
        item.priority   = 0.7;
        return item;
      },

      lastmod: new Date(),
    }),
  ],

  // ── Vite ──────────────────────────────────────────────────────────────────
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Target Cloudflare Workers' V8 engine directly.
      target: 'es2022',
    },
  },

  adapter: cloudflare(),
});