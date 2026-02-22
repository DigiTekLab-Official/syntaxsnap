import { test, expect } from '@playwright/test';

test.describe('Cron Descriptor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/cron-descriptor');
    
    // THE FIX: Added .first() to avoid clashing with the SEO text at the bottom of the page
    await expect(page.locator('text=/Monday through Friday/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('renders with default cron expression', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('0 12 * * 1-5');
  });

  test('clears input and shows empty state', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await page.click('button:has-text("Clear")');
    await expect(input).toHaveValue('');
    
    await expect(page.locator('text=Enter a valid cron expression')).toBeVisible();
  });

  test('translates custom cron expression', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await input.clear();
    await input.fill('*/5 * * * *');
    
    // Added .first() to avoid the "Common Patterns" SEO list
    await expect(page.locator('text=/Every 5 minutes/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows error for invalid cron expression', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await input.clear();
    await input.fill('invalid cron');
    
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    await expect(errorAlert).toContainText(/must have at least 5 fields/i);
  });

  test('quick presets work correctly', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await page.click('button:has-text("Every 15 minutes")');
    await expect(input).toHaveValue('*/15 * * * *');
    await expect(page.locator('text=/Every 15 minutes/i').first()).toBeVisible({ timeout: 5000 });
    
    await page.click('button:has-text("Every day at midnight")');
    await expect(input).toHaveValue('0 0 * * *');
    await expect(page.locator('text=/12:00 AM|midnight/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('displays next run times', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('0 9 * * 1-5');
    
    const nextRunsList = page.locator('.bg-slate-950\\/50.px-3.py-2');
    await expect(nextRunsList).toHaveCount(5, { timeout: 5000 });
    await expect(nextRunsList.first()).toContainText('#1');
  });

  test('adjusts number of next runs displayed', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('0 12 * * *');
    
    const runCountInput = page.locator('input[type="number"]');
    await expect(runCountInput).toBeVisible();
    
    // Triple-click to select all, then type — reliably triggers React onChange
    await runCountInput.click({ clickCount: 3 });
    await runCountInput.pressSequentially('10');
    
    const nextRunsList = page.locator('.bg-slate-950\\/50.px-3.py-2');
    await expect(nextRunsList).toHaveCount(10, { timeout: 5000 });
  });

  test('displays timezone information', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('0 0 * * *');
    
    await expect(page.locator('text=/Timezone:/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('shows field breakdown for valid expression', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('30 14 * * 1-5');
    
    await expect(page.locator('text=Field Breakdown')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Minute').first()).toBeVisible();
    await expect(page.locator('text=Hour').first()).toBeVisible();
  });

  test('copy button works', async ({ page, browserName }) => {
    // Firefox does not support clipboard-read permission via grantPermissions
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    }
    
    const input = page.locator('input[type="text"]');
    await input.clear();
    await input.fill('0 9 * * 1-5');
    
    await expect(page.locator('text=/Monday through Friday/i').first()).toBeVisible({ timeout: 5000 });
    
    const copyButton = page.locator('button:has-text("Copy")').first();
    await copyButton.click();
    
    await expect(page.locator('button:has-text("Copied")')).toBeVisible({ timeout: 2000 });
    
    // Clipboard content can only be verified on browsers that support clipboard-read
    if (browserName !== 'firefox') {
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.toLowerCase()).toContain('monday');
    }
  });

  test('handles edge cases correctly', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await input.clear();
    await input.fill('0 12');
    
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toContainText(/must have at least 5 fields/i, { timeout: 5000 });
    
    await input.clear();
    await input.fill('0 0 1 * *');
    await expect(page.locator('text=/day 1|1st/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('preserves state during interaction', async ({ page }) => {
    const input = page.locator('input[type="text"]');
    
    await input.clear();
    await input.fill('0 0 * * 0'); 
    
    await expect(page.locator('text=/Sunday/i').first()).toBeVisible({ timeout: 5000 });
    
    const runCountInput = page.locator('input[type="number"]');
    await runCountInput.fill('7');
    
    await expect(input).toHaveValue('0 0 * * 0');
    await expect(runCountInput).toHaveValue('7');
    await expect(page.locator('text=/Sunday/i').first()).toBeVisible();
  });
});