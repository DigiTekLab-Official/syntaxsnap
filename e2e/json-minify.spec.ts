// e2e/json-minify.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Minify', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-minify'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Minify Online – Free, Private, No Upload/, 'JSON Minifier');
  });

  test('minifies the sample and shows the bytes saved', async ({ page }) => {
    await expect(output(page)).toHaveText('{"flags":{"new_checkout":{"enabled":true,"rollout_percent":25,"segments":["beta-testers","internal"]},"dark_mode":{"enabled":true,"rollout_percent":100,"segments":[]},"ai_summaries":{"enabled":false,"rollout_percent":0,"segments":["enterprise"]}},"updated_at":"2026-10-20T08:15:00Z","version":42}');
    await expect(page.getByText('saved 284 B (49%)')).toBeVisible();
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.locator('#json-in').fill('{"enabled": True}');
    await expect(page.locator('[data-error]')).toContainText('True is not valid JSON. Use true.');
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('minified.json');
  });
});
