import { test, expect } from '@playwright/test';

test.describe('Meta Tag Previewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/meta-tag-generator');

    // Wait for React to hydrate — the "Meta Details" heading is rendered by the client component
    await expect(page.locator('text=Meta Details')).toBeVisible({ timeout: 15000 });

    // Ensure React has fully attached event handlers before interacting.
    // With client:load on SSR, the HTML is visible before hydration completes.
    // We verify hydration by confirming a controlled input has its React-managed value.
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toHaveValue(/SyntaxSnap/, { timeout: 10000 });
  });

  // Helpers — locate the two <pre> code output blocks
  const nextjsPre = (page: import('@playwright/test').Page) =>
    page.locator('pre').filter({ hasText: "import type { Metadata }" });
  const htmlPre = (page: import('@playwright/test').Page) =>
    page.locator('pre').filter({ hasText: '<meta property="og:' });

  /** Fill a React-controlled input reliably across browsers.
   *  Uses real keyboard events (select-all, delete, type) to guarantee
   *  React's synthetic onChange fires on every keystroke. */
  async function fillInput(
    locator: import('@playwright/test').Locator,
    value: string,
    page: import('@playwright/test').Page,
  ) {
    await locator.click();
    // Select all existing text and delete it
    const mod = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${mod}+a`);
    await page.keyboard.press('Backspace');
    // Type character-by-character (React handles each input event)
    await locator.pressSequentially(value, { delay: 0 });
  }

  test('renders default state with pre-filled inputs and outputs', async ({ page }) => {
    // 1. Page heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Meta Tag Previewer');

    // 2. Default input values
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toHaveValue('SyntaxSnap – Privacy-First Developer Tools');

    const urlInput = page.locator('input[type="url"]').first();
    await expect(urlInput).toHaveValue('https://syntaxsnap.com');

    // 3. Default outputs contain expected meta tags
    await expect(nextjsPre(page)).toContainText("import type { Metadata } from 'next'");
    await expect(nextjsPre(page)).toContainText('SyntaxSnap');

    await expect(htmlPre(page)).toContainText('<meta property="og:title"');
    await expect(htmlPre(page)).toContainText('SyntaxSnap');
  });

  test('social preview card renders with default values', async ({ page }) => {
    // Target the preview card by its unique max-w-130 wrapper (avoids RelatedTools .group cards)
    const previewCard = page.locator('.max-w-130');
    await expect(previewCard.locator('span', { hasText: 'syntaxsnap.com' })).toBeVisible();
    await expect(previewCard.locator('h3')).toContainText('SyntaxSnap');
  });

  test('updates all outputs when the title is changed', async ({ page }) => {
    const titleInput = page.locator('input[type="text"]').first();

    await fillInput(titleInput, 'My Custom Page Title', page);

    // Both output blocks should reflect the new title
    await expect(nextjsPre(page)).toContainText('My Custom Page Title', { timeout: 10000 });
    await expect(htmlPre(page)).toContainText('My Custom Page Title', { timeout: 10000 });

    // Social preview heading should also update
    const previewCard = page.locator('.max-w-130');
    await expect(previewCard.locator('h3')).toContainText('My Custom Page Title', { timeout: 10000 });
  });

  test('updates all outputs when the description is changed', async ({ page }) => {
    const descTextarea = page.locator('textarea');

    await fillInput(descTextarea, 'A brand new description for testing.', page);

    await expect(nextjsPre(page)).toContainText('A brand new description for testing.', { timeout: 10000 });
    await expect(htmlPre(page)).toContainText('A brand new description for testing.', { timeout: 10000 });
  });

  test('updates canonical URL in all outputs', async ({ page }) => {
    const urlInput = page.locator('input[type="url"]').first();

    await fillInput(urlInput, 'https://example.com/about', page);

    await expect(nextjsPre(page)).toContainText('https://example.com/about', { timeout: 10000 });
    await expect(htmlPre(page)).toContainText('https://example.com/about', { timeout: 10000 });

    // Social preview strips protocol
    const previewCard = page.locator('.max-w-130');
    await expect(previewCard.locator('span').first()).toContainText('example.com/about', { timeout: 10000 });
  });

  test('updates OG image URL in all outputs', async ({ page }) => {
    const imageInput = page.locator('input[type="url"]').nth(1);

    await fillInput(imageInput, 'https://example.com/og.png', page);

    await expect(nextjsPre(page)).toContainText('https://example.com/og.png', { timeout: 10000 });
    await expect(htmlPre(page)).toContainText('https://example.com/og.png', { timeout: 10000 });
  });

  test('shows character count warnings for title', async ({ page }) => {
    const titleInput = page.locator('input[type="text"]').first();

    // Default title is under 60 chars — counter should NOT be red
    await expect(page.locator('text=/\\d+ chars/').first()).toBeVisible();

    // Type a very long title (> 60 chars)
    await fillInput(titleInput, 'A'.repeat(65), page);

    // The character count span should have the red class
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 10000 });
  });

  test('Copy Next.js button works', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyNextBtn = page.locator('button:has-text("Copy Next.js")');
    await copyNextBtn.click();

    // Button text should change to "Copied!"
    await expect(page.locator('button:has-text("Copied!")')).toBeVisible({ timeout: 3000 });

    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain("import type { Metadata } from 'next'");
    }
  });

  test('Copy HTML button works', async ({ page, browserName }) => {
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyHtmlBtn = page.locator('button:has-text("Copy HTML")');
    await copyHtmlBtn.click();

    await expect(page.locator('button:has-text("Copied!")')).toBeVisible({ timeout: 3000 });

    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('<meta property="og:title"');
    }
  });
});
