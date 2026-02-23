// e2e/json-schema-to-zod.spec.ts
import { test, expect } from '@playwright/test';

test.describe('JSON Schema to Zod E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/json-schema-to-zod');
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should convert default schema on load after debounce', async ({ page }) => {
    const zodOutput = page.locator('pre code');
    // The component now uses a 300ms debounce
    await expect(zodOutput).toContainText('z.object({', { timeout: 1000 });
    await expect(zodOutput).toContainText('"name": z.string()');
  });

  test('should reject non-schema JSON with helpful message', async ({ page }) => {
    const inputArea = page.getByLabel('JSON Schema input');
    const zodOutput = page.locator('pre code');

    // Paste something that isn't a schema (e.g., a simple array)
    await inputArea.fill('[1, 2, 3]');
    await expect(zodOutput).toContainText('This doesn\u2019t appear to be a JSON Schema');
  });

  test('should handle invalid syntax with error message', async ({ page }) => {
    const inputArea = page.getByLabel('JSON Schema input');
    const zodOutput = page.locator('pre code');

    await inputArea.fill('{ "broken": ');
    await expect(zodOutput).toContainText('Invalid JSON');
  });
});