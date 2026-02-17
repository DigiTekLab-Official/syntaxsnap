// astro.config.mjs
import { defineConfig } from 'astro/config';
import react     from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sitemap   from '@astrojs/sitemap';

export default defineConfig({
  // ── Site URL ───────────────────────────────────────────────────────────────
  site: 'https://syntaxsnap.com',

  // ── Output mode ────────────────────────────────────────────────────────────
  // REMOVED: output: 'hybrid' is no longer needed in Astro 5.0+
  // Use 'static' (default) or 'server' (if everything is dynamic).
  output: 'static', 

  // ── Integrations ───────────────────────────────────────────────────────────
  integrations: [
    react({
      include: ['**/components/**', '**/src/components/**'],
    }),
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/api/') &&
        !page.includes('/draft/'),
      chunks: {
        'tools': (item) => {
          if (item.url.includes('/tools/')) {
            item.changefreq = 'daily';
            item.priority = 0.9;
            return item;
          }
        },
      },
      namespaces: {
        news: false,
        video: false,
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],

  // ── Cloudflare adapter ─────────────────────────────────────────────────────
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),

  trailingSlash: 'never',

  vite: {
    plugins: [tailwindcss()],
    build: { target: 'es2022' },
  },
});