import { test, expect } from '@playwright/test';

test.describe('Tool #25: Tailwind to Vanilla CSS Converter', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the tool before each test
    // Note: Ensure your local dev server port matches (usually 4321 for Astro or 3000 for Next)
    await page.goto('http://localhost:4321/tools/tailwind-to-css');
  });

  test('should render default state and initial parsing correctly', async ({ page }) => {
    // 1. Verify default selector
    const selectorInput = page.locator('#selector');
    await expect(selectorInput).toHaveValue('custom-card');

    // 2. Verify default output contains the generated CSS
    const preOutput = page.locator('pre');
    await expect(preOutput).toContainText('.custom-card {');
    await expect(preOutput).toContainText('display: flex;');
    
    // Verify the default hover state was parsed
    await expect(preOutput).toContainText('.custom-card:hover {');
  });

  test('should dynamically update output when the CSS selector is changed', async ({ page }) => {
    const selectorInput = page.locator('#selector');
    const preOutput = page.locator('pre');

    // Change the selector name
    await selectorInput.fill('hero-button');

    // Playwright automatically waits/polls until the debounce finishes and the text updates
    await expect(preOutput).toContainText('.hero-button {');
    await expect(preOutput).not.toContainText('.custom-card {');
  });

  test('should correctly parse complex modifiers, arbitrary values, and negative numbers', async ({ page }) => {
    const twInput = page.locator('#tw-input');
    const preOutput = page.locator('pre');

    // Clear default input and type a complex edge-case string
    await twInput.fill('flex hover:bg-blue-500 md:p-4 w-[calc(100%_-_10px)] -m-2');

    // 1. Check base utility
    await expect(preOutput).toContainText('display: flex;');
    
    // 2. Check arbitrary value (ensuring underscores convert to spaces)
    await expect(preOutput).toContainText('width: calc(100% - 10px);');
    
    // 3. Check negative margin (-m-2 = -0.5rem)
    await expect(preOutput).toContainText('margin: -0.5rem;');

    // 4. Check hover pseudo-class map
    await expect(preOutput).toContainText('.custom-card:hover {');
    await expect(preOutput).toContainText('var(--color-blue-500)');

    // 5. Check breakpoint media query mapping
    await expect(preOutput).toContainText('@media (min-width: 768px) {');
    await expect(preOutput).toContainText('padding: 1rem;');
  });

  test('should handle copy button UI state transition', async ({ page, browserName }) => {
    // Firefox does not support clipboard-read permission via grantPermissions
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }

    const copyBtn = page.getByRole('button', { name: 'Copy CSS to clipboard' });
    
    // Verify initial state
    await expect(copyBtn).toHaveText('Copy CSS');
    
    // Click and verify success state
    await copyBtn.click();
    await expect(copyBtn).toHaveText('✓ Copied!');

    // Clipboard content can only be verified on browsers that support clipboard-read
    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText).toContain('.custom-card');
      expect(clipboardText).toContain('display: flex;');
    }
  });
});