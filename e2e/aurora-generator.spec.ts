// e2e/aurora-generator.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Aurora Gradient Generator E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the tool page
    await page.goto('/tools/aurora-gradient');
    
    // Crucial: Wait for React to finish hydrating the component before testing interactions
    await page.waitForSelector('[data-hydrated="true"]');
  });

  test('should render all critical UI elements', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Aurora Gradient Generator' })).toBeVisible();
    await expect(page.getByText('Color Palette')).toBeVisible();
    await expect(page.getByLabel('Blur Intensity')).toBeVisible();
    await expect(page.getByLabel('Opacity')).toBeVisible();
    await expect(page.getByText('Live Preview')).toBeVisible();
    await expect(page.getByText('CSS Output')).toBeVisible();
    
    // Fix: Use { exact: true } to prevent matching the FAQ text lower on the page
    await expect(page.getByText('Tailwind HTML', { exact: true })).toBeVisible();
  });

  test('should update output code when blur slider is adjusted', async ({ page }) => {
    const blurSlider = page.getByLabel('Blur Intensity');
    const cssOutput = page.locator('pre code').first();

    await expect(cssOutput).toContainText('filter: blur(120px)');
    await blurSlider.fill('150');
    await expect(cssOutput).toContainText('filter: blur(150px)');
  });

  test('should update output code when opacity slider is adjusted', async ({ page }) => {
    const opacitySlider = page.getByLabel('Opacity');
    const tailwindOutput = page.locator('pre code').nth(1);

    await expect(tailwindOutput).toContainText('opacity-50');
    await opacitySlider.fill('80');
    await expect(tailwindOutput).toContainText('opacity-80');
  });

  // Skip the clipboard test on Firefox as it doesn't support the 'clipboard-read' permission
  test('clipboard buttons should copy text and show temporary success state', async ({ page, context, browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox does not support clipboard permissions in this context');

    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const copyCssBtn = page.getByRole('button', { name: 'Copy CSS' });
    const cssCodeBlock = page.locator('pre code').first();

    await copyCssBtn.click();
    await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible();

    const clipboardText = await page.evaluate('navigator.clipboard.readText()');
    const expectedCode = await cssCodeBlock.textContent();
    expect(clipboardText).toEqual(expectedCode);

    await page.waitForTimeout(2100);
    await expect(copyCssBtn).toHaveText('Copy CSS');
  });

  test('color hex inputs should validate and update background values', async ({ page }) => {
    const firstHexInput = page.getByLabel('Top Left blob hex value');
    const tailwindOutput = page.locator('pre code').nth(1);

    // Fix: Assert against lowercase hex to match component state
    await expect(tailwindOutput).toContainText('bg-[#8b5cf6]');

    await firstHexInput.fill('');
    await firstHexInput.type('#FF0000');
    // The component preserves the casing as typed by the user
    await expect(tailwindOutput).toContainText('bg-[#FF0000]');
  });
});