import { test, expect } from '@playwright/test';

test.describe('Dockerfile Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/dockerfile-generator');
    
    // Wait for React to hydrate (client:idle defers hydration until browser is idle)
    await page.waitForSelector('[data-hydrated]', { timeout: 15000 });
    await expect(page.locator('textarea').first()).toContainText('FROM node:22-alpine AS base', { timeout: 5000 });
  });

  test('renders default state correctly with security fixes (Next.js, pnpm, Node 22)', async ({ page }) => {
    const outputArea = page.locator('textarea').first();
    
    // Check Next.js specific standalone code
    await expect(outputArea).toContainText('Next.js (Standalone)');
    await expect(outputArea).toContainText('pnpm install --frozen-lockfile');
    await expect(outputArea).toContainText('COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./');
    
    // Check for Opus Audit fixes (Security & Healthcheck)
    await expect(outputArea).toContainText('USER nextjs');
    await expect(outputArea).toContainText('HEALTHCHECK --interval=30s');
  });

  test('updates Dockerfile when framework changes to Node.js', async ({ page }) => {
    await page.click('button:has-text("Node.js (Express/API)")');
    
    const outputArea = page.locator('textarea').first();
    await expect(outputArea).toContainText('Optimized Dockerfile for Node.js App');
    await expect(outputArea).toContainText('CMD ["node", "dist/index.js"]');
    
    // Check for Opus Audit fixes
    await expect(outputArea).toContainText('USER node');
    await expect(outputArea).toContainText('HEALTHCHECK');
  });

  test('updates install commands when package manager changes to yarn', async ({ page }) => {
    // Note: using exact text match to avoid matching the SEO section text
    await page.locator('button', { hasText: /^yarn$/ }).click();
    
    const outputArea = page.locator('textarea').first();
    await expect(outputArea).toContainText('RUN npm install -g yarn');
    await expect(outputArea).toContainText('yarn install --frozen-lockfile');
    await expect(outputArea).toContainText('COPY package.json yarn.lock ./');
  });

  test('switches to .dockerignore tab and displays correct content', async ({ page }) => {
    await page.click('button:has-text(".dockerignore")');
    
    const outputArea = page.locator('textarea').first();
    await expect(outputArea).toContainText('node_modules');
    await expect(outputArea).toContainText('.env.local');
    // Default is Next.js, so it should have .next
    await expect(outputArea).toContainText('.next');
  });

  test('copy button works via shared component', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    // Opus audit replaced the custom button with your shared CopyButton component.
    // We target it by looking for the "Copy" text.
    const copyButton = page.locator('button:has-text("Copy")').first();
    await copyButton.click();
    
    await expect(page.locator('button:has-text("Copied")')).toBeVisible({ timeout: 5000 });

    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('FROM node:22-alpine');
    }
  });
});