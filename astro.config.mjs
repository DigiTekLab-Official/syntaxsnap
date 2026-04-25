// astro.config.mjs
import { defineConfig } from 'astro/config';
import react       from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap     from '@astrojs/sitemap';
import cloudflare  from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://syntaxsnap.com',
  output: 'static',
  trailingSlash: 'never',

  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },

  integrations: [
    react({
      include: ['**/components/**', '**/src/components/**'],
    }),

    sitemap({
      filter: (page) =>
        !page.includes('/404')   &&
        !page.includes('/api/')  &&
        !page.includes('/draft/'),

      serialize(item) {
        if (item.url.includes('/tools/')) {
          item.changefreq = 'daily';
          item.priority   = 0.9;
          return item;
        }
        item.changefreq = 'weekly';
        item.priority   = 0.7;
        return item;
      },

      lastmod: new Date(),
    }),
  ],

  // FIX 1: Tell the Cloudflare adapter to run sharp at BUILD TIME only
  // (for prerendered/static pages). This stops sharp and its Node.js
  // built-ins (child_process, fs) from being bundled into _worker.js.
  adapter: cloudflare({
    imageService: 'compile',
  }),

  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // FIX 2: Explicitly exclude sharp from the SSR/worker bundle.
      // This is the safety net — even if imageService:'compile' doesn't
      // fully tree-shake every sharp import path, Rollup won't bundle it.
      // @resvg/resvg-js, node:fs, node:path are build-time only (OG images).
      external: ['sharp', '@resvg/resvg-js', 'node:fs', 'node:path'],
    },
    build: {
      target: 'es2022',
    },
  },
});