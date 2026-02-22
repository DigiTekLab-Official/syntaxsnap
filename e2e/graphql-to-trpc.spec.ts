import { test, expect } from '@playwright/test';

test.describe('GraphQL to tRPC Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/graphql-to-trpc');
    // Wait for hydration by checking if the default tRPC output is rendered
    await expect(page.locator('textarea').nth(1)).toContainText('export const appRouter = router', { timeout: 15000 });
  });

  test('renders default schema and validates output', async ({ page }) => {
    const inputArea = page.locator('textarea').first();
    const outputArea = page.locator('textarea').nth(1);

    await expect(inputArea).toBeVisible();
    await expect(outputArea).toContainText('getUser: publicProcedure');
    await expect(outputArea).toContainText('z.object({ id: z.string() })');
  });

  test('shows empty state UX when cleared', async ({ page }) => {
    const inputArea = page.locator('textarea').first();
    const outputArea = page.locator('textarea').nth(1);

    await inputArea.clear();
    
    // Wait for 300ms debounce to finish
    await expect(outputArea).toContainText('// Paste a GraphQL schema to get started.', { timeout: 5000 });
  });

  test('updates tRPC router when GraphQL schema changes', async ({ page }) => {
    const inputArea = page.locator('textarea').first();
    const outputArea = page.locator('textarea').nth(1);

    await inputArea.clear();
    await inputArea.fill(`type Query { getPost(slug: String!): Post }`);

    // Verify the output reacts (with timeout for the 300ms debounce)
    await expect(outputArea).toContainText('getPost: publicProcedure', { timeout: 5000 });
    await expect(outputArea).toContainText('slug: z.string()');
  });

  test('copy button works', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyButton = page.locator('button:has-text("Copy")');
    await copyButton.click();
    
    await expect(page.locator('button:has-text("Copied")')).toBeVisible({ timeout: 2000 });

    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('export const appRouter = router');
    }
  });
});