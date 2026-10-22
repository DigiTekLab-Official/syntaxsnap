// e2e/json-escape.spec.ts
import { test } from '@playwright/test';
import { expect, openTool, expectHeading, output, expectCopyAndDownload } from './helpers/json-hub';

test.describe('JSON Escape', () => {
  test.beforeEach(async ({ page }) => { await openTool(page, 'json-escape'); });

  test('loads with the expected title and H1', async ({ page }) => {
    await expectHeading(page, /JSON Escape Online – Free, Private, No Upload/, 'JSON Escape and Unescape');
  });

  test('escapes the sample and unescapes it back', async ({ page }) => {
    await expect(output(page)).toHaveText(String.raw`"{\"event\":\"signup\",\"message\":\"Welcome, \\\"Sam\\\"!\\nYour code is ready.\"}"`);
    await page.getByRole('radio', { name: 'Unescape' }).click();
    await expect(output(page)).toContainText('"event": "signup"');
    await expect(output(page)).toContainText(String.raw`"message": "Welcome, \"Sam\"!\nYour code is ready."`);
  });

  test('invalid input shows a specific error', async ({ page }) => {
    await page.getByRole('radio', { name: 'Unescape' }).click();
    await page.locator('#conv-in').fill(String.raw`C:\data\file`);
    await expect(page.locator('[data-error]')).toContainText(String.raw`"\d" is not a valid escape sequence in JSON.`);
  });

  test('copy and download buttons are present', async ({ page }) => {
    await expectCopyAndDownload(page);
  });
});
